import { useEffect, useMemo, useRef, useState, Fragment, type DragEvent } from 'react'
import {
  addTaskComment, createColumn, createContract, createTask, deleteContract, deleteTask,
  getBoard, getTask, notifyBd, runTask, setTaskUrls, streamBoard, streamJob, updateTask,
  type Board, type BoardComment, type Task, type TaskDetail,
} from './api'
import { STAGE_LABELS, weightedProgress } from './Stages'
import { toast } from './toast'

const errMsg = (e: unknown): string => (e instanceof Error ? e.message : String(e))

const ARTICLE_STAGES = ['extract', 'content_ai', 'pr_writer', 'format_conversion', 'copy_editing', 'cover_image', 'article_formatting']
type SView = { id: string; status: 'pending' | 'running' | 'done' | 'error' }
const buildStages = (done: string[], current: string | null): SView[] =>
  ARTICLE_STAGES.map((id) => ({ id, status: done.includes(id) ? 'done' : id === current ? 'running' : 'pending' }))

const ITEM_TYPES = ['廣編稿', '官網快訊', '新聞稿', '常規', '專訪', '深度', 'Banner']
const PIPELINE_LABEL: Record<string, string> = { A: 'A · 廣編/快訊/新聞', B: 'B · 軟文', C: 'C · Banner' }
const ROLES = { bd: ['Alex', 'Jessica'], dm: ['Meg', 'Kessy'], editor: ['Joe', 'Luci', '胖丁'] }
const PRIORITY: Record<string, { label: string; cls: string; rank: number }> = {
  urgent: { label: '🔴 緊急', cls: 'p-urgent', rank: 0 }, high: { label: '🟠 高', cls: 'p-high', rank: 1 },
  normal: { label: '🟢 一般', cls: 'p-normal', rank: 2 }, low: { label: '⚪ 低', cls: 'p-low', rank: 3 },
}
const VIEWS = [{ k: 'board', label: '看板' }, { k: 'list', label: '清單' }, { k: 'table', label: '表格' }] as const
type View = (typeof VIEWS)[number]['k']
const GROUPS = [
  { k: 'stage', label: '階段', field: 'column_id' }, { k: 'pipeline', label: 'Pipeline', field: 'pipeline' },
  { k: 'item_type', label: '品項', field: 'item_type' }, { k: 'client', label: '客戶', field: 'client' },
  { k: 'dm_owner', label: 'DM', field: 'dm_owner' }, { k: 'bd_owner', label: 'BD', field: 'bd_owner' },
  { k: 'editor', label: '主審', field: 'editor' }, { k: 'priority', label: '優先級', field: 'priority' },
  { k: 'contract', label: '合約', field: 'contract_id' }, { k: 'none', label: '不分組', field: '' },
] as const
type GroupKey = (typeof GROUPS)[number]['k']

function whoami(): [string, (v: string) => void] {
  const [v, setV] = useState(() => localStorage.getItem('board:whoami') || '')
  return [v, (nv: string) => { setV(nv); localStorage.setItem('board:whoami', nv) }]
}
function relTime(iso: string): string {
  const t = new Date(iso + (iso.endsWith('Z') ? '' : 'Z')).getTime()
  const s = Math.max(0, (Date.now() - t) / 1000)
  if (s < 60) return `${Math.floor(s)} 秒前`
  if (s < 3600) return `${Math.floor(s / 60)} 分前`
  if (s < 86400) return `${Math.floor(s / 3600)} 小時前`
  return `${Math.floor(s / 86400)} 天前`
}
function dueOf(t: Task): string | null { return t.publish_deadline || t.due_date || t.draft_deadline }
function dueLabel(iso: string | null): { txt: string; cls: string } | null {
  if (!iso) return null
  const days = Math.floor((new Date(iso).getTime() - Date.now()) / 86400000)
  if (days < 0) return { txt: `逾期 ${-days} 天`, cls: 'due-over' }
  if (days === 0) return { txt: '今天', cls: 'due-soon' }
  if (days <= 2) return { txt: `${days} 天後`, cls: 'due-soon' }
  return { txt: new Date(iso).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' }), cls: '' }
}
const fieldVal = (t: Task, f: string): string => {
  if (f === 'column_id') return String(t.column_id)
  if (f === 'contract_id') return t.contract_id ? String(t.contract_id) : ''
  return String((t as unknown as Record<string, unknown>)[f] ?? '')
}

// ── 進行中文章卡:訂閱 job SSE 即時更新管線進度 ──
function LiveProgress({ jobId, initialDone, initialCurrent }: { jobId: number; initialDone: string[]; initialCurrent: string | null }) {
  const [done, setDone] = useState<string[]>(initialDone)
  const [current, setCurrent] = useState<string | null>(initialCurrent)
  useEffect(() => {
    const ac = new AbortController()
    streamJob(jobId, (ev, data) => {
      const d = (data ?? {}) as Record<string, unknown>
      if (ev === 'stage' && d.id) {
        if (d.status === 'running') setCurrent(String(d.id))
        else if (d.status === 'done') { setDone((p) => p.includes(String(d.id)) ? p : [...p, String(d.id)]); setCurrent(null) }
      }
    }, ac.signal).catch(() => {})
    return () => ac.abort()
  }, [jobId])
  const pct = weightedProgress(buildStages(done, current))
  const label = current ? (STAGE_LABELS[current] ?? current) : `${done.length}/${ARTICLE_STAGES.length} 階段`
  return (
    <div className="tc-prog">
      <div className="tc-prog-top"><span className="tc-prog-spin" /> {label} · {pct}%</div>
      <div className="tc-bar"><div className="tc-fill" style={{ width: `${pct}%` }} /></div>
    </div>
  )
}
function JobBadge({ task }: { task: Task }) {
  const j = task.job
  if (!j) return null
  if (j.status === 'running' || j.status === 'pending') return <LiveProgress jobId={j.job_id} initialDone={j.done_stages} initialCurrent={j.current_stage} />
  if (j.status === 'error') return <div className="tc-job err">⚠️ AI 轉稿失敗</div>
  if (j.status === 'done') return <div className="tc-job ok">✓ AI 轉稿完成</div>
  return null
}

function QuotaPill({ task }: { task: Task }) {
  const cu = task.contract?.category_usage
  if (!cu) return null
  const low = cu.remaining <= 0
  return <span className={`quota-pill ${low ? 'low' : ''}`} title="合約剩餘額度">{task.contract?.category} 餘 {cu.remaining}/{cu.total}</span>
}

// ════════════════════════ 主面板 ════════════════════════
export function BoardPanel({ onOpenJob }: { onOpenJob: (jobId: number) => void }) {
  const [board, setBoard] = useState<Board | null>(null)
  const [me, setMe] = whoami()
  const [view, setView] = useState<View>(() => (localStorage.getItem('board:view') as View) || 'board')
  const [groupBy, setGroupBy] = useState<GroupKey>(() => (localStorage.getItem('board:group') as GroupKey) || 'stage')
  const [filters, setFilters] = useState({ pipeline: '', item_type: '', client: '', dm_owner: '', editor: '', contract_id: '', q: '', overdue: false })
  const [openTaskId, setOpenTaskId] = useState<number | null>(null)
  const [creating, setCreating] = useState<{ column_id?: number } | null>(null)
  const [showContracts, setShowContracts] = useState(false)
  const dragRef = useRef<Task | null>(null)
  const [dropIndicator, setDropIndicator] = useState<{ columnKey: string; taskId: number | 'empty' | 'bottom'; position: 'top' | 'bottom'; index?: number } | null>(null)


  const load = () => getBoard().then(setBoard).catch((e) => toast.err(errMsg(e)))
  useEffect(() => { load() }, [])
  useEffect(() => { localStorage.setItem('board:view', view) }, [view])
  useEffect(() => { localStorage.setItem('board:group', groupBy) }, [groupBy])
  useEffect(() => {
    const ac = new AbortController()
    streamBoard((ev, data) => {
      const d = (data ?? {}) as Record<string, unknown>
      setBoard((b) => {
        if (!b) return b
        if (ev === 'task.created' || ev === 'task.updated') {
          const t = d as unknown as Task
          return { ...b, tasks: [...b.tasks.filter((x) => x.id !== t.id), t] }
        }
        if (ev === 'task.deleted') return { ...b, tasks: b.tasks.filter((x) => x.id !== d.id) }
        if (ev === 'column.changed' || ev === 'contract.changed') { load(); return b }
        return b
      })
    }, ac.signal)
    return () => ac.abort()
  }, [])

  const filtered = useMemo(() => {
    if (!board) return []
    const q = filters.q.trim().toLowerCase()
    return board.tasks.filter((t) => {
      if (filters.pipeline && t.pipeline !== filters.pipeline) return false
      if (filters.item_type && t.item_type !== filters.item_type) return false
      if (filters.client && t.client !== filters.client) return false
      if (filters.dm_owner && t.dm_owner !== filters.dm_owner) return false
      if (filters.editor && t.editor !== filters.editor) return false
      if (filters.contract_id && String(t.contract_id ?? '') !== filters.contract_id) return false
      if (filters.overdue) { const dl = dueOf(t); if (!dl || new Date(dl).getTime() >= Date.now()) return false }
      if (q && !`${t.title} ${t.client} ${t.supplier} ${t.bd_owner} ${t.dm_owner} ${t.editor} ${t.item_type}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [board, filters])

  if (!board) return <div className="panel"><p className="muted">載入看板中…</p></div>

  const clients = [...new Set(board.tasks.map((t) => t.client).filter(Boolean))].sort()

  // 分組:回傳 [{key,label,patch,match,meta}]
  const groupDefs = (() => {
    const g = groupBy
    if (g === 'stage') return [...board.columns].sort((a, b) => a.position - b.position).map((c) => ({
      key: `c${c.id}`, label: c.name, col: c, patch: (pos: number) => ({ column_id: c.id, position: pos }),
      match: (t: Task) => t.column_id === c.id, draggable: true,
    }))
    if (g === 'priority') return Object.keys(PRIORITY).map((p) => ({
      key: p, label: PRIORITY[p].label, col: null, patch: () => ({ priority: p as Task['priority'] }),
      match: (t: Task) => t.priority === p, draggable: true,
    }))
    if (g === 'contract') return [...board.contracts.map((ct) => ({
      key: `ct${ct.id}`, label: `${ct.client} · ${ct.name || '合約'}`, col: null, patch: () => ({ contract_id: ct.id }),
      match: (t: Task) => t.contract_id === ct.id, draggable: true,
    })), { key: 'none', label: '未綁約', col: null, patch: () => ({ contract_id: null }), match: (t: Task) => !t.contract_id, draggable: true }]
    if (g === 'pipeline') return ['A', 'B', 'C', ''].filter((v) => board.tasks.some((t) => t.pipeline === v)).map((v) => ({
      key: v || 'none', label: v ? PIPELINE_LABEL[v] : '未分類', col: null, patch: () => ({}),
      match: (t: Task) => t.pipeline === v, draggable: false,
    }))
    if (g === 'none') return [{ key: 'all', label: '全部稿件', col: null, patch: () => ({}), match: () => true, draggable: false }]
    // client / dm_owner / bd_owner / editor / item_type — 動態值
    const field = g
    const vals = [...new Set(board.tasks.map((t) => fieldVal(t, field)))].sort()
    if (!vals.includes('')) vals.push('')
    return vals.map((v) => ({
      key: v || 'none', label: v || '未指定', col: null, patch: () => ({ [field]: v } as Partial<Task>),
      match: (t: Task) => fieldVal(t, field) === v, draggable: true,
    }))
  })()

  function applyLocal(taskId: number, patch: Partial<Task>) {
    setBoard((b) => b ? { ...b, tasks: b.tasks.map((t) => t.id === taskId ? { ...t, ...patch } : t) } : b)
  }
  function dropInGroup(grp: typeof groupDefs[number], targetPos?: number) {
    const t = dragRef.current; dragRef.current = null
    setDropIndicator(null)
    if (!t || !grp.draggable) return
    const finalPos = targetPos !== undefined ? targetPos : (Math.max(0, ...filtered.filter(grp.match).map((x) => x.position)) + 1)
    const basePatch = grp.patch(finalPos)
    const patch = { ...basePatch, position: finalPos }
    if (!Object.keys(patch).length) return
    applyLocal(t.id, patch)
    updateTask(t.id, { ...patch, actor: me }).catch((e) => { toast.err(errMsg(e)); load() })
  }

  const sortByPos = (a: Task, b: Task) => a.position - b.position

  return (
    <div className="board-wrap">
      <div className="board-toolbar">
        <div className="bt-left">
          <div className="seg view-seg">
            {VIEWS.map((v) => <button key={v.k} className={view === v.k ? 'on' : ''} onClick={() => setView(v.k)}>{v.label}</button>)}
          </div>
          <label className="bt-group">分組
            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupKey)}>
              {GROUPS.map((g) => <option key={g.k} value={g.k}>{g.label}</option>)}
            </select>
          </label>
        </div>
        <div className="bt-right">
          <button className="ghost sm" onClick={() => setShowContracts(true)}>📑 合約 / 額度</button>
          <button className="primary sm" onClick={() => setCreating({})}>＋ 新增稿件</button>
          <label className="whoami">你是<input value={me} placeholder="名字" onChange={(e) => setMe(e.target.value)} /></label>
        </div>
      </div>

      <FilterBar board={board} clients={clients} filters={filters} setFilters={setFilters} count={filtered.length} total={board.tasks.length} />

      {view === 'board' && (
        <div className="board-cols">
          <style>{`
            .drop-indicator {
              height: 4px;
              background: var(--accent);
              border-radius: 2px;
              margin: 6px 0;
              box-shadow: 0 0 8px var(--accent);
              transition: all 0.15s ease;
            }
            .board-col.drag-over {
              border-color: var(--accent-2);
              background: color-mix(in srgb, var(--accent) 2.5%, var(--panel-2));
            }
          `}</style>
          {groupDefs.map((grp) => {
            const items = filtered.filter(grp.match).sort(sortByPos)
            const wip = grp.col?.wip_limit
            const isColDragOver = dropIndicator?.columnKey === grp.key

            return (
              <div key={grp.key} className={`board-col kind-${grp.col?.kind ?? 'custom'} ${isColDragOver ? 'drag-over' : ''}`}
                onDragOver={(e) => {
                  if (!grp.draggable) return
                  e.preventDefault()
                  if (items.length === 0) {
                    setDropIndicator({ columnKey: grp.key, taskId: 'empty', position: 'bottom', index: 0 })
                  }
                }}
                onDragLeave={() => {
                  // Only clear if leaving to outside
                }}
                onDrop={() => {
                  if (!grp.draggable) return
                  const dragTask = dragRef.current
                  if (!dragTask) return

                  if (dropIndicator && dropIndicator.columnKey === grp.key) {
                    if (dropIndicator.taskId === 'empty') {
                      dropInGroup(grp, 1.0)
                    } else if (dropIndicator.taskId === 'bottom' || dropIndicator.index === undefined) {
                      dropInGroup(grp)
                    } else {
                      const targetIdx = dropIndicator.index
                      const columnItems = filtered.filter(grp.match).sort(sortByPos)
                      
                      let newPos = 1.0
                      if (dropIndicator.position === 'top') {
                        if (targetIdx === 0) {
                          newPos = columnItems[0].position - 1
                        } else {
                          const prevTask = columnItems[targetIdx - 1]
                          const currTask = columnItems[targetIdx]
                          newPos = (prevTask.position + currTask.position) / 2
                        }
                      } else {
                        if (targetIdx === columnItems.length - 1) {
                          newPos = columnItems[columnItems.length - 1].position + 1
                        } else {
                          const currTask = columnItems[targetIdx]
                          const nextTask = columnItems[targetIdx + 1]
                          newPos = (currTask.position + nextTask.position) / 2
                        }
                      }
                      dropInGroup(grp, newPos)
                    }
                  } else {
                    dropInGroup(grp)
                  }
                  setDropIndicator(null)
                }}>
                <div className="col-head">
                  <span className="col-dot" /><span className="col-name">{grp.label}</span>
                  <span className={`col-count ${wip != null && items.length > wip ? 'over' : ''}`}>{items.length}{wip != null ? `/${wip}` : ''}</span>
                </div>
                <div className="col-body"
                  onDragOver={(e) => {
                    if (!grp.draggable) return
                    e.preventDefault()
                  }}
                  onDragLeave={() => {
                    // Let onDragEnd handle indicator cleanup
                  }}
                >
                  {items.length === 0 && dropIndicator?.columnKey === grp.key && dropIndicator?.taskId === 'empty' && (
                    <div className="drop-indicator" />
                  )}
                  {items.map((t, idx) => (
                    <Fragment key={t.id}>
                      {dropIndicator?.columnKey === grp.key && dropIndicator?.taskId === t.id && dropIndicator?.position === 'top' && (
                        <div className="drop-indicator" />
                      )}
                      <TaskCard task={t} onOpen={() => setOpenTaskId(t.id)}
                        draggable={grp.draggable}
                        onDragStart={() => { dragRef.current = t }}
                        onDragEnd={() => setDropIndicator(null)}
                        onDragOver={(e) => {
                          if (!grp.draggable) return
                          e.preventDefault()
                          e.stopPropagation()
                          const rect = e.currentTarget.getBoundingClientRect()
                          const relativeY = e.clientY - rect.top
                          const isTop = relativeY < rect.height / 2
                          setDropIndicator({
                            columnKey: grp.key,
                            taskId: t.id,
                            position: isTop ? 'top' : 'bottom',
                            index: idx
                          })
                        }}
                      />
                      {dropIndicator?.columnKey === grp.key && dropIndicator?.taskId === t.id && dropIndicator?.position === 'bottom' && (
                        <div className="drop-indicator" />
                      )}
                    </Fragment>
                  ))}
                  {groupBy === 'stage' && grp.col && <button className="add-card-btn" onClick={() => setCreating({ column_id: grp.col!.id })}>＋ 新增</button>}
                </div>
              </div>
            )
          })}
          {groupBy === 'stage' && <AddColumn onDone={load} />}
        </div>
      )}

      {view === 'list' && <ListView groupDefs={groupDefs} filtered={filtered} board={board} onOpen={setOpenTaskId} />}
      {view === 'table' && <TableView groupDefs={groupDefs} filtered={filtered} groupBy={groupBy} board={board} onOpen={setOpenTaskId} />}

      {openTaskId != null && (
        <TaskDrawer taskId={openTaskId} me={me} board={board} onClose={() => setOpenTaskId(null)} onChanged={load} onOpenJob={onOpenJob} />
      )}
      {creating && <CreateTaskModal board={board} me={me} initialColumn={creating.column_id} onClose={() => setCreating(null)} onCreated={() => { setCreating(null) }} />}
      {showContracts && <ContractsModal board={board} onClose={() => setShowContracts(false)} onChanged={load} />}
    </div>
  )
}

// ──────────────────────── Filter Bar ────────────────────────
function FilterBar({ board, clients, filters, setFilters, count, total }: {
  board: Board; clients: string[]; filters: Record<string, string | boolean>
  setFilters: (f: never) => void; count: number; total: number
}) {
  const set = (k: string, v: string | boolean) => setFilters({ ...filters, [k]: v } as never)
  const active = Object.entries(filters).some(([k, v]) => k !== 'q' ? Boolean(v) : Boolean(v))
  return (
    <div className="filter-bar">
      <input className="flt-search" placeholder="🔍 搜尋稿件/客戶/負責人…" value={filters.q as string} onChange={(e) => set('q', e.target.value)} />
      <select value={filters.pipeline as string} onChange={(e) => set('pipeline', e.target.value)}>
        <option value="">全部 Pipeline</option><option value="A">A 廣編/快訊/新聞</option><option value="B">B 軟文</option><option value="C">C Banner</option>
      </select>
      <select value={filters.item_type as string} onChange={(e) => set('item_type', e.target.value)}>
        <option value="">全部品項</option>{ITEM_TYPES.map((it) => <option key={it} value={it}>{it}</option>)}
      </select>
      <select value={filters.client as string} onChange={(e) => set('client', e.target.value)}>
        <option value="">全部客戶</option>{clients.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <select value={filters.dm_owner as string} onChange={(e) => set('dm_owner', e.target.value)}>
        <option value="">全部 DM</option>{ROLES.dm.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
      <select value={filters.editor as string} onChange={(e) => set('editor', e.target.value)}>
        <option value="">全部主審</option>{ROLES.editor.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
      <select value={filters.contract_id as string} onChange={(e) => set('contract_id', e.target.value)}>
        <option value="">全部合約</option>{board.contracts.map((c) => <option key={c.id} value={String(c.id)}>{c.client} · {c.name || '合約'}</option>)}
      </select>
      <label className="flt-chk"><input type="checkbox" checked={filters.overdue as boolean} onChange={(e) => set('overdue', e.target.checked)} /> 只看逾期</label>
      {active && <button className="link" onClick={() => setFilters({ pipeline: '', item_type: '', client: '', dm_owner: '', editor: '', contract_id: '', q: '', overdue: false } as never)}>清除</button>}
      <span className="flt-count muted">{count}/{total}</span>
    </div>
  )
}

// ──────────────────────── 卡片 ────────────────────────
function TaskCard({ task, onOpen, draggable, onDragStart, onDragEnd, onDragOver }: { task: Task; onOpen: () => void; draggable: boolean; onDragStart: () => void; onDragEnd?: () => void; onDragOver?: (e: DragEvent) => void }) {
  const p = PRIORITY[task.priority] ?? PRIORITY.normal
  const due = dueLabel(dueOf(task))
  return (
    <div className="task-card" draggable={draggable}
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart() }}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onClick={onOpen}>
      <div className="tc-top">
        {task.client && <span className="tc-client">{task.client}</span>}
        {task.item_type && <span className={`tc-type ${task.pipeline === 'A' ? 'article' : ''}`}>{task.item_type}</span>}
        <span className={`tc-pri ${p.cls}`}>{p.label}</span>
      </div>
      <div className="tc-title">{task.title}</div>
      <QuotaPill task={task} />
      <JobBadge task={task} />
      <div className="tc-foot">
        <span className="tc-roles">
          {task.status_label && <span title="細狀態" style={{ color: 'var(--accent)', fontWeight: 600 }}>◉ {task.status_label}</span>}
          {task.dm_owner && <span title="DM">DM:{task.dm_owner}</span>}
          {task.editor && <span title="主審">主審:{task.editor}</span>}
          {!task.dm_owner && !task.editor && task.bd_owner && <span title="BD">BD:{task.bd_owner}</span>}
        </span>
        {due && <span className={`tc-due ${due.cls}`}>⏰ {due.txt}</span>}
      </div>
    </div>
  )
}

// ──────────────────────── List View ────────────────────────
function ListView({ groupDefs, filtered, board, onOpen }: {
  groupDefs: { key: string; label: string; match: (t: Task) => boolean }[]
  filtered: Task[]; board: Board; onOpen: (id: number) => void
}) {
  const colName = (id: number) => board.columns.find((c) => c.id === id)?.name ?? ''
  return (
    <div className="list-view">
      {groupDefs.map((grp) => {
        const items = filtered.filter(grp.match)
        if (!items.length) return null
        return (
          <details key={grp.key} open className="list-group">
            <summary>{grp.label} <span className="muted">{items.length}</span></summary>
            <div className="list-rows">
              {items.map((t) => {
                const due = dueLabel(dueOf(t))
                return (
                  <div key={t.id} className="list-row" onClick={() => onOpen(t.id)}>
                    <span className={`lr-pri ${(PRIORITY[t.priority] ?? PRIORITY.normal).cls}`} />
                    <span className="lr-title">{t.title}</span>
                    {t.client && <span className="lr-tag">{t.client}</span>}
                    {t.item_type && <span className="lr-tag dim">{t.item_type}</span>}
                    <span className="lr-stage">{colName(t.column_id)}</span>
                    {t.dm_owner && <span className="lr-owner">DM:{t.dm_owner}</span>}
                    {t.editor && <span className="lr-owner">審:{t.editor}</span>}
                    {t.job?.status === 'running' && <span className="lr-run">● AI 轉稿中</span>}
                    {due && <span className={`lr-due ${due.cls}`}>{due.txt}</span>}
                  </div>
                )
              })}
            </div>
          </details>
        )
      })}
    </div>
  )
}

// ──────────────────────── Table View ────────────────────────
const TABLE_COLS: { k: string; label: string; get: (t: Task, b: Board) => string }[] = [
  { k: 'title', label: '稿件', get: (t) => t.title },
  { k: 'client', label: '客戶', get: (t) => t.client },
  { k: 'pipeline', label: 'Pipeline', get: (t) => t.pipeline },
  { k: 'item_type', label: '品項', get: (t) => t.item_type },
  { k: 'column_id', label: '階段', get: (t, b) => b.columns.find((c) => c.id === t.column_id)?.name ?? '' },
  { k: 'dm_owner', label: 'DM', get: (t) => t.dm_owner },
  { k: 'editor', label: '主審', get: (t) => t.editor },
  { k: 'bd_owner', label: 'BD', get: (t) => t.bd_owner },
  { k: 'priority', label: '優先', get: (t) => t.priority },
  { k: 'due', label: '到期', get: (t) => dueOf(t)?.slice(0, 10) ?? '' },
]
function TableView({ groupDefs, filtered, groupBy, board, onOpen }: {
  groupDefs: { key: string; label: string; match: (t: Task) => boolean }[]
  filtered: Task[]; groupBy: GroupKey; board: Board; onOpen: (id: number) => void
}) {
  const [sort, setSort] = useState<{ k: string; dir: 1 | -1 }>({ k: 'title', dir: 1 })
  const sortRows = (rows: Task[]) => [...rows].sort((a, b) => {
    const col = TABLE_COLS.find((c) => c.k === sort.k)!
    return col.get(a, board).localeCompare(col.get(b, board), 'zh-Hant') * sort.dir
  })
  const clickSort = (k: string) => setSort((s) => ({ k, dir: s.k === k ? (s.dir === 1 ? -1 : 1) : 1 }))
  const grouped = groupBy !== 'none'
  return (
    <div className="table-view">
      <table className="dlv-table">
        <thead>
          <tr>{TABLE_COLS.map((c) => (
            <th key={c.k} onClick={() => clickSort(c.k)} className={sort.k === c.k ? 'sorted' : ''}>
              {c.label}{sort.k === c.k ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}
            </th>
          ))}</tr>
        </thead>
        <tbody>
          {groupDefs.map((grp) => {
            const items = sortRows(filtered.filter(grp.match))
            if (!items.length) return null
            return (
              <>
                {grouped && <tr key={`g${grp.key}`} className="tbl-group"><td colSpan={TABLE_COLS.length}>{grp.label} <span className="muted">{items.length}</span></td></tr>}
                {items.map((t) => (
                  <tr key={t.id} onClick={() => onOpen(t.id)} className="tbl-row">
                    {TABLE_COLS.map((c) => (
                      <td key={c.k} className={c.k === 'title' ? 'td-title' : ''}>
                        {c.k === 'priority' ? (PRIORITY[t.priority] ?? PRIORITY.normal).label
                          : c.k === 'pipeline' && t.pipeline ? t.pipeline
                            : c.get(t, board) || <span className="muted">—</span>}
                        {c.k === 'title' && t.job?.status === 'running' && <span className="lr-run"> ● AI</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function AddColumn({ onDone }: { onDone: () => void }) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  async function submit() { if (!name.trim()) return; try { await createColumn(name.trim()); setName(''); setAdding(false); onDone() } catch (e) { toast.err(errMsg(e)) } }
  return (
    <div className="add-col">
      {adding ? (
        <div className="create-card">
          <input autoFocus placeholder="欄位名稱…" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setAdding(false) }} />
          <div className="cc-actions"><button className="primary sm" onClick={submit}>新增</button><button className="link" onClick={() => setAdding(false)}>取消</button></div>
        </div>
      ) : <button className="add-col-btn" onClick={() => setAdding(true)}>＋ 新增欄位</button>}
    </div>
  )
}

// ──────────────────────── 新增稿件 Modal ────────────────────────
function CreateTaskModal({ board, me, initialColumn, onClose, onCreated }: {
  board: Board; me: string; initialColumn?: number; onClose: () => void; onCreated: () => void
}) {
  const [f, setF] = useState({
    title: '', client: '', item_type: '', bd_owner: '', dm_owner: me && ROLES.dm.includes(me) ? me : '', editor: '',
    contract_id: '', priority: 'normal', source_url: '', source_file: '', supplier: '', notes: '',
  })
  const [busy, setBusy] = useState(false)
  const set = (k: string, v: string) => setF({ ...f, [k]: v })
  async function submit() {
    if (!f.title.trim()) { toast.err('請填稿件標題'); return }
    setBusy(true)
    try {
      await createTask({
        title: f.title.trim(), client: f.client, item_type: f.item_type, bd_owner: f.bd_owner, dm_owner: f.dm_owner,
        editor: f.editor, contract_id: f.contract_id ? Number(f.contract_id) : null, priority: f.priority as Task['priority'],
        source_url: f.source_url, source_file: f.source_file, supplier: f.supplier, notes: f.notes,
        column_id: initialColumn, actor: me,
      } as Partial<Task> & { title: string })
      onCreated()
    } catch (e) { toast.err(errMsg(e)) } finally { setBusy(false) }
  }
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><b>新增稿件</b><button className="link" onClick={onClose}>✕</button></div>
        <div className="modal-body form-grid">
          <label className="fg-full">標題<input autoFocus value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="稿件標題" /></label>
          <label>客戶<input value={f.client} onChange={(e) => set('client', e.target.value)} placeholder="客戶名" /></label>
          <label>品項
            <select value={f.item_type} onChange={(e) => set('item_type', e.target.value)}>
              <option value="">—</option>{ITEM_TYPES.map((it) => <option key={it} value={it}>{it}</option>)}
            </select>
          </label>
          <label>BD<select value={f.bd_owner} onChange={(e) => set('bd_owner', e.target.value)}><option value="">—</option>{ROLES.bd.map((r) => <option key={r}>{r}</option>)}</select></label>
          <label>DM<select value={f.dm_owner} onChange={(e) => set('dm_owner', e.target.value)}><option value="">—</option>{ROLES.dm.map((r) => <option key={r}>{r}</option>)}</select></label>
          <label>主審<select value={f.editor} onChange={(e) => set('editor', e.target.value)}><option value="">—</option>{ROLES.editor.map((r) => <option key={r}>{r}</option>)}</select></label>
          <label>優先級<select value={f.priority} onChange={(e) => set('priority', e.target.value)}><option value="low">⚪ 低</option><option value="normal">🟢 一般</option><option value="high">🟠 高</option><option value="urgent">🔴 緊急</option></select></label>
          <label>合約<select value={f.contract_id} onChange={(e) => set('contract_id', e.target.value)}><option value="">未綁約</option>{board.contracts.map((c) => <option key={c.id} value={String(c.id)}>{c.client} · {c.name || '合約'}</option>)}</select></label>
          <label>供稿方<input value={f.supplier} onChange={(e) => set('supplier', e.target.value)} placeholder="押註替換" /></label>
          <label className="fg-full">進稿來源連結<input value={f.source_url} onChange={(e) => set('source_url', e.target.value)} placeholder="https://…(廣編/快訊跑 AI 轉稿用;或在處理稿件頁上傳後填路徑)" /></label>
          <label className="fg-full">上傳檔路徑<input value={f.source_file} onChange={(e) => set('source_file', e.target.value)} placeholder="data/uploads/…" /></label>
          <label className="fg-full">特別提醒<textarea value={f.notes} onChange={(e) => set('notes', e.target.value)} /></label>
        </div>
        <div className="modal-foot"><button className="primary" disabled={busy} onClick={submit}>建立稿件</button><button className="link" onClick={onClose}>取消</button></div>
      </div>
    </div>
  )
}

// ──────────────────────── 合約 / 額度 Modal ────────────────────────
function ContractsModal({ board, onClose, onChanged }: { board: Board; onClose: () => void; onChanged: () => void }) {
  const [draft, setDraft] = useState<{ client: string; name: string; mode: string; quota: Record<string, number> }>({ client: '', name: '', mode: '半年約', quota: {} })
  const cats = board.meta?.quota_categories ?? ['廣編', '官網快訊', '常規', '專訪', '深度', 'Banner']
  async function add() {
    if (!draft.client.trim()) { toast.err('請填客戶'); return }
    try { await createContract({ ...draft, quota: draft.quota }); setDraft({ client: '', name: '', mode: '半年約', quota: {} }); onChanged() } catch (e) { toast.err(errMsg(e)) }
  }
  async function remove(id: number) { if (!confirm('刪除合約?(稿件會解除綁定)')) return; try { await deleteContract(id); onChanged() } catch (e) { toast.err(errMsg(e)) } }
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><b>合約 / 額度</b><button className="link" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <div className="contract-list">
            {board.contracts.map((c) => (
              <div key={c.id} className="contract-row">
                <div className="cr-head"><b>{c.client}</b> · {c.name || '合約'} <span className="muted">{c.mode}</span>
                  <button className="danger-link" onClick={() => remove(c.id)}>刪除</button></div>
                <div className="cr-quota">
                  {Object.entries(c.usage).length ? Object.entries(c.usage).map(([cat, u]) => (
                    <span key={cat} className={`quota-pill ${u.remaining <= 0 ? 'low' : ''}`}>{cat} {u.used}/{u.total}（餘 {u.remaining}）</span>
                  )) : <span className="muted">未設額度</span>}
                </div>
              </div>
            ))}
            {!board.contracts.length && <div className="muted">還沒有合約</div>}
          </div>
          <div className="contract-new">
            <div className="cn-title">＋ 新增合約</div>
            <div className="cn-row">
              <input placeholder="客戶" value={draft.client} onChange={(e) => setDraft({ ...draft, client: e.target.value })} />
              <input placeholder="合約名/案名" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              <select value={draft.mode} onChange={(e) => setDraft({ ...draft, mode: e.target.value })}>
                {['單篇', '半年約', '2 個月', '3 個月', '4 個月', '年約', 'Global Media', 'Agency 月結'].map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="cn-quota">
              {cats.map((cat) => (
                <label key={cat}>{cat}<input type="number" min="0" value={draft.quota[cat] ?? ''} placeholder="0"
                  onChange={(e) => setDraft({ ...draft, quota: { ...draft.quota, [cat]: Number(e.target.value) || 0 } })} /></label>
              ))}
            </div>
            <button className="primary sm" onClick={add}>新增合約</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ──────────────────────── 稿件詳情抽屜 ────────────────────────
const ACT_ICON: Record<string, string> = {
  created: '✨', moved: '↦', assigned: '👤', edited: '✏️', commented: '💬',
  job_started: '⚙️', job_done: '✅', job_error: '⚠️', notified: '🔔', billed: '💳',
}
function TaskDrawer({ taskId, me, board, onClose, onChanged, onOpenJob }: {
  taskId: number; me: string; board: Board; onClose: () => void; onChanged: () => void; onOpenJob: (jobId: number) => void
}) {
  const [t, setT] = useState<TaskDetail | null>(null)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const reload = () => getTask(taskId).then(setT).catch((e) => toast.err(errMsg(e)))
  useEffect(() => { reload() }, [taskId])
  useEffect(() => {
    const ac = new AbortController()
    streamBoard((ev, data) => {
      const d = (data ?? {}) as Record<string, unknown>
      if (ev === 'comment.added' && d.task_id === taskId) {
        const c = d.comment as BoardComment
        setT((prev) => prev && !prev.comments.some((x) => x.id === c.id) ? { ...prev, comments: [...prev.comments, c] } : prev)
      } else if (ev === 'task.updated' && (d as { id?: number }).id === taskId) {
        const u = d as unknown as Task
        setT((prev) => prev ? { ...prev, job: u.job, job_id: u.job_id, column_id: u.column_id, contract: u.contract } : prev)
      }
    }, ac.signal)
    return () => ac.abort()
  }, [taskId])

  if (!t) return <div className="drawer-scrim" onClick={onClose}><div className="drawer" onClick={(e) => e.stopPropagation()}><p className="muted">載入中…</p></div></div>

  const patch = (p: Partial<Task>) => updateTask(taskId, { ...p, actor: me }).then(() => { reload(); onChanged() }).catch((e) => toast.err(errMsg(e)))
  const colName = (id: number) => board.columns.find((c) => c.id === id)?.name ?? ''
  async function run() { setBusy(true); try { await runTask(taskId, me); toast.info('已觸發 AI 轉稿'); reload(); onChanged() } catch (e) { toast.err(errMsg(e)) } finally { setBusy(false) } }
  async function send() { if (!comment.trim()) return; try { await addTaskComment(taskId, comment.trim(), me); setComment(''); reload(); onChanged() } catch (e) { toast.err(errMsg(e)) } }
  async function doNotify() { try { await notifyBd(taskId, me); toast.info('已通知 BD 回傳客戶'); reload() } catch (e) { toast.err(errMsg(e)) } }
  async function remove() { if (!confirm('確定刪除這張卡?')) return; try { await deleteTask(taskId); onClose(); onChanged() } catch (e) { toast.err(errMsg(e)) } }
  async function saveUrl(key: string, val: string) { try { await setTaskUrls(taskId, { [key]: val }, me); reload() } catch (e) { toast.err(errMsg(e)) } }

  const hasSource = Boolean(t.source_file || t.source_url)
  const isA = t.pipeline === 'A'
  const URL_KEYS = [['website', '官網'], ['tg', 'TG'], ['fb', 'FB'], ['x', 'X'], ['line', 'LINE']]
  return (
    <div className="drawer-scrim" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <input className="dr-title" value={t.title} onChange={(e) => setT({ ...t, title: e.target.value })} onBlur={() => patch({ title: t.title })} />
          <button className="link" onClick={onClose}>✕</button>
        </div>
        <div className="dr-chips">
          {t.pipeline && <span className="chip-pipe">{PIPELINE_LABEL[t.pipeline] ?? t.pipeline}</span>}
          <span className="chip-stage">{colName(t.column_id)}</span>
          {t.status_label && <span className="chip-stage" title="細狀態(自動化/通知依此觸發)">◉ {t.status_label}</span>}
          {t.contract?.category_usage && <span className={`quota-pill ${t.contract.category_usage.remaining <= 0 ? 'low' : ''}`}>{t.contract.category} 餘 {t.contract.category_usage.remaining}/{t.contract.category_usage.total}</span>}
        </div>

        <div className="dr-meta">
          <label>細狀態<select value={t.status || ''} onChange={(e) => patch({ status: e.target.value })} title="設定後卡片自動移到對應欄位,並觸發對應通知">
            <option value="">—(未設定)</option>
            {(board.meta.statuses ?? []).map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select></label>
          <label>客戶<input value={t.client} onChange={(e) => setT({ ...t, client: e.target.value })} onBlur={() => patch({ client: t.client })} /></label>
          <label>品項<select value={t.item_type} onChange={(e) => patch({ item_type: e.target.value })}><option value="">—</option>{ITEM_TYPES.map((it) => <option key={it}>{it}</option>)}</select></label>
          <label>合約<select value={t.contract_id ? String(t.contract_id) : ''} onChange={(e) => patch({ contract_id: e.target.value ? Number(e.target.value) : null })}><option value="">未綁約</option>{board.contracts.map((c) => <option key={c.id} value={String(c.id)}>{c.client} · {c.name || '合約'}</option>)}</select></label>
          <label>優先級<select value={t.priority} onChange={(e) => patch({ priority: e.target.value as Task['priority'] })}><option value="low">⚪ 低</option><option value="normal">🟢 一般</option><option value="high">🟠 高</option><option value="urgent">🔴 緊急</option></select></label>
          <label>BD<select value={t.bd_owner} onChange={(e) => patch({ bd_owner: e.target.value })}><option value="">—</option>{ROLES.bd.map((r) => <option key={r}>{r}</option>)}</select></label>
          <label>DM<select value={t.dm_owner} onChange={(e) => patch({ dm_owner: e.target.value })}><option value="">—</option>{ROLES.dm.map((r) => <option key={r}>{r}</option>)}</select></label>
          <label>主審<select value={t.editor} onChange={(e) => patch({ editor: e.target.value })}><option value="">—</option>{ROLES.editor.map((r) => <option key={r}>{r}</option>)}</select></label>
          <label>發佈到期<input type="date" value={t.publish_deadline ? t.publish_deadline.slice(0, 10) : ''} onChange={(e) => patch({ publish_deadline: e.target.value ? new Date(e.target.value).toISOString() : null })} /></label>
          <label>排定發佈時刻<input type="datetime-local" value={t.scheduled_publish_at ? t.scheduled_publish_at.slice(0, 16) : ''} onChange={(e) => patch({ scheduled_publish_at: e.target.value ? new Date(e.target.value).toISOString() : null })} title="到點時心跳引擎會提醒執行發佈(≠ 死線)" /></label>
        </div>

        <label className="dr-block">特別提醒 / 描述<textarea value={t.notes || t.description} onChange={(e) => setT({ ...t, notes: e.target.value })} onBlur={() => patch({ notes: t.notes })} placeholder="敏感字、客戶要求、排程備註…" /></label>

        {(isA || t.type === 'article') && (
          <div className="dr-article">
            <div className="dr-sec-title">⚙️ AI 轉稿（bd-pr）</div>
            <label>進稿連結<input value={t.source_url} onChange={(e) => setT({ ...t, source_url: e.target.value })} onBlur={() => patch({ source_url: t.source_url })} placeholder="https://… 或用上傳檔" /></label>
            <label>上傳檔路徑<input value={t.source_file} onChange={(e) => setT({ ...t, source_file: e.target.value })} onBlur={() => patch({ source_file: t.source_file })} placeholder="data/uploads/…" /></label>
            <label>供稿方<input value={t.supplier} onChange={(e) => setT({ ...t, supplier: e.target.value })} onBlur={() => patch({ supplier: t.supplier })} placeholder="押註替換" /></label>
            <div className="dr-run">
              {t.job_id && t.job ? (
                <div className="dr-jobstate">
                  <span className={`tag ${t.job.status}`}>AI 轉稿:{t.job.status === 'running' ? '進行中' : t.job.status === 'done' ? '完成' : t.job.status === 'error' ? '失敗' : t.job.status}</span>
                  <button className="ghost sm" onClick={() => onOpenJob(t.job_id!)}>開啟完整管線 →</button>
                  <button className="link" disabled={busy || t.job.status === 'running'} onClick={run}>重跑</button>
                </div>
              ) : <button className="primary" disabled={busy || !hasSource} onClick={run} title={hasSource ? '' : '先填來源'}>⚙️ 跑 AI 轉稿</button>}
            </div>
          </div>
        )}

        <div className="dr-block">
          <div className="dr-sec-title">🔗 發佈連結回填</div>
          <div className="url-grid">
            {URL_KEYS.map(([k, label]) => (
              <label key={k}>{label}<input defaultValue={t.published_urls[k] ?? ''} placeholder="貼上連結" onBlur={(e) => { if (e.target.value !== (t.published_urls[k] ?? '')) saveUrl(k, e.target.value) }} /></label>
            ))}
          </div>
          <button className="ghost sm" onClick={doNotify}>🔔 通知 BD 回傳客戶</button>
        </div>

        <div className="dr-block">
          <div className="dr-sec-title">💬 留言（{t.comments.length}）</div>
          <div className="dr-comments">
            {t.comments.map((c) => (
              <div key={c.id} className="dr-comment"><div className="dc-head"><b>{c.author || '匿名'}</b><span className="muted">{relTime(c.created_at)}</span></div><div className="dc-body">{c.body}</div></div>
            ))}
            {!t.comments.length && <div className="muted">還沒有留言</div>}
          </div>
          <div className="dr-comment-input">
            <input value={comment} placeholder="留言給協作者…" onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send() }} />
            <button className="ghost sm" onClick={send}>送出</button>
          </div>
        </div>

        {Boolean(t.notifications?.length) && (
          <div className="dr-block">
            <div className="dr-sec-title">🔔 通知紀錄</div>
            <div className="dr-timeline">
              {t.notifications.map((n) => <div key={n.id} className="tl-item"><span className="tl-ic">{n.channel === 'editor' ? '📝' : '📣'}</span><span className="tl-txt">{n.body}</span><span className="tl-meta muted">→{n.target} · {relTime(n.created_at)}</span></div>)}
            </div>
          </div>
        )}

        <div className="dr-block">
          <div className="dr-sec-title">🕑 活動時間軸</div>
          <div className="dr-timeline">
            {t.activity.map((a) => <div key={a.id} className="tl-item"><span className="tl-ic">{ACT_ICON[a.kind] ?? '•'}</span><span className="tl-txt">{a.detail}</span><span className="tl-meta muted">{a.actor} · {relTime(a.created_at)}</span></div>)}
          </div>
        </div>

        <div className="dr-foot"><button className="danger-link" onClick={remove}>刪除卡片</button></div>
      </div>
    </div>
  )
}
