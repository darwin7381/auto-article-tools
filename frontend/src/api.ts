const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000'

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

/** frp 在後端未接上時會回 404 HTML 頁;502/503 同理 → 視為「暫時性、可重試」。 */
export function isTransientDown(status: number, body: string): boolean {
  if (status === 502 || status === 503) return true
  if (status === 404 && /<\s*html|powered by|frp/i.test(body)) return true
  return false
}
function isNetworkError(e: unknown): boolean {
  if (e instanceof DOMException) return e.name === 'TimeoutError' || e.name === 'AbortError'
  return e instanceof TypeError // fetch 連線失敗
}

/** 帶 timeout + 暫時性失敗自動重試的 fetch(回 Response;錯誤已轉人話)。
 *  重試只在「後端暫時不可達」(frp 404/502/503 / 連線失敗)時發生 —— 此時後端沒收到請求,
 *  即使是 POST 也不會產生重複副作用,安全。真正的 4xx/5xx 業務錯誤不重試。 */
async function req(path: string, init: RequestInit, { timeoutMs = 20_000, retries = 0 } = {}): Promise<Response> {
  let lastMsg = '請求失敗'
  for (let i = 0; i <= retries; i++) {
    try {
      const r = await fetch(`${API_BASE}${path}`, { ...init, signal: AbortSignal.timeout(timeoutMs) })
      if (r.ok) return r
      const body = await r.text()
      if (isTransientDown(r.status, body) && i < retries) {
        lastMsg = friendlyError(r.status, body); await sleep(700 * (i + 1)); continue
      }
      throw new Error(friendlyError(r.status, body))
    } catch (e) {
      if (isNetworkError(e) && i < retries) { lastMsg = '連線逾時或中斷,重試中…'; await sleep(700 * (i + 1)); continue }
      if (e instanceof Error && !isNetworkError(e)) throw e // 已是人話訊息
      throw new Error(isNetworkError(e) ? '連線逾時或中斷' : lastMsg)
    }
  }
  throw new Error(lastMsg)
}

async function jget<T>(path: string, timeoutMs = 20_000): Promise<T> {
  return (await req(path, {}, { timeoutMs, retries: 2 })).json()
}
async function jpost<T>(path: string, body: unknown, timeoutMs = 30_000): Promise<T> {
  return (await req(path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }, { timeoutMs, retries: 2 })).json()
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
  // 60s timeout + 暫時性失敗重試 3 次(後端重啟空窗 ~3-5s,frp 會回 404 → 退避重試自動撐過)
  return (await req('/uploads', { method: 'POST', body: fd }, { timeoutMs: 60_000, retries: 3 })).json()
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
