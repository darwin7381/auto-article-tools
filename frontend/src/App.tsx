import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ConfigPanel } from './Config'
import { RichEditor } from './Editor'
import { PublishForm } from './PublishForm'
import { StageList, type StageView } from './Stages'
import { StatusPanel } from './Status'
import { FileDrop, UrlInput, acceptOk, useGlobalDrop, type Uploaded } from './Upload'
import { Toasts, toast } from './toast'
import {
  createJob, getHealth, getJob, listJobs, listWorkflows, publishJob, streamJob, uploadFile,
  type Job, type Workflow,
} from './api'

type Tab = '/' | '/history' | '/settings' | '/status'
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

const NAV: { key: Tab; label: string; sub: string; icon: ReactNode }[] = [
  {
    key: '/', label: '處理稿件', sub: '進稿 → AI 流程 → 上稿',
    icon: <svg viewBox="0 0 24 24" fill="none"><path d="M5 4h10l4 4v12H5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="M14 4v5h5M8.5 13h7M8.5 16.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>,
  },
  {
    key: '/history', label: 'Jobs 歷史', sub: '所有執行紀錄',
    icon: <svg viewBox="0 0 24 24" fill="none"><path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.6" /></svg>,
  },
  {
    key: '/settings', label: '設定 / Prompt', sub: 'Agent 與押註版本',
    icon: <svg viewBox="0 0 24 24" fill="none"><path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 7a2 2 0 104 0 2 2 0 00-4 0zM6 17a2 2 0 104 0 2 2 0 00-4 0z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>,
  },
  {
    key: '/status', label: '建構進度', sub: '對照舊版 / 缺口 / 測試',
    icon: <svg viewBox="0 0 24 24" fill="none"><path d="M5 19V9M10 19V5M15 19v-6M20 19v-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>,
  },
]

export default function App() {
  const loc = useLocation()
  const navigate = useNavigate()
  const [sp, setSp] = useSearchParams()
  // 容忍尾斜線(伺服器/反代會把 /status 正規化成 /status/),否則重整後比對不到會退回首頁
  const path0 = (loc.pathname.replace(/\/+$/, '') || '/')
  const tab: Tab = (NAV.find((n) => n.key === path0)?.key ?? '/')
  const [health, setHealth] = useState<{ status: string } | null>(null)
  const [light, setLight] = pref('theme-light', false)
  const [collapsed, setCollapsed] = pref('side-collapsed', false)
  const [drawer, setDrawer] = useState(false)
  useEffect(() => {
    const check = () => getHealth().then(setHealth).catch(() => setHealth(null))
    check()
    const t = setInterval(check, 30_000)
    return () => clearInterval(t)
  }, [])
  useEffect(() => { document.documentElement.classList.toggle('light', light) }, [light])

  const cur = NAV.find((n) => n.key === tab)!
  const go = (k: Tab) => { navigate(k); setDrawer(false) }
  // 深連結:Jobs 歷史點開某筆 → /?job=ID(可分享/重整保留);RunPanel 接手後清掉參數
  const openJobId = sp.get('job') ? Number(sp.get('job')) : null

  return (
    <div className={`shell ${collapsed ? 'collapsed' : ''}`}>
      <Toasts />

      <aside className={`sidebar ${drawer ? 'open' : ''}`}>
        <div className="brand">
          <span className="brand-mark">BD</span>
          <span className="brand-text"><b>內容自動化</b><i>Content Platform</i></span>
        </div>
        <nav className="nav">
          {NAV.map((n) => (
            <button key={n.key} title={n.label} className={`nav-item ${tab === n.key ? 'on' : ''}`} onClick={() => go(n.key)}>
              <span className="nav-ic">{n.icon}</span>
              <span className="nav-txt"><span className="nav-label">{n.label}</span><span className="nav-sub">{n.sub}</span></span>
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <div className={`side-health ${health ? 'ok' : 'down'}`} title={health ? '後端運行中' : '後端未連線'}>
            <span className="dot" /><span className="side-foot-txt">{health ? '後端運行中' : '後端未連線'}</span>
          </div>
          <button className="theme-toggle" onClick={() => setLight(!light)} title="切換主題">
            <span className="side-foot-txt">{light ? '☀️ 亮色' : '🌙 暗色'}</span>
            <span className="muted side-foot-txt">切換</span>
            <span className="tt-ic">{light ? '☀️' : '🌙'}</span>
          </button>
          <button className="side-collapse" onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? '展開側邊欄' : '收合側邊欄'} aria-label="收合側邊欄">
            <svg viewBox="0 0 24 24" fill="none" className={collapsed ? 'flip' : ''}>
              <path d="M14 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="side-foot-txt">收合</span>
          </button>
        </div>
      </aside>
      {drawer && <div className="scrim" onClick={() => setDrawer(false)} />}

      <div className="main">
        <header className="topbar">
          <button className="hamburger" onClick={() => setDrawer(true)} aria-label="選單">
            <svg viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </button>
          <div className="page-head">
            <h1>{cur.label}</h1>
            <span className="page-sub">{cur.sub}</span>
          </div>
          <span className="spacer" />
          <span className={`pill ${health ? 'ok' : 'down'}`}><span className="dot" />{health ? 'online' : 'offline'}</span>
        </header>

        <div className="content">
          {/* RunPanel 永遠掛載(display 切換),這樣切到其他頁再回來,進行中的串流/接回狀態不會斷 */}
          <div style={{ display: tab === '/' ? 'block' : 'none' }}>
            <RunPanel openJobId={openJobId} onOpened={() => { if (sp.has('job')) { sp.delete('job'); setSp(sp, { replace: true }) } }} />
          </div>
          {tab === '/history' && <JobsPanel onOpen={(id) => navigate(`/?job=${id}`)} />}
          {tab === '/settings' && <ConfigPanel />}
          {tab === '/status' && <StatusPanel />}
        </div>
      </div>
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
  const [uploading, setUploading] = useState(false)
  const [atype, setAtype] = pref<ArticleType>('article-type', 'press-release')
  const [headerD, setHeaderD] = useState(() => TYPE_OPTS.find((o) => o.key === 'press-release')!.header)
  const [footerD, setFooterD] = useState('none')
  const [supplier, setSupplier] = useState('')
  const [fmt, setFmt] = pref('formatting', { headings: true, intro_quote: true, dropcap: true, related: true })
  const [running, setRunning] = useState(false)
  const [views, setViews] = useState<StageView[]>([])
  const [job, setJob] = useState<Job | null>(null)
  const [recent, setRecent] = useState<Job[]>([])
  const [watchingId, setWatchingId] = useState<number | null>(null)
  const [lastInput, setLastInput] = useState<Record<string, unknown>>({})
  const attachToken = useRef(0)
  const stageIdsRef = useRef<string[]>([]) // attach 在 mount 早期就會用到，避免 state race
  const submitLock = useRef(false) // 防連點重複建 job
  const progressRef = useRef<HTMLDivElement>(null)
  const jobCache = useRef(new Map<number, Job>()) // 已完成 job 不可變 → 快取，切換秒開
  const [loadingJob, setLoadingJob] = useState<number | null>(null)

  /** 上傳（點選/區內拖放/全頁拖放 共用同一條路）。 */
  async function handleFile(f: File) {
    if (!acceptOk(f.name)) { toast.err(`不支援的格式（支持 PDF、DOCX、MD）：${f.name}`); return }
    setImode('file')
    setUploading(true)
    try {
      const u = await uploadFile(f)
      setUploaded(u)
      toast.ok(`已上傳：${u.original_name}`)
    } catch (e) {
      toast.err('上傳失敗：' + String(e))
    } finally { setUploading(false) }
  }
  const dragOver = useGlobalDrop(handleFile)

  // 初始：先載 pipeline 定義（attach 依賴它），再接回進行中（B1）。
  // 任務列定時自刷新：初始請求若逾時（tunnel 壅塞）也能自癒；自動接回在「首次成功刷新」時檢查。
  const didAutoAttach = useRef(false)
  useEffect(() => {
    let stop = false
    async function ensureStageIds() {
      if (stageIdsRef.current.length) return
      try {
        const ws: Workflow[] = await listWorkflows()
        const ids = ws.find((w) => w.name === PIPELINE)?.stages ?? []
        stageIdsRef.current = ids
        setStageIds(ids)
      } catch { /* 下一輪再試 */ }
    }
    async function tick() {
      if (stop || document.hidden) return
      await ensureStageIds()
      const js = await refreshRecent()
      if (!didAutoAttach.current && js.length) {
        didAutoAttach.current = true
        const live = js.find((j) => j.status === 'running' || j.status === 'pending')
        if (live) { toast.info(`接回進行中的任務 #${live.id}`); attach(live.id) }
      }
    }
    tick()
    const t = setInterval(tick, 12_000)
    return () => { stop = true; clearInterval(t) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Jobs 頁點開某筆 / 分享連結 ?job=ID → 載入完整視圖（B3）。
  // 明確指定的 job 必須優先:標記 didAutoAttach,避免啟動時「自動接回進行中任務」搶走
  // 使用者點開/分享的那一筆(分享連結被覆蓋的 bug)。
  useEffect(() => {
    if (openJobId != null) { didAutoAttach.current = true; attach(openJobId); onOpened() }
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
    const base = { article_type: atype, header_disclaimer: headerD, footer_disclaimer: footerD, supplier: supplier.trim(), formatting: fmt }
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
      if (so) return { id, status: 'done' as const, output: so.output, elapsedMs: so.elapsed_ms ?? undefined, tokens: so.tokens ?? undefined }
      const kept = keep.get(id)
      if (kept?.status === 'done') return kept
      if (!marked && (j.status === 'running' || j.status === 'pending')) { marked = true; return { id, status: 'running' as const } }
      if (!marked && j.status === 'error') { marked = true; return { id, status: 'error' as const } }
      return { id, status: 'pending' as const }
    })
  }

  /** slim 輪詢結果套用到視圖（done_stages 摘要；輸出靠 SSE 帶，完成時再抓一次 full）。 */
  function applySlim(j: Job, keepPrefix: StageView[]) {
    const doneIds = new Set(j.done_stages ?? [])
    const keep = new Map(keepPrefix.map((v) => [v.id, v]))
    setViews((prev) => {
      let marked = false
      return prev.map((v) => {
        if (doneIds.has(v.id)) return v.status === 'done' ? v : { ...v, status: 'done' as const }
        if (keep.get(v.id)?.status === 'done' || v.status === 'done') return v
        if (!marked) {
          marked = true
          if (j.status === 'running' || j.status === 'pending') return v.status === 'running' ? v : { ...v, status: 'running' as const }
          if (j.status === 'error') return { ...v, status: 'error' as const }
        }
        return v
      })
    })
  }

  /** 統一的「掛上一個 job」：建立後 / 重新整理接回 / 歷史點開，全走這條（B1/B2/B3 共用）。
   *  輪詢一律 slim（避免大 payload 在手機/tunnel 上塞死互動），輸出靠 SSE + 完成時一次 full。 */
  async function attach(id: number, keepPrefix: StageView[] = [], placeholderSet = false) {
    const token = ++attachToken.current
    setWatchingId(id)
    setJob(null)
    setRunning(true)
    // ⚡ 快取命中（已完成 job 不可變）→ 零網路、秒開
    const cached = jobCache.current.get(id)
    if (cached) {
      setLastInput(cached.input)
      setViews(viewsFromJob(cached, keepPrefix))
      setJob(cached)
      setRunning(false)
      return
    }
    if (!placeholderSet) { setViews([]); setLoadingJob(id) } // 骨架屏：載入有感
    const ac = new AbortController()
    try {
      const first = await getJob(id, false).catch(() => null) // slim：快
      if (!first) { toast.err(`載入 job #${id} 失敗`); return }
      if (attachToken.current !== token) return
      setLastInput(first.input)
      if (first.status === 'done' || first.status === 'error') {
        const full = await getJob(id, true).catch(() => null)
        if (full && attachToken.current === token) {
          jobCache.current.set(id, full)
          setViews(viewsFromJob(full, keepPrefix)); setJob(full)
        }
        return
      }
      if (!placeholderSet) setViews(viewsFromJob({ ...first, stages: [] }, keepPrefix))
      applySlim(first, keepPrefix)

      // SSE：即時逐階段（含輸出）
      streamJob(id, (ev, data) => {
        if (attachToken.current !== token) return
        const d = rec(data)
        if (ev === 'stage') {
          setViews((prev) => prev.map((v) => v.id === d.id
            ? { ...v, status: d.status as StageView['status'], output: (d.output as Record<string, unknown>) ?? v.output, elapsedMs: (d.elapsed_ms as number) ?? v.elapsedMs, tokens: (d.tokens as number) ?? v.tokens }
            : v))
        }
      }, ac.signal).catch(() => {})

      // slim 輪詢保底
      for (let i = 0; i < 400; i++) {
        await new Promise((r) => setTimeout(r, 2000))
        if (attachToken.current !== token) return
        const j = await getJob(id, false).catch(() => null)
        if (!j) continue
        applySlim(j, keepPrefix)
        if (j.status === 'done' || j.status === 'error') {
          const full = await getJob(id, true).catch(() => null)
          if (!full || attachToken.current !== token) return
          jobCache.current.set(id, full)
          setViews(viewsFromJob(full, keepPrefix))
          setJob(full)
          if (full.status === 'done') toast.ok(`任務 #${id} 完成`)
          else toast.err(`任務 #${id} 失敗：${full.error ?? ''}`)
          if (mode === 'auto' && full.status === 'done' && rec(full.result).wordpress) {
            try {
              const out = await publishJob(full.id, pubStatus)
              toast.ok(`自動發布成功（${out.status}）`)
            } catch (e) { toast.err('自動發布失敗：' + String(e)) }
          }
          return
        }
      }
      toast.err('處理逾時（10 分鐘），稍後可從執行列接回')
    } finally {
      if (attachToken.current === token) { setRunning(false); setLoadingJob(null) }
      ac.abort()
      refreshRecent()
    }
  }

  async function execute(inputObj: Record<string, unknown>, fromStage?: string) {
    if (submitLock.current) return // 防連點：建立期間再點直接忽略
    submitLock.current = true
    const startIdx = fromStage ? stageIds.indexOf(fromStage) : 0
    const keepPrefix = fromStage ? views.slice(0, startIdx) : []
    // ⚡ 點下去「立刻」有反應：鎖按鈕 + 渲染骨架，不等任何網路往返
    setRunning(true)
    setJob(null)
    setLastInput(inputObj)
    setViews(() => {
      const byId = new Map(keepPrefix.map((v) => [v.id, v]))
      return stageIdsRef.current.map((sid, i) =>
        i < startIdx ? byId.get(sid) ?? { id: sid, status: 'pending' as const }
          : i === startIdx ? { id: sid, status: 'running' as const }
            : { id: sid, status: 'pending' as const })
    })
    if (window.innerWidth < 900) progressRef.current?.scrollIntoView({ behavior: 'smooth' })
    try {
      const { id } = await createJob(PIPELINE, inputObj, fromStage)
      toast.info(fromStage ? `從「${fromStage}」重跑（#${id}）` : `開始處理（#${id}）`)
      refreshRecent()
      await attach(id, keepPrefix, true)
    } catch (e) {
      toast.err('啟動失敗：' + String(e))
      setRunning(false)
      setViews([])
    } finally { submitLock.current = false }
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
      {dragOver && <div className="drop-overlay"><div>📄 放開以上傳檔案</div></div>}
      <div className="panel">
        <h2>1. 進稿</h2>
        <div className="seg">
          <button className={imode === 'file' ? 'on' : ''} onClick={() => setImode('file')}>上傳文件</button>
          <button className={imode === 'url' ? 'on' : ''} onClick={() => setImode('url')}>輸入連結</button>
        </div>
        <div style={{ marginTop: 12 }}>
          {imode === 'file'
            ? <FileDrop uploaded={uploaded} uploading={uploading} onFile={handleFile} onReset={() => setUploaded(null)} />
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

        <h2 style={{ marginTop: 22 }}>3. 進階組稿</h2>
        <div className="fmt-grid">
          {([
            ['headings', '標題層級正規化', 'h2→h3 符合上稿層級'],
            ['intro_quote', '引言區塊', '用摘要生成 intro_quote'],
            ['dropcap', '首字放大 Dropcap', '正文首字放大'],
            ['related', 'TG Banner + 相關閱讀', '文末官方橫幅與相關報導'],
          ] as const).map(([k, label, desc]) => (
            <button key={k} type="button" className={`fmt-toggle ${fmt[k] ? 'on' : ''}`}
              onClick={() => setFmt({ ...fmt, [k]: !fmt[k] })}>
              <span className="fmt-check">{fmt[k] ? '✓' : ''}</span>
              <span className="fmt-txt"><b>{label}</b><i>{desc}</i></span>
            </button>
          ))}
        </div>
        <p className="hint">套用 BlockTempo 上稿規範到「上稿內文」;相關閱讀為預設連結,可在審稿時於編輯器替換。</p>

        <h2 style={{ marginTop: 22 }}>4. 處理模式</h2>
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

        <button className="primary" disabled={running || uploading} onClick={() => { const i = gatherInput(); if (i) execute(i) }}>
          {uploading ? '檔案上傳中...' : running ? '處理中...' : '開始處理'}
        </button>
        <p className="muted" style={{ marginTop: 10, fontSize: 12 }}>
          {running ? '可以放心離開或重新整理——回來會自動接上進度。' : `完整流程 ${stageIds.length || 7} 階段，每一步即時更新、可展開查看、可從任一步重跑。`}
        </p>
      </div>

      <div className="panel" ref={progressRef}>
        <div className="row">
          <h2 style={{ margin: 0 }}>處理進度與結果</h2>
          <span className="spacer" />
        </div>
        {recent.length > 0 && (
          <div className="runs-strip">
            {recent.map((j) => {
              const st = j.status === 'running' || j.status === 'pending' ? '處理中' : j.status === 'done' ? '完成' : '失敗'
              return (
                <button key={j.id} className={`run-item ${j.id === watchingId ? 'cur' : ''}`} onClick={() => attach(j.id)}>
                  <span className={`dot2 ${j.status}`} />
                  <span className="ri-main">
                    <span className="ri-title">#{j.id}{j.start_stage ? ' ↻' : ''} {jobSource(j).slice(0, 18)}</span>
                    <span className="ri-sub">{st} · {relTime(j.created_at)}</span>
                  </span>
                </button>
              )
            })}
          </div>
        )}
        {loadingJob != null && views.length === 0 && (
          <div className="skeleton-list">
            <div className="muted" style={{ marginBottom: 8 }}>載入任務 #{loadingJob} …</div>
            {[0, 1, 2, 3, 4].map((i) => <div key={i} className="skel" style={{ animationDelay: `${i * 0.08}s` }} />)}
          </div>
        )}
        {views.length === 0 && loadingJob == null
          ? <p className="muted" style={{ marginTop: 10 }}>選好進稿後按「開始處理」。進行中或歷史任務可從上方任務列點開。</p>
          : views.length > 0 && <StageList stages={views} originalInput={lastInput} meta={meta} totalMs={totalMs}
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
      <div className="table-wrap"><table>
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
      </table></div>
      <p className="hint" style={{ marginTop: 8 }}>點任一筆回到「處理稿件」載入完整視圖（可查看每階段、重跑、發布）。</p>
    </div>
  )
}
