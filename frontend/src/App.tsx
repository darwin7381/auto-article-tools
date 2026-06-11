import { useEffect, useRef, useState } from 'react'
import { ConfigPanel } from './Config'
import { RichEditor } from './Editor'
import { StageList, type StageView } from './Stages'
import {
  createJob, getHealth, getJob, listJobs, listWorkflows, publishJob, streamJob,
  uploadFile, type Job, type Workflow,
} from './api'

type Tab = 'run' | 'jobs' | 'config'
type Mode = 'auto' | 'manual'
type PubStatus = 'draft' | 'pending' | 'publish' | 'private' | 'future'

function rec(o: unknown): Record<string, unknown> { return (o ?? {}) as Record<string, unknown> }

export default function App() {
  const [tab, setTab] = useState<Tab>('run')
  const [health, setHealth] = useState<{ status: string; workflows: string[] } | null>(null)
  useEffect(() => { getHealth().then(setHealth).catch(() => setHealth(null)) }, [])
  return (
    <div className="app">
      <div className="topbar">
        <h1>BD 內容自動化平台</h1>
        <span className="health">
          <span className={`dot ${health?.status === 'ok' ? 'ok' : ''}`} />
          {health ? `後端正常 · ${health.workflows.length} workflows` : '後端未連線'}
        </span>
      </div>
      <div className="tabs">
        <div className={`tab ${tab === 'run' ? 'active' : ''}`} onClick={() => setTab('run')}>處理稿件</div>
        <div className={`tab ${tab === 'jobs' ? 'active' : ''}`} onClick={() => setTab('jobs')}>Jobs 歷史</div>
        <div className={`tab ${tab === 'config' ? 'active' : ''}`} onClick={() => setTab('config')}>設定 / Prompt</div>
      </div>
      {tab === 'run' && <RunPanel />}
      {tab === 'jobs' && <JobsPanel />}
      {tab === 'config' && <ConfigPanel />}
    </div>
  )
}

function RunPanel() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [wf, setWf] = useState('article')
  const [mode, setMode] = useState<Mode>('manual')
  const [pubStatus, setPubStatus] = useState<PubStatus>('draft')
  const [imode, setImode] = useState<'file' | 'url' | 'text'>('file')
  const [url, setUrl] = useState('')
  const [text, setText] = useState('hello world')
  const [uploaded, setUploaded] = useState<{ file: string; original_name: string } | null>(null)
  const [running, setRunning] = useState(false)
  const [views, setViews] = useState<StageView[]>([])
  const [job, setJob] = useState<Job | null>(null)
  const [lastInput, setLastInput] = useState<Record<string, unknown>>({})
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { listWorkflows().then(setWorkflows).catch(() => {}) }, [])
  const current = workflows.find((w) => w.name === wf)
  useEffect(() => { setImode(wf === 'echo' ? 'text' : 'file'); setViews([]); setJob(null) }, [wf])

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    try { setUploaded(await uploadFile(f)) } catch (err) { alert('上傳失敗：' + String(err)) }
  }

  function gatherInput(): Record<string, unknown> | null {
    if (imode === 'text') return { text }
    if (imode === 'url') {
      if (!url.trim()) { alert('請先貼上網址'); return null }
      return { url: url.trim() }
    }
    if (!uploaded) { alert('請先上傳檔案'); return null }
    return { file: uploaded.file }
  }

  /** 用 job 快照更新逐階段視圖（事件已即時入庫，輪詢也拿得到中途進度）。 */
  function applyJobToViews(j: Job) {
    const done = new Map((j.stages ?? []).map((s) => [s.id, s.output]))
    setViews((prev) => {
      let marked = false
      return prev.map((v) => {
        if (done.has(v.id)) return { id: v.id, status: 'done' as const, output: done.get(v.id) ?? v.output }
        if (v.status === 'done') return v // 重跑時保留之前已完成的上游階段
        if (!marked) {
          marked = true
          if (j.status === 'running' || j.status === 'pending') return { ...v, status: 'running' as const }
          if (j.status === 'error') return { ...v, status: 'error' as const }
        }
        return v
      })
    })
  }

  async function execute(inputObj: Record<string, unknown>, fromStage?: string) {
    const ids = current?.stages ?? []
    const startIdx = fromStage ? ids.indexOf(fromStage) : 0
    setRunning(true)
    setJob(null)
    setLastInput(inputObj)
    setViews((prev) => {
      const byId = new Map(prev.map((v) => [v.id, v]))
      return ids.map((id, i) =>
        i < startIdx ? byId.get(id) ?? { id, status: 'pending' as const } : { id, status: 'pending' as const },
      )
    })
    try {
      const { id } = await createJob(wf, inputObj, fromStage)
      // SSE 求即時（解析已修 \r\n）；輪詢保底（任何 proxy/串流壞掉 UI 都不會卡死）
      const ac = new AbortController()
      streamJob(id, (ev, data) => {
        const d = rec(data)
        if (ev === 'stage') {
          setViews((prev) => prev.map((v) =>
            v.id === d.id ? { ...v, status: d.status as StageView['status'], output: (d.output as Record<string, unknown>) ?? v.output } : v))
        }
      }, ac.signal).catch(() => { /* SSE 斷線無妨，輪詢接手 */ })

      let finished: Job | null = null
      for (let i = 0; i < 400; i++) { // 上限 ~10 分鐘
        await new Promise((r) => setTimeout(r, 1500))
        const j = await getJob(id).catch(() => null)
        if (j) {
          applyJobToViews(j)
          if (j.status === 'done' || j.status === 'error') { finished = j; break }
        }
      }
      ac.abort()
      if (!finished) { alert('處理逾時（10 分鐘），請到 Jobs 歷史查看狀態'); return }
      setJob(finished)
      if (mode === 'auto' && finished.status === 'done' && rec(finished.result).wordpress) {
        await doPublish(finished, pubStatus, setJob)
      }
    } catch (err) {
      alert('啟動失敗：' + String(err))
    } finally { setRunning(false) }
  }

  function run() { const i = gatherInput(); if (i) execute(i) }

  return (
    <div className="grid">
      <div className="panel">
        <h2>輸入</h2>
        <label>處理模式</label>
        <div className="seg">
          <button className={mode === 'manual' ? 'on' : ''} onClick={() => setMode('manual')}>手動（逐步審稿）</button>
          <button className={mode === 'auto' ? 'on' : ''} onClick={() => setMode('auto')}>自動（跑完直接發）</button>
        </div>
        <label>發布狀態</label>
        <select value={pubStatus} onChange={(e) => setPubStatus(e.target.value as PubStatus)}>
          <option value="draft">草稿 draft</option>
          <option value="pending">待審 pending</option>
          <option value="publish">公開 publish</option>
          <option value="private">私密 private</option>
          <option value="future">排程 future</option>
        </select>

        <label>Workflow</label>
        <select value={wf} onChange={(e) => setWf(e.target.value)}>
          {workflows.map((w) => <option key={w.name} value={w.name}>{w.name} — {w.description}</option>)}
        </select>

        {wf !== 'echo' && (
          <>
            <label>進稿方式</label>
            <div className="seg">
              <button className={imode === 'file' ? 'on' : ''} onClick={() => setImode('file')}>檔案</button>
              <button className={imode === 'url' ? 'on' : ''} onClick={() => setImode('url')}>網址</button>
            </div>
          </>
        )}
        {imode === 'text' && <><label>文字</label><input type="text" value={text} onChange={(e) => setText(e.target.value)} /></>}
        {imode === 'url' && <><label>網址（Google Docs / Medium / WeChat / 網站）</label><input type="text" value={url} placeholder="https://…" onChange={(e) => setUrl(e.target.value)} /></>}
        {imode === 'file' && (
          <><label>檔案（PDF / DOCX / MD）</label>
            <input ref={fileRef} type="file" accept=".pdf,.docx,.md,.txt" onChange={onPickFile} />
            {uploaded && <p className="muted">已上傳：{uploaded.original_name}</p>}</>
        )}
        <button className="primary" disabled={running} onClick={run}>{running ? '處理中…' : '開始處理'}</button>
        {current && <p className="muted" style={{ marginTop: 10 }}>{current.stages.length} 階段：{current.stages.join(' → ')}</p>}
      </div>

      <div className="panel">
        <h2>逐階段進度與結果</h2>
        {views.length === 0 ? <p className="muted">選好輸入後按「開始處理」。每一步即時更新，完成後可展開檢視、也可從任一步重跑。</p>
          : <StageList stages={views} originalInput={lastInput} onRerun={(sid, input) => execute(input, sid)} />}
        {job && <ReviewPublish job={job} pubStatus={pubStatus} onJob={setJob} />}
      </div>
    </div>
  )
}

async function doPublish(job: Job, status: string, onJob: (j: Job) => void, content?: string) {
  const overrides = content ? { content } : undefined
  const out = await publishJob(job.id, status, overrides)
  onJob({ ...job, result: { ...rec(job.result), _published: out } })
  return out
}

function ReviewPublish({ job, pubStatus, onJob }: { job: Job; pubStatus: string; onJob: (j: Job) => void }) {
  const r = rec(job.result)
  const wp = rec(r.wordpress)
  const [edited, setEdited] = useState(String(wp.content || ''))
  const [msg, setMsg] = useState('')
  const published = rec(r._published)
  if (!wp.title) {
    return job.status === 'error' ? <p className="err" style={{ marginTop: 12 }}>錯誤：{job.error}</p> : null
  }
  async function publish(status: string) {
    setMsg('發布中…')
    try {
      const out = await doPublish(job, status, onJob, edited || undefined)
      setMsg(`✓ 已發布（${out.status}）`); if (out.link) window.open(out.link, '_blank')
    } catch (e) { setMsg('✗ ' + String(e)) }
  }
  return (
    <div className="review">
      <h2 style={{ marginTop: 18 }}>人工審稿 → 發布</h2>
      <div className="kv">
        <span className="k">標題</span><span>{String(wp.title)}</span>
        <span className="k">slug</span><span className="muted">{String(wp.slug || '')}</span>
      </div>
      <label>內文（TipTap，可直接編輯後再發布）</label>
      <RichEditor key={job.id} html={String(wp.content || '')} onChange={setEdited} />
      <div className="row" style={{ marginTop: 12 }}>
        <button className="primary" style={{ width: 'auto', marginTop: 0 }} onClick={() => publish(pubStatus)}>發布到 WordPress（{pubStatus}）</button>
        {msg && <span className="muted">{msg}</span>}
        {Boolean(published.link) && <a href={String(published.link)} target="_blank" rel="noreferrer">↗ 開啟文章</a>}
      </div>
    </div>
  )
}

function JobsPanel() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [sel, setSel] = useState<Job | null>(null)
  const load = () => listJobs().then(setJobs).catch(() => {})
  useEffect(() => { load() }, [])
  return (
    <div className="grid">
      <div className="panel">
        <h2>Jobs <button className="ghost" style={{ float: 'right', marginTop: -4 }} onClick={load}>重新整理</button></h2>
        <table>
          <thead><tr><th>#</th><th>workflow</th><th>狀態</th></tr></thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id} className="click" onClick={() => getJob(j.id).then(setSel)}>
                <td>{j.id}</td><td>{j.workflow}{j.start_stage ? ` ↻${j.start_stage}` : ''}</td>
                <td><span className={`status ${j.status}`}>{j.status}</span></td>
              </tr>
            ))}
            {jobs.length === 0 && <tr><td colSpan={3} className="muted">還沒有 job</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="panel">
        <h2>詳情</h2>
        {!sel ? <p className="muted">點左邊一筆 job。</p> : (
          <>
            <StageList
              stages={(sel.stages ?? []).map((s) => ({ id: s.id, status: 'done' as const, output: s.output }))}
              originalInput={sel.input}
              onRerun={() => alert('在「處理稿件」分頁可重跑；歷史頁為唯讀檢視')}
            />
            {sel.error && <p className="err">錯誤：{sel.error}</p>}
          </>
        )}
      </div>
    </div>
  )
}
