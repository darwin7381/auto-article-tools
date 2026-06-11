import { useEffect, useState } from 'react'
import { ConfigPanel } from './Config'
import { RichEditor } from './Editor'
import { PublishForm } from './PublishForm'
import { StageList, type StageView } from './Stages'
import { FileDrop, UrlInput, type Uploaded } from './Upload'
import {
  createJob, getHealth, getJob, listJobs, listWorkflows, publishJob, streamJob,
  type Job, type Workflow,
} from './api'

type Tab = 'run' | 'jobs' | 'config'
type Mode = 'auto' | 'manual'
type ArticleType = 'regular' | 'sponsored' | 'press-release'

function rec(o: unknown): Record<string, unknown> { return (o ?? {}) as Record<string, unknown> }

const PIPELINE = 'article' // 主流程固定完整 pipeline；extract/standardize 留給 CLI/API 與重跑

const TYPE_OPTS: { key: ArticleType; label: string; header: string; footer: string }[] = [
  { key: 'regular', label: '一般文章', header: 'none', footer: 'none' },
  { key: 'sponsored', label: '廣編稿', header: 'sponsored', footer: 'sponsored' },
  { key: 'press-release', label: '新聞稿', header: 'press-release', footer: 'none' },
]
const DISCLAIMER_OPTS = [
  { key: 'none', label: '不押註' },
  { key: 'sponsored', label: '廣編稿押註' },
  { key: 'press-release', label: '新聞稿押註' },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('run')
  const [health, setHealth] = useState<{ status: string; workflows: string[] } | null>(null)
  const [light, setLight] = useState(() => localStorage.getItem('theme') === 'light')
  useEffect(() => {
    const check = () => getHealth().then(setHealth).catch(() => setHealth(null))
    check()
    const t = setInterval(check, 30_000) // 定時輪詢，後端重啟後自動恢復顯示
    return () => clearInterval(t)
  }, [])
  useEffect(() => {
    document.documentElement.classList.toggle('light', light)
    localStorage.setItem('theme', light ? 'light' : 'dark')
  }, [light])
  return (
    <div className="app">
      <div className="topbar">
        <h1>BD 內容自動化平台</h1>
        <span className="health">
          <span className={`dot ${health?.status === 'ok' ? 'ok' : ''}`} />
          {health ? '後端正常' : '後端未連線'}
        </span>
        <button className="ghost theme-btn" onClick={() => setLight((v) => !v)} title={light ? '切換到暗色模式' : '切換到亮色模式'}>
          {light ? '🌙' : '☀️'}
        </button>
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
  const [stageIds, setStageIds] = useState<string[]>([])
  const [mode, setMode] = useState<Mode>('manual')
  const [pubStatus, setPubStatus] = useState('draft')
  const [imode, setImode] = useState<'file' | 'url'>('file')
  const [url, setUrl] = useState('')
  const [uploaded, setUploaded] = useState<Uploaded | null>(null)
  const [atype, setAtype] = useState<ArticleType>('press-release')
  const [headerD, setHeaderD] = useState('press-release')
  const [footerD, setFooterD] = useState('none')
  const [supplier, setSupplier] = useState('')
  const [running, setRunning] = useState(false)
  const [views, setViews] = useState<StageView[]>([])
  const [job, setJob] = useState<Job | null>(null)
  const [autoMsg, setAutoMsg] = useState('')
  const [lastInput, setLastInput] = useState<Record<string, unknown>>({})

  useEffect(() => {
    listWorkflows().then((ws: Workflow[]) => {
      setStageIds(ws.find((w) => w.name === PIPELINE)?.stages ?? [])
    }).catch(() => {})
  }, [])

  function pickType(t: ArticleType) {
    setAtype(t)
    const opt = TYPE_OPTS.find((o) => o.key === t)!
    setHeaderD(opt.header); setFooterD(opt.footer)
  }

  function gatherInput(): Record<string, unknown> | null {
    const base = {
      article_type: atype,
      header_disclaimer: headerD,
      footer_disclaimer: footerD,
      supplier: supplier.trim(),
    }
    if (imode === 'url') {
      if (!url.trim() || !/^https?:\/\/.+\..+/.test(url.trim())) { alert('請輸入有效的URL'); return null }
      return { ...base, url: url.trim() }
    }
    if (!uploaded) { alert('請先上傳文件'); return null }
    return { ...base, file: uploaded.file }
  }

  function applyJobToViews(j: Job) {
    const done = new Map((j.stages ?? []).map((s) => [s.id, s.output]))
    setViews((prev) => {
      let marked = false
      return prev.map((v) => {
        if (done.has(v.id)) return { id: v.id, status: 'done' as const, output: done.get(v.id) ?? v.output }
        if (v.status === 'done') return v
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
    const startIdx = fromStage ? stageIds.indexOf(fromStage) : 0
    setRunning(true); setJob(null); setAutoMsg(''); setLastInput(inputObj)
    setViews((prev) => {
      const byId = new Map(prev.map((v) => [v.id, v]))
      return stageIds.map((id, i) =>
        i < startIdx ? byId.get(id) ?? { id, status: 'pending' as const } : { id, status: 'pending' as const })
    })
    try {
      const { id } = await createJob(PIPELINE, inputObj, fromStage)
      const ac = new AbortController()
      streamJob(id, (ev, data) => {
        const d = rec(data)
        if (ev === 'stage') {
          setViews((prev) => prev.map((v) =>
            v.id === d.id ? { ...v, status: d.status as StageView['status'], output: (d.output as Record<string, unknown>) ?? v.output } : v))
        }
      }, ac.signal).catch(() => {})
      let finished: Job | null = null
      for (let i = 0; i < 400; i++) {
        await new Promise((r) => setTimeout(r, 1500))
        const j = await getJob(id).catch(() => null)
        if (j) {
          applyJobToViews(j)
          if (j.status === 'done' || j.status === 'error') { finished = j; break }
        }
      }
      ac.abort()
      if (!finished) { alert('處理逾時（10 分鐘），請到 Jobs 歷史查看'); return }
      setJob(finished)
      if (mode === 'auto' && finished.status === 'done' && rec(finished.result).wordpress) {
        setAutoMsg('自動模式：發布中...')
        try {
          const out = await publishJob(finished.id, pubStatus)
          setAutoMsg(`✓ 自動發布成功（${out.status}）` + (out.link ? ` · ${out.link}` : ''))
        } catch (e) { setAutoMsg('✗ 自動發布失敗：' + String(e)) }
      }
    } catch (e) {
      alert('啟動失敗：' + String(e))
    } finally { setRunning(false) }
  }

  const meta = imode === 'file' ? (uploaded ? `檔案：${uploaded.original_name}` : '') : (url ? `連結：${url}` : '')

  return (
    <div className="grid">
      <div className="panel">
        <h2>1. 進稿</h2>
        <div className="seg">
          <button className={imode === 'file' ? 'on' : ''} onClick={() => setImode('file')}>上傳文件</button>
          <button className={imode === 'url' ? 'on' : ''} onClick={() => setImode('url')}>輸入連結</button>
        </div>
        <div style={{ marginTop: 12 }}>
          {imode === 'file'
            ? <FileDrop uploaded={uploaded} onUploaded={setUploaded} />
            : <UrlInput url={url} onUrl={setUrl} />}
        </div>

        <h2 style={{ marginTop: 22 }}>2. 文稿類型</h2>
        <div className="seg">
          {TYPE_OPTS.map((o) => (
            <button key={o.key} className={atype === o.key ? 'on' : ''} onClick={() => pickType(o.key)}>{o.label}</button>
          ))}
        </div>
        <div className="two-col" style={{ marginTop: 8 }}>
          <div>
            <label>正文開頭押註</label>
            <select value={headerD} onChange={(e) => setHeaderD(e.target.value)}>
              {DISCLAIMER_OPTS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
            </select>
          </div>
          <div>
            <label>正文末尾押註</label>
            <select value={footerD} onChange={(e) => setFooterD(e.target.value)}>
              {DISCLAIMER_OPTS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
            </select>
          </div>
        </div>
        <label>供稿方</label>
        <input type="text" value={supplier} placeholder="輸入供稿方名稱（選填）" onChange={(e) => setSupplier(e.target.value)} />
        <p className="hint">用於自動替換押註中的［撰稿方名稱］</p>

        <h2 style={{ marginTop: 22 }}>3. 處理模式</h2>
        <div className="two-col">
          <div>
            <label>處理模式</label>
            <select value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
              <option value="manual">手動模式（逐步審稿）</option>
              <option value="auto">自動模式（跑完直接發）</option>
            </select>
          </div>
          <div>
            <label>預設發佈狀態</label>
            <select value={pubStatus} onChange={(e) => setPubStatus(e.target.value)}>
              <option value="draft">草稿</option>
              <option value="pending">待審核</option>
              <option value="publish">立即發佈</option>
              <option value="private">私人</option>
              <option value="future">定時發佈</option>
            </select>
          </div>
        </div>

        <button className="primary" disabled={running} onClick={() => { const i = gatherInput(); if (i) execute(i) }}>
          {running ? '處理中...' : '開始處理'}
        </button>
        {stageIds.length > 0 && <p className="muted" style={{ marginTop: 10, fontSize: 12 }}>完整流程 {stageIds.length} 階段，每一步即時更新、可展開查看、可從任一步重跑。</p>}
      </div>

      <div className="panel">
        <h2>處理進度與結果</h2>
        {views.length === 0
          ? <p className="muted">選好進稿後按「開始處理」。</p>
          : <StageList stages={views} originalInput={lastInput} meta={meta}
              onRerun={(sid, input) => execute(input, sid)} />}
        {autoMsg && <div className={autoMsg.startsWith('✓') ? 'ok-box' : 'err-box'} style={{ marginTop: 10 }}>{autoMsg}</div>}
        {job && mode === 'manual' && <ReviewPublish job={job} defaultStatus={pubStatus} />}
        {job?.status === 'error' && <div className="err-box" style={{ marginTop: 10 }}>處理錯誤：{job.error}</div>}
      </div>
    </div>
  )
}

function ReviewPublish({ job, defaultStatus }: { job: Job; defaultStatus: string }) {
  const r = rec(job.result)
  const wp = rec(r.wordpress)
  const [edited, setEdited] = useState(String(wp.content || ''))
  const outputUrl = (r.output_url as string) || ''
  if (!wp.title) return null
  return (
    <div className="review">
      <h2 style={{ marginTop: 18 }}>上稿：人工審稿 → 發布</h2>
      <label>內文校稿（可視化 / HTML 雙模式）</label>
      <RichEditor key={job.id} html={String(wp.content || '')} onChange={setEdited} />
      {outputUrl && <p style={{ margin: '8px 0' }}><a href={outputUrl} target="_blank" rel="noreferrer">↗ 開啟組好的成稿（含押註/封面）</a></p>}
      <PublishForm job={job} editedHtml={edited} defaultStatus={defaultStatus} />
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
          <thead><tr><th>#</th><th>流程</th><th>狀態</th></tr></thead>
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
            <StageList grouped={false}
              stages={(sel.stages ?? []).map((s) => ({ id: s.id, status: 'done' as const, output: s.output }))}
              originalInput={sel.input}
              onRerun={() => alert('請在「處理稿件」分頁重跑；歷史頁為唯讀檢視')} />
            {sel.error && <div className="err-box">錯誤：{sel.error}</div>}
          </>
        )}
      </div>
    </div>
  )
}
