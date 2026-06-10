import { useEffect, useRef, useState } from 'react'
import {
  apiBase,
  createJob,
  getAgent,
  getHealth,
  getJob,
  importStrapi,
  listAgents,
  listJobs,
  listWorkflows,
  publishJob,
  resetAgent,
  streamJob,
  updateAgent,
  uploadFile,
  type Agent,
  type Job,
  type Workflow,
} from './api'

type Tab = 'run' | 'jobs' | 'agents'
type StageState = { id: string; status: 'running' | 'done' }

function rec(o: unknown): Record<string, unknown> {
  return (o ?? {}) as Record<string, unknown>
}

export default function App() {
  const [tab, setTab] = useState<Tab>('run')
  const [health, setHealth] = useState<{ status: string; workflows: string[] } | null>(null)
  useEffect(() => {
    getHealth().then(setHealth).catch(() => setHealth(null))
  }, [])

  return (
    <div className="app">
      <div className="topbar">
        <h1>BD 內容自動化平台</h1>
        <span className="sub">Console · {apiBase}</span>
        <span className="health">
          <span className={`dot ${health?.status === 'ok' ? 'ok' : ''}`} />
          {health ? `後端正常 · ${health.workflows.length} workflows` : '後端未連線'}
        </span>
      </div>

      <div className="tabs">
        <div className={`tab ${tab === 'run' ? 'active' : ''}`} onClick={() => setTab('run')}>處理稿件</div>
        <div className={`tab ${tab === 'jobs' ? 'active' : ''}`} onClick={() => setTab('jobs')}>Jobs 歷史</div>
        <div className={`tab ${tab === 'agents' ? 'active' : ''}`} onClick={() => setTab('agents')}>Agent 設定</div>
      </div>

      {tab === 'run' && <RunPanel />}
      {tab === 'jobs' && <JobsPanel />}
      {tab === 'agents' && <AgentsPanel />}
    </div>
  )
}

function RunPanel() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [wf, setWf] = useState('article')
  const [mode, setMode] = useState<'file' | 'url' | 'text'>('file')
  const [url, setUrl] = useState('')
  const [text, setText] = useState('hello world')
  const [uploaded, setUploaded] = useState<{ file: string; original_name: string } | null>(null)
  const [running, setRunning] = useState(false)
  const [stages, setStages] = useState<StageState[]>([])
  const [log, setLog] = useState<string[]>([])
  const [job, setJob] = useState<Job | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    listWorkflows().then(setWorkflows).catch(() => {})
  }, [])

  const current = workflows.find((w) => w.name === wf)
  useEffect(() => {
    setMode(wf === 'echo' ? 'text' : 'file')
  }, [wf])

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      const r = await uploadFile(f)
      setUploaded(r)
    } catch (err) {
      alert('上傳失敗：' + String(err))
    }
  }

  async function run() {
    let input: Record<string, unknown> = {}
    if (mode === 'text') input = { text }
    else if (mode === 'url') input = { url }
    else if (mode === 'file') {
      if (!uploaded) return alert('請先上傳檔案')
      input = { file: uploaded.file }
    }
    setRunning(true)
    setStages([])
    setLog([])
    setJob(null)
    try {
      const { id } = await createJob(wf, input)
      await streamJob(id, (ev, data) => {
        const d = rec(data)
        setLog((l) => [...l, `[${ev}] ${JSON.stringify(data)}`])
        if (ev === 'stage') {
          const sid = String(d.id)
          const status = d.status as 'running' | 'done'
          setStages((prev) => {
            const others = prev.filter((s) => s.id !== sid)
            return [...others, { id: sid, status }]
          })
        }
      })
      const finished = await getJob(id)
      setJob(finished)
    } catch (err) {
      setLog((l) => [...l, 'ERROR ' + String(err)])
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="grid">
      <div className="panel">
        <h2>輸入</h2>
        <label>Workflow</label>
        <select value={wf} onChange={(e) => setWf(e.target.value)}>
          {workflows.map((w) => (
            <option key={w.name} value={w.name}>{w.name} — {w.description}</option>
          ))}
        </select>

        {wf !== 'echo' && (
          <>
            <label>進稿方式</label>
            <div className="seg">
              <button className={mode === 'file' ? 'on' : ''} onClick={() => setMode('file')}>檔案上傳</button>
              <button className={mode === 'url' ? 'on' : ''} onClick={() => setMode('url')}>網址</button>
            </div>
          </>
        )}

        {mode === 'text' && (
          <>
            <label>文字</label>
            <input type="text" value={text} onChange={(e) => setText(e.target.value)} />
          </>
        )}
        {mode === 'url' && (
          <>
            <label>網址（Google Docs / Medium / WeChat / 一般網站）</label>
            <input type="text" value={url} placeholder="https://…" onChange={(e) => setUrl(e.target.value)} />
          </>
        )}
        {mode === 'file' && (
          <>
            <label>檔案（PDF / DOCX / MD）</label>
            <input ref={fileRef} type="file" accept=".pdf,.docx,.md,.txt" onChange={onPickFile} />
            {uploaded && <p className="muted">已上傳：{uploaded.original_name}</p>}
          </>
        )}

        <button className="primary" disabled={running} onClick={run}>
          {running ? '處理中…' : '開始處理'}
        </button>
        {current && <p className="muted" style={{ marginTop: 10 }}>{current.stages.length} 階段：{current.stages.join(' → ')}</p>}
      </div>

      <div className="panel">
        <h2>進度與結果</h2>
        {stages.length === 0 && !job && <p className="muted">選好輸入後按「開始處理」。</p>}
        <div className="stages">
          {stages.map((s) => (
            <div key={s.id} className={`stage-row ${s.status}`}>
              <span className="ic">{s.status === 'done' ? '✓' : '◐'}</span>
              <span className="name">{s.id}</span>
              <span className="t">{s.status}</span>
            </div>
          ))}
        </div>
        {job && <ResultView job={job} />}
        {log.length > 0 && (
          <>
            <label>事件 log</label>
            <pre className="log">{log.join('\n')}</pre>
          </>
        )}
      </div>
    </div>
  )
}

function ResultView({ job }: { job: Job }) {
  const [pubMsg, setPubMsg] = useState('')
  const r = rec(job.result)
  const wp = rec(r.wordpress)
  const coverUrl = (r.cover_image_url as string) || ''
  const outputUrl = (r.output_url as string) || ''
  const finalText = (r.final_html as string) || (r.markdown as string) || ''

  async function doPublish(status: string) {
    if (status === 'publish' && !confirm('確定要『正式發布』到 WordPress？這是對外動作。')) return
    setPubMsg('發布中…')
    try {
      const out = await publishJob(job.id, status)
      setPubMsg(`✓ ${out.status} · ${out.link || 'post #' + out.id}`)
    } catch (err) {
      setPubMsg('✗ ' + String(err))
    }
  }

  return (
    <div style={{ marginTop: 14 }}>
      <div className="row">
        <span className={`status ${job.status}`}>{job.status}</span>
        <span className="muted">job #{job.id} · {job.workflow}</span>
      </div>
      {job.error && <p className="err">錯誤：{job.error}</p>}

      {Boolean(wp.title) && (
        <div className="kv" style={{ marginTop: 12 }}>
          <span className="k">標題</span><span>{String(wp.title)}</span>
          <span className="k">slug</span><span className="muted">{String(wp.slug || '')}</span>
          <span className="k">摘要</span><span>{String(wp.excerpt || '')}</span>
          <span className="k">分類/標籤</span>
          <span>
            {(wp.categories as unknown[] | undefined)?.map((c, i) => <span key={'c' + i} className="chip">cat {rec(c).id as number}</span>)}
            {(wp.tags as unknown[] | undefined)?.map((t, i) => <span key={'t' + i} className="chip">tag {rec(t).id as number}</span>)}
          </span>
        </div>
      )}

      {coverUrl && <img className="cover" src={coverUrl} alt="cover" />}

      {outputUrl && (
        <p style={{ marginTop: 10 }}>
          <a href={outputUrl} target="_blank" rel="noreferrer">↗ 開啟組好的成稿（HTML）</a>
        </p>
      )}
      {!outputUrl && finalText && (
        <>
          <label>結果預覽</label>
          <pre className="log" style={{ color: '#cdd3dc' }}>{finalText.slice(0, 4000)}</pre>
        </>
      )}

      {Boolean(wp.title) && (
        <div className="row" style={{ marginTop: 12 }}>
          <button className="ghost" onClick={() => doPublish('draft')}>存成 WordPress 草稿</button>
          <button className="ghost" onClick={() => doPublish('publish')}>正式發布</button>
          {pubMsg && <span className="muted">{pubMsg}</span>}
        </div>
      )}
    </div>
  )
}

function JobsPanel() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [sel, setSel] = useState<Job | null>(null)
  const load = () => listJobs().then(setJobs).catch(() => {})
  useEffect(() => {
    load()
  }, [])
  return (
    <div className="grid">
      <div className="panel">
        <h2>Jobs <button className="ghost" style={{ float: 'right', marginTop: -4 }} onClick={load}>重新整理</button></h2>
        <table>
          <thead><tr><th>#</th><th>workflow</th><th>狀態</th></tr></thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id} className="click" onClick={() => getJob(j.id).then(setSel)}>
                <td>{j.id}</td><td>{j.workflow}</td><td><span className={`status ${j.status}`}>{j.status}</span></td>
              </tr>
            ))}
            {jobs.length === 0 && <tr><td colSpan={3} className="muted">還沒有 job</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="panel">
        <h2>詳情</h2>
        {sel ? <ResultView job={sel} /> : <p className="muted">點左邊一筆 job 看結果。</p>}
      </div>
    </div>
  )
}

function AgentsPanel() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [name, setName] = useState('')
  const [cfg, setCfg] = useState<Record<string, unknown> | null>(null)
  const [msg, setMsg] = useState('')
  const [strapiMsg, setStrapiMsg] = useState('')

  const load = () => listAgents().then(setAgents).catch(() => {})
  useEffect(() => {
    load()
  }, [])

  async function open(n: string) {
    setName(n)
    setMsg('')
    setCfg(await getAgent(n))
  }
  function set(field: string, v: unknown) {
    setCfg((c) => ({ ...(c ?? {}), [field]: v }))
  }
  async function save() {
    if (!cfg) return
    setMsg('儲存中…')
    await updateAgent(name, {
      provider: cfg.provider,
      model: cfg.model,
      system_prompt: cfg.system_prompt,
      user_prompt: cfg.user_prompt,
    })
    setMsg('✓ 已儲存到 DB')
    load()
  }
  async function reset() {
    if (!confirm('重置回 seed 預設（從 R2 匯出的真值）？會覆蓋目前 DB 內容。')) return
    setCfg(await resetAgent(name))
    setMsg('✓ 已重置')
    load()
  }
  async function runStrapi() {
    setStrapiMsg('匯入中…（需本機 Strapi 開著）')
    try {
      const out = await importStrapi()
      setStrapiMsg('✓ ' + JSON.stringify(out.imported))
    } catch (err) {
      setStrapiMsg('✗ ' + String(err))
    }
  }

  const c = rec(cfg)
  return (
    <div className="grid">
      <div className="panel">
        <h2>Agents（設定存 DB）</h2>
        <table>
          <thead><tr><th>名稱</th><th>model</th></tr></thead>
          <tbody>
            {agents.map((a) => (
              <tr key={a.name} className="click" onClick={() => open(a.name)}>
                <td>{a.name}</td><td className="muted">{a.model}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="banner" style={{ marginTop: 16 }}>
          Strapi 設定遷移（作者 / 頁首頁尾免責範本 / 預設）
          <div className="row" style={{ marginTop: 8 }}>
            <button className="ghost" onClick={runStrapi}>從 Strapi 匯入 DB</button>
            <span className="muted">{strapiMsg}</span>
          </div>
        </div>
      </div>
      <div className="panel">
        <h2>編輯 {name || '—'}</h2>
        {!cfg ? <p className="muted">點左邊一個 agent 編輯。</p> : (
          <>
            <label>provider / model</label>
            <div className="row">
              <input type="text" value={String(c.provider || '')} onChange={(e) => set('provider', e.target.value)} style={{ flex: 1 }} />
              <input type="text" value={String(c.model || '')} onChange={(e) => set('model', e.target.value)} style={{ flex: 2 }} />
            </div>
            <label>system prompt</label>
            <textarea value={String(c.system_prompt || '')} onChange={(e) => set('system_prompt', e.target.value)} style={{ minHeight: 120 }} />
            <label>user prompt</label>
            <textarea value={String(c.user_prompt || '')} onChange={(e) => set('user_prompt', e.target.value)} style={{ minHeight: 80 }} />
            <div className="row" style={{ marginTop: 12 }}>
              <button className="ghost" onClick={save}>儲存</button>
              <button className="ghost" onClick={reset}>重置到預設</button>
              <span className="muted">{msg}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
