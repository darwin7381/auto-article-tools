import { useEffect, useState } from 'react'
import { getHealth, runWorkflow } from './api'

export default function App() {
  const [health, setHealth] = useState<unknown>(null)
  const [log, setLog] = useState<string[]>([])
  const [text, setText] = useState('hello world')
  const [running, setRunning] = useState(false)

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch((e) => setHealth({ error: String(e) }))
  }, [])

  async function handleRun() {
    setLog([])
    setRunning(true)
    try {
      await runWorkflow('echo', { text }, (ev, data) => {
        setLog((l) => [...l, `[${ev}] ${JSON.stringify(data)}`])
      })
    } finally {
      setRunning(false)
    }
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 640, margin: '40px auto', padding: 16 }}>
      <h1>BD 內容平台 — 骨架</h1>
      <p>
        後端健康狀態：<code>{JSON.stringify(health)}</code>
      </p>
      <hr />
      <h2>試跑 echo workflow（驗證 SSE 串流）</h2>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
      />
      <button onClick={handleRun} disabled={running} style={{ marginTop: 8, padding: '8px 16px' }}>
        {running ? '執行中…' : '執行'}
      </button>
      <pre
        style={{
          background: '#111',
          color: '#0f0',
          padding: 12,
          marginTop: 12,
          minHeight: 80,
          borderRadius: 6,
          overflowX: 'auto',
        }}
      >
        {log.join('\n')}
      </pre>
    </div>
  )
}
