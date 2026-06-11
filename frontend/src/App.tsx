import { useEffect, useRef, useState } from 'react'
import { ConfigPanel } from './Config'
import { RichEditor } from './Editor'
import { PublishForm } from './PublishForm'
import { StageList, type StageView } from './Stages'
import { FileDrop, UrlInput, type Uploaded } from './Upload'
import { Toasts, toast } from './toast'
import {
  createJob, getHealth, getJob, listJobs, listWorkflows, publishJob, streamJob,
  type Job, type Workflow,
} from './api'

type Tab = 'run' | 'jobs' | 'config'
type Mode = 'auto' | 'manual'
type ArticleType = 'regular' | 'sponsored' | 'press-release'

function rec(o: unknown): Record<string, unknown> { return (o ?? {}) as Record<string, unknown> }

const PIPELINE = 'article'

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

/** 偏好記憶（E1）。 */
function pref<T>(key: string, init: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => {
    try { const s = localStorage.getItem('pref:' + key); return s != null ? JSON.parse(s) : init }
    catch { return init }
  })
  return [v, (nv: T) => { setV(nv); localStorage.setItem('pref:' + key, JSON.stringify(nv)) }]
}

function relTime(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso + (iso.endsWith('Z') ? '' : 'Z')).getTime()) / 1000)
  if (s < 60) return `${Math.floor(s)} 秒前`
  if (s < 3600) return `${Math.floor(s / 60)} 分鐘前`
  if (s < 86400) return `${Math.floor(s / 3600)} 小時前`
  return `${Math.floor(s / 86400)} 天前`
}
function jobDurMs(j: Job): number | null {
  const a = new Date(j.created_at + (j.created_at.endsWith('Z') ? '' : 'Z')).getTime()
  const b = new Date(j.updated_at + (j.updated_at.endsWith('Z') ? '' : 'Z')).getTime()
  return b > a ? b - a : null
}
function jobSource(j: Job): string {
  const i = rec(j.input)
  if (i.url) return String(i.url).replace(/^https?:\/\//, '').slice(0, 42)
  if (i.file) return String(i.file).split('/').pop()?.slice(0, 42) ?? '檔案'
  return '—'
}

export default function App() {
  const [tab, setTab] = useState<Tab>('run')
  const [health, setHealth] = useState<{ status: string } | null>(null)
  const [light, setLight] = pref('theme-light', false)
  const [openJobId, setOpenJobId] = useState<number | null>(null) // Jobs 頁點開 → 跳回 run 視圖
  useEffect(() => {
    const check = () => getHealth().then(setHealth).catch(() => setHealth(null))
    check()
    const t = setInterval(check, 30_000)
    return () => clearInterval(t)
  }, [])
  useEffect(() => { document.documentElement.classList.toggle('light', light) }, [light])
  return (
    <div className="app">
      <Toasts />
      <div className="topbar">
        <h1>BD 內容自動化平台</h1>
        <span className="health">
          <span className={`dot ${health ? 'ok' : ''}`} />
          {health ? '後端正常' : '後端未連線'}
        </span>
        <button className="ghost theme-btn" onClick={() => setLight(!light)} title={light ? '切換到暗色模式' : '切換到亮色模式'}>
          {light ? '🌙' : '☀️'}
        </button>
      </div>
      <div className="tabs">
        <div className={`tab ${tab === 'run' ? 'active' : ''}`} onClick={() => setTab('run')}>處理稿件</div>
        <div className={`tab ${tab === 'jobs' ? 'active' : ''}`} onClick={() => setTab('jobs')}>Jobs 歷史</div>
        <div className={`tab ${tab === 'config' ? 'active' : ''}`} onClick={() => setTab('config')}>設定 / Prompt</div>
      </div>
      <div style={{ display: tab === 'run' ? 'block' : 'none' }}>
        <RunPanel openJobId={openJobId} onOpened={() => setOpenJobId(null)} />
      </div>
      {tab === 'jobs' && <JobsPanel onOpen={(id) => { setOpenJobId(id); setTab('run') }} />}
      {tab === 'config' && <ConfigPanel />}
    </div>
  )
}

function RunPanel({ openJobId, onOpened }: { openJobId: number | null; onOpened: () => void }) {
  const [stageIds, setStageIds] = useState<string[]>([])
  const [mode, setMode] = pref<Mode>('mode', 'manual')
  const [pubStatus, setPubStatus] = pref('pub-status', 'draft')
  const [imode, setImode] = useState<'file' | 'url'>('file')
  const [url, setUrl] = useState('')
  const [uploaded, setUploaded] = useState<Uploaded | null>(null)
  const [atype, setAtype] = pref<ArticleType>('article-type', 'press-release')
  const [headerD, setHeaderD] = useState(() => TYPE_OPTS.find((o) => o.key === 'press-release')!.header)
  const [footerD, setFooterD] = useState('none')
  const [supplier, setSupplier] = useState('')
  const [running, setRunning] = useState(false)
  const [views, setViews] = useState<StageView[]>([])
  const [job, setJob] = useState<Job | null>(null)
  const [recent, setRecent] = useState<Job[]>([])
  const [watchingId, setWatchingId] = useState<number | null>(null)
  const [lastInput, setLastInput] = useState<Record<string, unknown>>({})
  const attachToken = useRef(0)
  const stageIdsRef = useRef<string[]>([]) // attach 在 mount 早期就會用到，避免 state race

  // 初始：先載 pipeline 定義（attach 依賴它），再接回進行中（B1）
  useEffect(() => {
    ;(async () => {
      try {
        const ws: Workflow[] = await listWorkflows()
        const ids = ws.find((w) => w.name === PIPELINE)?.stages ?? []
        stageIdsRef.current = ids
        setStageIds(ids)
      } catch { /* health 會顯示未連線 */ }
      const js = await refreshRecent()
      const live = js.find((j) => j.workflow === PIPELINE && (j.status === 'running' || j.status === 'pending'))
      if (live) { toast.info(`接回進行中的任務 #${live.id}`); attach(live.id) }
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Jobs 頁點開某筆 → 載入完整視圖（B3）
  useEffect(() => {
    if (openJobId != null) { attach(openJobId); onOpened() }
  }, [openJobId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function refreshRecent(): Promise<Job[]> {
    try {
      const js = (await listJobs()).filter((j) => j.workflow === PIPELINE).slice(0, 6)
      setRecent(js)
      return js
    } catch { return [] }
  }

  function pickType(t: ArticleType) {
    setAtype(t)
    const opt = TYPE_OPTS.find((o) => o.key === t)!
    setHeaderD(opt.header); setFooterD(opt.footer)
  }

  function gatherInput(): Record<string, unknown> | null {
    const base = { article_type: atype, header_disclaimer: headerD, footer_disclaimer: footerD, supplier: supplier.trim() }
    if (imode === 'url') {
      if (!url.trim() || !/^https?:\/\/.+\..+/.test(url.trim())) { toast.err('請輸入有效的URL'); return null }
      return { ...base, url: url.trim() }
    }
    if (!uploaded) { toast.err('請先上傳文件'); return null }
    return { ...base, file: uploaded.file }
  }

  function viewsFromJob(j: Job, keepPrefix: StageView[] = []): StageView[] {
    let ids = stageIdsRef.current.length ? stageIdsRef.current : (j.stages ?? []).map((s) => s.id)
    // 重跑型 job 從歷史載入（無上游 keepPrefix）：只顯示它實際跑的階段，
    // 否則被跳過的上游會永遠掛在 pending、整體進度卡在「處理中」
    if (j.start_stage && keepPrefix.length === 0) {
      const si = ids.indexOf(j.start_stage)
      if (si > 0) ids = ids.slice(si)
    }
    const done = new Map((j.stages ?? []).map((s) => [s.id, s]))
    const keep = new Map(keepPrefix.map((v) => [v.id, v]))
    let marked = false
    return ids.map((id) => {
      const so = done.get(id)
      if (so) return { id, status: 'done' as const, output: so.output, elapsedMs: so.elapsed_ms ?? undefined }
      const kept = keep.get(id)
      if (kept?.status === 'done') return kept
      if (!marked && (j.status === 'running' || j.status === 'pending')) { marked = true; return { id, status: 'running' as const } }
      if (!marked && j.status === 'error') { marked = true; return { id, status: 'error' as const } }
      return { id, status: 'pending' as const }
    })
  }

  /** 統一的「掛上一個 job」：建立後 / 重新整理接回 / 歷史點開，全走這條（B1/B2/B3 共用）。 */
  async function attach(id: number, keepPrefix: StageView[] = []) {
    const token = ++attachToken.current
    setWatchingId(id)
    setJob(null)
    const first = await getJob(id).catch(() => null)
    if (!first) { toast.err(`載入 job #${id} 失敗`); return }
    setLastInput(first.input)
    setViews(viewsFromJob(first, keepPrefix))
    if (first.status === 'done' || first.status === 'error') { setJob(first); return }

    setRunning(true)
    const ac = new AbortController()
    streamJob(id, (ev, data) => {
      if (attachToken.current !== token) return
      const d = rec(data)
      if (ev === 'stage') {
        setViews((prev) => prev.map((v) => v.id === d.id
          ? { ...v, status: d.status as StageView['status'], output: (d.output as Record<string, unknown>) ?? v.output, elapsedMs: (d.elapsed_ms as number) ?? v.elapsedMs }
          : v))
      }
    }, ac.signal).catch(() => {})
    try {
      for (let i = 0; i < 400; i++) {
        await new Promise((r) => setTimeout(r, 1500))
        if (attachToken.current !== token) return // 使用者切去看別的 job
        const j = await getJob(id).catch(() => null)
        if (j) {
          setViews(viewsFromJob(j, keepPrefix))
          if (j.status === 'done' || j.status === 'error') {
            setJob(j)
            if (j.status === 'done') toast.ok(`任務 #${id} 完成`)
            else toast.err(`任務 #${id} 失敗：${j.error ?? ''}`)
            if (mode === 'auto' && j.status === 'done' && rec(j.result).wordpress) {
              try {
                const out = await publishJob(j.id, pubStatus)
                toast.ok(`自動發布成功（${out.status}）`)
              } catch (e) { toast.err('自動發布失敗：' + String(e)) }
            }
            return
          }
        }
      }
      toast.err('處理逾時（10 分鐘），稍後可從執行列接回')
    } finally {
      if (attachToken.current === token) setRunning(false)
      ac.abort()
      refreshRecent()
    }
  }

  async function execute(inputObj: Record<string, unknown>, fromStage?: string) {
    const startIdx = fromStage ? stageIds.indexOf(fromStage) : 0
    const keepPrefix = fromStage ? views.slice(0, startIdx) : []
    setLastInput(inputObj)
    try {
      const { id } = await createJob(PIPELINE, inputObj, fromStage)
      toast.info(fromStage ? `從「${fromStage}」重跑（#${id}）` : `開始處理（#${id}）`)
      refreshRecent()
      await attach(id, keepPrefix)
    } catch (e) { toast.err('啟動失敗：' + String(e)) }
  }

  const meta = (() => {
    const i = rec(lastInput)
    if (i.url) return `連結：${i.url}`
    if (i.file) return `檔案：${String(i.file).split('/').pop()}`
    return imode === 'file' ? (uploaded ? `檔案：${uploaded.original_name}` : '') : (url ? `連結：${url}` : '')
  })()
  const totalMs = job ? jobDurMs(job) : null

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
        <p className="muted" style={{ marginTop: 10, fontSize: 12 }}>
          {running ? '可以放心離開或重新整理——回來會自動接上進度。' : `完整流程 ${stageIds.length || 7} 階段，每一步即時更新、可展開查看、可從任一步重跑。`}
        </p>
      </div>

      <div className="panel">
        <div className="row">
          <h2 style={{ margin: 0 }}>處理進度與結果</h2>
          <span className="spacer" />
        </div>
        {recent.length > 0 && (
          <div className="runs-strip">
            {recent.map((j) => (
              <button key={j.id} className={`run-chip ${j.id === watchingId ? 'cur' : ''}`} onClick={() => attach(j.id)}
                title={`${jobSource(j)} · ${relTime(j.created_at)}`}>
                <span className={`dot2 ${j.status}`} />#{j.id}{j.start_stage ? '↻' : ''}
              </button>
            ))}
          </div>
        )}
        {views.length === 0
          ? <p className="muted" style={{ marginTop: 10 }}>選好進稿後按「開始處理」。進行中或歷史任務可從上方執行列點開。</p>
          : <StageList stages={views} originalInput={lastInput} meta={meta} totalMs={totalMs}
              onRerun={(sid, input) => execute(input, sid)} />}
        {job && job.status === 'done' && <ResultHero job={job} />}
        {job && mode === 'manual' && <ReviewPublish job={job} defaultStatus={pubStatus} />}
        {job?.status === 'error' && <div className="err-box" style={{ marginTop: 10 }}>處理錯誤：{job.error}</div>}
      </div>
    </div>
  )
}

/** 成品區（A3）：標題/摘要/封面是主角。 */
function ResultHero({ job }: { job: Job }) {
  const r = rec(job.result)
  const wp = rec(r.wordpress)
  const cover = (r.cover_image_url as string) || ''
  if (!wp.title) return null
  return (
    <div className="hero">
      {cover && <img className="hero-cover" src={cover.startsWith('http') ? cover : cover} alt="cover" />}
      <div className="hero-body">
        <div className="hero-title">{String(wp.title)}</div>
        {Boolean(wp.excerpt) && <div className="hero-excerpt">{String(wp.excerpt)}</div>}
        <div className="row" style={{ marginTop: 6 }}>
          {(wp.categories as unknown[] | undefined)?.map((c, i) => <span key={'c' + i} className="chip">分類 {String(rec(c).id)}</span>)}
          {(wp.tags as unknown[] | undefined)?.slice(0, 6).map((t, i) => <span key={'t' + i} className="chip">tag {String(rec(t).id)}</span>)}
          {Boolean(r.output_url) && <a href={String(r.output_url)} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>↗ 開啟成稿（含押註/封面）</a>}
        </div>
      </div>
    </div>
  )
}

function ReviewPublish({ job, defaultStatus }: { job: Job; defaultStatus: string }) {
  const r = rec(job.result)
  const wp = rec(r.wordpress)
  const [edited, setEdited] = useState(String(wp.content || ''))
  if (!wp.title) return null
  return (
    <div className="review">
      <h2 style={{ marginTop: 18 }}>上稿：人工審稿 → 發布</h2>
      <label>內文校稿（可視化 / HTML 雙模式）</label>
      <RichEditor key={job.id} html={String(wp.content || '')} onChange={setEdited} />
      <PublishForm job={job} editedHtml={edited} defaultStatus={defaultStatus} />
    </div>
  )
}

function JobsPanel({ onOpen }: { onOpen: (id: number) => void }) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [filter, setFilter] = useState('all')
  const load = () => listJobs().then(setJobs).catch(() => {})
  useEffect(() => { load() }, [])
  const shown = jobs.filter((j) => filter === 'all' || j.status === filter)
  return (
    <div className="panel">
      <div className="row" style={{ marginBottom: 10 }}>
        <h2 style={{ margin: 0 }}>Jobs 歷史</h2>
        <div className="seg" style={{ width: 'auto' }}>
          {['all', 'done', 'running', 'error'].map((f) => (
            <button key={f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>
              {f === 'all' ? '全部' : f === 'done' ? '完成' : f === 'running' ? '進行中' : '失敗'}
            </button>
          ))}
        </div>
        <span className="spacer" />
        <button className="ghost" onClick={load}>重新整理</button>
      </div>
      <table>
        <thead><tr><th>#</th><th>來源</th><th>流程</th><th>狀態</th><th>耗時</th><th>時間</th></tr></thead>
        <tbody>
          {shown.map((j) => {
            const d = jobDurMs(j)
            return (
              <tr key={j.id} className="click" onClick={() => onOpen(j.id)}>
                <td>{j.id}</td>
                <td className="muted">{jobSource(j)}</td>
                <td>{j.workflow}{j.start_stage ? ` ↻${j.start_stage}` : ''}</td>
                <td><span className={`status ${j.status}`}>{j.status}</span></td>
                <td className="muted">{j.status === 'done' && d ? `${Math.round(d / 1000)}s` : '—'}</td>
                <td className="muted">{relTime(j.created_at)}</td>
              </tr>
            )
          })}
          {shown.length === 0 && <tr><td colSpan={6} className="muted">沒有符合的 job</td></tr>}
        </tbody>
      </table>
      <p className="hint" style={{ marginTop: 8 }}>點任一筆回到「處理稿件」載入完整視圖（可查看每階段、重跑、發布）。</p>
    </div>
  )
}
