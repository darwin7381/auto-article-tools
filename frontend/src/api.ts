const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000'

export async function getHealth(): Promise<unknown> {
  const r = await fetch(`${API_BASE}/health`)
  return r.json()
}

export type WorkflowEvent = (event: string, data: unknown) => void

/**
 * 跑一條 workflow，逐 SSE 事件回呼。
 * POST 不能用瀏覽器原生 EventSource，所以用 fetch + ReadableStream 解析 SSE。
 */
export async function runWorkflow(
  name: string,
  input: unknown,
  onEvent: WorkflowEvent,
): Promise<void> {
  const resp = await fetch(`${API_BASE}/workflows/${name}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input }),
  })
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
        onEvent(ev, JSON.parse(dataLine.slice(5).trim()))
      }
    }
  }
}
