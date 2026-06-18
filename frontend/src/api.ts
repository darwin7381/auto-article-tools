const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000'

// 所有請求都帶 timeout：tunnel/行動網路壅塞時，沒 timeout 的 fetch 會永遠懸住
// → UI 卡死且不自癒
async function jget<T>(path: string, timeoutMs = 20_000): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`, { signal: AbortSignal.timeout(timeoutMs) })
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`)
  return r.json()
}
async function jpost<T>(path: string, body: unknown, timeoutMs = 30_000): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`)
  return r.json()
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
export const importStrapi = () => jpost<{ imported: Record<string, number> }>('/site-config/import-strapi', {})
export const getBuiltinTemplates = () => jget<{
  article_types: { key: string; name: string; header: string; footer: string; author_id: number | null }[]
  header_disclaimers: Record<string, string>
  footer_disclaimers: Record<string, string>
}>('/site-config/builtin')
export const listSiteConfig = () => jget<{ id: string; kind: string; key: string; value: Record<string, unknown> }[]>('/site-config')

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
  const r = await fetch(`${API_BASE}/uploads`, { method: 'POST', body: fd })
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`)
  return r.json()
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
