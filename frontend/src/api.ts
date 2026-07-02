// 預設:dev(vite dev server)打 localhost:8000;production build 走「同源相對路徑」——
// 因為後端同時供 SPA 與 API(同一 origin),相對路徑經 tunnel 直達後端,
// 不會撞 https→http mixed-content,也不依賴未進版控的 .env。VITE_API_BASE 可顯式覆寫。
const API_BASE = import.meta.env.VITE_API_BASE ?? (import.meta.env.DEV ? 'http://localhost:8000' : '')

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** 把錯誤回應轉成「給人看」的訊息——絕不把整頁 HTML(如 frp 的 404 頁)丟給使用者。 */
export function friendlyError(status: number, body: string): string {
  try {
    const j = JSON.parse(body)
    if (j && j.detail) return typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail)
  } catch { /* 非 JSON,往下判斷 */ }
  if (/<\s*html|powered by|fatedier\/frp/i.test(body)) {
    // 反代(frp/Caddy)回的頁面 = 後端當下沒接上(多半正在重啟)
    return '後端暫時無法連線（可能正在重啟），請稍候再試'
  }
  return `${status} ${body.slice(0, 160)}`.trim()
}

/** 後端「確定沒收到請求」——frp 反代在後端未接上時回的 404 HTML 頁。
 *  這是唯一能保證「請求未被處理」的訊號 → 連 POST 重試都安全(不會重複副作用)。 */
export function isBackendUnreached(status: number, body: string): boolean {
  return status === 404 && /<\s*html|powered by|frp/i.test(body)
}
/** 暫時性失敗(可重試)——但 502/503/逾時是「曖昧」的:後端可能已處理只是回應遺失。
 *  因此這類只給「冪等請求(GET)」重試;非冪等(POST)只認 isBackendUnreached。 */
export function isTransientDown(status: number, body: string): boolean {
  return status === 502 || status === 503 || isBackendUnreached(status, body)
}
function isNetworkError(e: unknown): boolean {
  if (e instanceof DOMException) return e.name === 'TimeoutError' || e.name === 'AbortError'
  return e instanceof TypeError // fetch 連線失敗
}

/** 帶 timeout + 自動重試的 fetch(回 Response;錯誤已轉人話)。
 *  idempotent=true(GET):暫時性失敗(frp404/502/503/連線中斷)都可重試。
 *  idempotent=false(POST):**只在「後端確定沒收到」(frp 未接上的 404)時重試** ——
 *    502/503/逾時/連線中斷都「曖昧」(後端可能已處理),重試恐造成重複建 job,故不重試。 */
async function req(path: string, init: RequestInit,
                   { timeoutMs = 20_000, retries = 0, idempotent = false } = {}): Promise<Response> {
  let lastMsg = '請求失敗'
  for (let i = 0; i <= retries; i++) {
    try {
      const r = await fetch(`${API_BASE}${path}`, { ...init, signal: AbortSignal.timeout(timeoutMs) })
      if (r.ok) return r
      const body = await r.text()
      const canRetry = idempotent ? isTransientDown(r.status, body) : isBackendUnreached(r.status, body)
      if (canRetry && i < retries) { lastMsg = friendlyError(r.status, body); await sleep(700 * (i + 1)); continue }
      throw new Error(friendlyError(r.status, body))
    } catch (e) {
      // 連線中斷/逾時只給冪等請求重試;POST 曖昧 → 不重試(可能已處理)
      if (idempotent && isNetworkError(e) && i < retries) { lastMsg = '連線逾時或中斷,重試中…'; await sleep(700 * (i + 1)); continue }
      if (e instanceof Error && !isNetworkError(e)) throw e // 已是人話訊息
      throw new Error(isNetworkError(e) ? '連線逾時或中斷' : lastMsg)
    }
  }
  throw new Error(lastMsg)
}

async function jget<T>(path: string, timeoutMs = 20_000): Promise<T> {
  return (await req(path, {}, { timeoutMs, retries: 2, idempotent: true })).json()
}
async function jpost<T>(path: string, body: unknown, timeoutMs = 30_000): Promise<T> {
  // 非冪等:只在「後端未接到請求」時重試,避免重複建 job 等重複副作用
  return (await req(path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }, { timeoutMs, retries: 2, idempotent: false })).json()
}

export type Workflow = { name: string; description: string; stages: string[] }
export type StageOutput = { id: string; output: Record<string, unknown> | null; elapsed_ms?: number | null; tokens?: number | null }
export type Job = {
  id: number
  workflow: string
  status: string
  input: Record<string, unknown>
  start_stage: string | null
  result?: Record<string, unknown> | null
  error: string | null
  created_at: string
  updated_at: string
  stages?: StageOutput[]
  done_stages?: string[] // slim 輪詢回傳的已完成階段摘要
}
export type Agent = {
  name: string
  provider: string
  model: string
  system_prompt_chars: number
  user_prompt_chars: number
  updated_at: string
}

export const getHealth = () => jget<{ status: string; workflows: string[] }>('/health')
export const listWorkflows = () => jget<Workflow[]>('/workflows')
export const listJobs = () => jget<Job[]>('/jobs')
export const getJob = (id: number, full = true) => jget<Job>(`/jobs/${id}?full=${full}`)
export const createJob = (workflow: string, input: unknown, from_stage?: string) =>
  jpost<{ id: number; status: string }>('/jobs', { workflow, input, from_stage })
export const listAgents = () => jget<Agent[]>('/agents')
export const getAgent = (name: string) => jget<Record<string, unknown>>(`/agents/${name}`)
export const getAgentDefault = (name: string) =>
  jget<Record<string, unknown>>(`/agents/${name}/default`)
export const updateAgent = (name: string, patch: Record<string, unknown>) =>
  fetch(`${API_BASE}/agents/${name}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  }).then((r) => r.json())
export const resetAgent = (name: string) => jpost<Record<string, unknown>>(`/agents/${name}/reset`, {})
export const publishJob = (
  job_id: number,
  status: string,
  overrides?: Record<string, unknown>,
) => jpost<{ id: number; link: string; status: string }>('/publish', { job_id, status, overrides })
export const getBuiltinTemplates = () => jget<{
  article_types: { key: string; name: string; header: string; footer: string; author_id: number | null }[]
  header_disclaimers: Record<string, string>
  footer_disclaimers: Record<string, string>
}>('/templates/builtin')

// ── 設定版本管理（prompt 組合 / 押註組合）──
export type Version = { id: number; name: string; is_active: boolean; data: Record<string, unknown>; created_at: string }
export const listVersions = (scope: string) =>
  jget<{ scope: string; active_id: number | null; versions: Version[] }>(`/versions/${encodeURIComponent(scope)}`)
export const createVersion = (scope: string, name: string, data: Record<string, unknown>) =>
  jpost<{ id: number; name: string; is_active: boolean }>(`/versions/${encodeURIComponent(scope)}`, { name, data })
export const activateVersion = (scope: string, id: number) =>
  jpost<{ ok: boolean }>(`/versions/${encodeURIComponent(scope)}/${id}/activate`, {})
export const deleteVersion = (scope: string, id: number) =>
  fetch(`${API_BASE}/versions/${encodeURIComponent(scope)}/${id}`, { method: 'DELETE' }).then((r) => r.json())

export async function uploadFile(file: File): Promise<{ file: string; original_name: string; size: number }> {
  const fd = new FormData()
  fd.append('file', file)
  // 60s timeout + 重試 3 次,但只在「後端未接到請求」(frp 重啟空窗的 404)時重試 ——
  // 那時檔案根本沒送達後端,不會產生重複暫存檔;曖昧失敗(逾時/502)不重試。
  return (await req('/uploads', { method: 'POST', body: fd }, { timeoutMs: 60_000, retries: 3, idempotent: false })).json()
}

export type StreamHandler = (event: string, data: unknown) => void

/** 訂閱某 job 的 SSE 進度（先重播歷史事件，再接 live）。
 *  注意：SSE 規範行尾可為 \r\n（sse-starlette 預設就是）——必須用 \r?\n 解析。 */
export async function streamJob(
  jobId: number,
  onEvent: StreamHandler,
  signal?: AbortSignal,
): Promise<void> {
  const resp = await fetch(`${API_BASE}/jobs/${jobId}/stream`, { signal })
  if (!resp.body) return
  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const chunks = buffer.split(/\r?\n\r?\n/)
    buffer = chunks.pop() ?? ''
    for (const chunk of chunks) {
      const lines = chunk.split(/\r?\n/)
      const evLine = lines.find((l) => l.startsWith('event:'))
      const dataLine = lines.find((l) => l.startsWith('data:'))
      if (dataLine) {
        const ev = evLine ? evLine.slice(6).trim() : 'message'
        let parsed: unknown = dataLine.slice(5).trim()
        try {
          parsed = JSON.parse(parsed as string)
        } catch {
          /* keep raw */
        }
        onEvent(ev, parsed)
        if (ev === 'end') return
      }
    }
  }
}

export const apiBase = API_BASE

// ──────────────────────── Delivery 看板 ────────────────────────
export type BoardColumn = { id: number; name: string; kind: string; position: number; wip_limit: number | null }
export type TaskJob = { job_id: number; status: string; done_stages: string[]; current_stage: string | null; error: string | null }
export type QuotaUsage = { total: number; used: number; remaining: number }
export type ContractBrief = { id: number; client: string; name: string; category: string | null; category_usage: QuotaUsage | null }
export type Task = {
  id: number
  board_id: number
  column_id: number
  position: number
  title: string
  type: 'article' | 'general'
  description: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  client: string
  pipeline: string
  item_type: string
  bd_owner: string
  dm_owner: string
  editor: string
  contract_id: number | null
  contract: ContractBrief | null
  channels: string[]
  notes: string
  draft_deadline: string | null
  publish_deadline: string | null
  published_urls: Record<string, string>
  status: string
  status_label: string
  scheduled_publish_at: string | null
  line_proof_url: string
  draft_doc_url: string
  site_published: boolean
  takedown_date: string | null
  banner_spec: string
  placement_slot_id: string
  exec_sheet_ref: string
  assignee: string
  creator: string
  due_date: string | null
  source_url: string
  source_file: string
  article_type: string
  supplier: string
  header_disclaimer: string
  footer_disclaimer: string
  job_id: number | null
  job: TaskJob | null
  created_at: string
  updated_at: string
}
export type BoardComment = { id: number; task_id: number; author: string; body: string; created_at: string }
export type BoardActivity = { id: number; task_id: number; actor: string; kind: string; detail: string; created_at: string }
export type BoardNotification = { id: number; task_id: number; channel: string; target: string; body: string; created_at: string }
export type Contract = {
  id: number; client: string; name: string; mode: string
  quota: Record<string, number>; usage: Record<string, QuotaUsage>
  channels: string; notes: string; sheet_ref: string; start_date: string | null; end_date: string | null; created_at: string
}
export type ItemTypeMeta = { pipeline: string; quota: string; billable: boolean }
export type StatusMeta = { key: string; label: string; kind: string }
export type BoardMeta = { item_types: Record<string, ItemTypeMeta>; quota_categories: string[]; roles: Record<string, string[]>; statuses?: StatusMeta[] }
export type Board = { id: number; name: string; columns: BoardColumn[]; tasks: Task[]; contracts: Contract[]; meta: BoardMeta }
export type TaskDetail = Task & { comments: BoardComment[]; activity: BoardActivity[]; notifications: BoardNotification[] }

const patchJson = <T>(path: string, patch: unknown) =>
  req(path, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) }, { retries: 0 }).then((r) => r.json() as Promise<T>)
const del = (path: string) => req(path, { method: 'DELETE' }, { retries: 0 }).then((r) => r.json())

export const getBoard = () => jget<Board>('/board')
export const getTask = (id: number) => jget<TaskDetail>(`/board/tasks/${id}`)
export const createTask = (body: Partial<Task> & { title: string; actor?: string }) => jpost<Task>('/board/tasks', body)
export const updateTask = (id: number, patch: Partial<Task> & { actor?: string }) => patchJson<Task>(`/board/tasks/${id}`, patch)
export const deleteTask = (id: number) => del(`/board/tasks/${id}`)
export const runTask = (id: number, actor = '') => jpost<Task>(`/board/tasks/${id}/run`, { actor })
export const addTaskComment = (id: number, bodyText: string, author = '') => jpost<BoardComment>(`/board/tasks/${id}/comments`, { body: bodyText, author })
export const setTaskUrls = (id: number, urls: Record<string, string>, actor = '') => jpost<Task>(`/board/tasks/${id}/urls`, { urls, actor })
export const notifyBd = (id: number, actor = '') => jpost<Task>(`/board/tasks/${id}/notify-bd`, { actor })
export const createColumn = (name: string, kind = 'custom') => jpost<BoardColumn>('/board/columns', { name, kind })
export const updateColumn = (id: number, patch: Partial<BoardColumn>) => patchJson<BoardColumn>(`/board/columns/${id}`, patch)
export const deleteColumn = (id: number) => del(`/board/columns/${id}`)
export const listContracts = () => jget<Contract[]>('/board/contracts')
export const createContract = (body: Partial<Contract>) => jpost<Contract>('/board/contracts', body)
export const updateContract = (id: number, patch: Partial<Contract>) => patchJson<Contract>(`/board/contracts/${id}`, patch)
export const deleteContract = (id: number) => del(`/board/contracts/${id}`)

/** AI 主理人晨報:待人動作 / 今日截止 / 逾期 / 排程 / Banner 到期 / 合約預警。 */
export type DigestItem = { id: number; title: string; client: string; status: string; status_label: string; deadline?: string; which?: string; at?: string; takedown?: string }
export type ContractAlert = { id: number; client: string; name: string; kind: 'expiry' | 'quota_low'; end_date?: string; category?: string; total?: number; used?: number; remaining?: number }
export type Digest = {
  generated_at: string; open_count: number
  human_action: Record<string, DigestItem[]>
  due_today: DigestItem[]; overdue: DigestItem[]; scheduled_today: DigestItem[]; takedown_due: DigestItem[]
  contract_alerts: ContractAlert[]; text: string
}
export const getDigest = () => jget<Digest>('/board/digest')

/** 跨卡片活動流(指揮中心);actor=system 只看 AI/自動化動作。 */
export type GlobalActivity = BoardActivity & { task_title: string; task_client: string }
export const getActivity = (limit = 80, actor?: string) =>
  jget<GlobalActivity[]>(`/board/activity?limit=${limit}${actor ? `&actor=${actor}` : ''}`)

/** 種示範資料(可重複執行;只動 demo 標記資料)。 */
export const seedDemo = () => jpost<{ ok: boolean; tasks: number; contracts: number }>('/board/seed-demo', {})

/** B 線軟文:觸發 AI 初稿(brief = 卡片描述/特別提醒)。 */
export const runTaskDraft = (id: number, actor = '') => jpost<Task>(`/board/tasks/${id}/draft`, { actor })

/** C 線 Banner:素材規格 vs 綁定版位的驗證。 */
export type BannerCheck = { ok: boolean; slot: string | null; slot_size?: string; slot_max_kb?: number | null; issues: string[] }
export const bannerCheck = (id: number) => jget<BannerCheck>(`/board/tasks/${id}/banner-check`)

/** 客戶 360 聚合。 */
export type ClientOverview = {
  client: string
  contracts: Contract[]
  open_tasks: { id: number; title: string; item_type: string; pipeline: string; status: string; status_label: string; publish_deadline: string | null }[]
  closed_count: number
  published: { task: string; channel: string; url: string }[]
  placements: { id: string; name: string; surface_name: string; schedule: string; status: string }[]
}
export const listClients = () => jget<ClientOverview[]>('/clients')

/** 待人動作的細狀態分組(看板角色鏡頭 / 指揮中心雙佇列共用)。 */
export const HUMAN_QUEUES: Record<'bd' | 'editor', string[]> = {
  bd: ['awaiting_bd_close', 'client_review', 'quota_check'],
  editor: ['awaiting_upload', 'draft_done', 'awaiting_line', 'awaiting_accept'],
}

// ── 廣告版位共享持久層(取代 per-瀏覽器 localStorage)──
export const listPlacements = () => jget<unknown[]>('/placements')
export const syncPlacements = (items: unknown[]) =>
  req('/placements', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(items) }, { retries: 0 }).then((r) => r.json() as Promise<unknown[]>)

/** 看板即時串流(卡建立/移動/更新/刪除、留言、欄位變更)。回傳 cleanup 函式。 */
export function streamBoard(onEvent: StreamHandler, signal?: AbortSignal): void {
  void (async () => {
    try {
      const resp = await fetch(`${API_BASE}/board/stream`, { signal })
      if (!resp.body) return
      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const chunks = buffer.split(/\r?\n\r?\n/)
        buffer = chunks.pop() ?? ''
        for (const chunk of chunks) {
          const lines = chunk.split(/\r?\n/)
          const evLine = lines.find((l) => l.startsWith('event:'))
          const dataLine = lines.find((l) => l.startsWith('data:'))
          if (!dataLine) continue
          const ev = evLine ? evLine.slice(6).trim() : 'message'
          let parsed: unknown = dataLine.slice(5).trim()
          try { parsed = JSON.parse(parsed as string) } catch { /* keep raw */ }
          onEvent(ev, parsed)
        }
      }
    } catch { /* 連線中斷:由呼叫端決定重連 */ }
  })()
}
