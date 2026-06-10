const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000'

async function jget<T>(path: string): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`)
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`)
  return r.json()
}
async function jpost<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`)
  return r.json()
}

export type Workflow = { name: string; description: string; stages: string[] }
export type Job = {
  id: number
  workflow: string
  status: string
  input: Record<string, unknown>
  result: Record<string, unknown> | null
  error: string | null
  created_at: string
  updated_at: string
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
export const getJob = (id: number) => jget<Job>(`/jobs/${id}`)
export const createJob = (workflow: string, input: unknown) =>
  jpost<{ id: number; status: string }>('/jobs', { workflow, input })
export const listAgents = () => jget<Agent[]>('/agents')
export const getAgent = (name: string) => jget<Record<string, unknown>>(`/agents/${name}`)
export const updateAgent = (name: string, patch: Record<string, unknown>) =>
  fetch(`${API_BASE}/agents/${name}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  }).then((r) => r.json())
export const resetAgent = (name: string) => jpost<Record<string, unknown>>(`/agents/${name}/reset`, {})
export const publishJob = (job_id: number, status: string) =>
  jpost<{ id: number; link: string; status: string }>('/publish', { job_id, status })
export const importStrapi = () => jpost<{ imported: Record<string, number> }>('/site-config/import-strapi', {})

export async function uploadFile(file: File): Promise<{ file: string; original_name: string; size: number }> {
  const fd = new FormData()
  fd.append('file', file)
  const r = await fetch(`${API_BASE}/uploads`, { method: 'POST', body: fd })
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`)
  return r.json()
}

export type StreamHandler = (event: string, data: unknown) => void

/** 訂閱某 job 的 SSE 進度（先重播歷史事件，再接 live）。 */
export async function streamJob(jobId: number, onEvent: StreamHandler): Promise<void> {
  const resp = await fetch(`${API_BASE}/jobs/${jobId}/stream`)
  if (!resp.body) return
  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const chunks = buffer.split('\n\n')
    buffer = chunks.pop() ?? ''
    for (const chunk of chunks) {
      const lines = chunk.split('\n')
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
