import { useEffect, useRef, useState } from 'react'
import {
  addTaskComment, createColumn, createTask, deleteTask, getBoard, getTask,
  runTask, streamBoard, streamJob, updateTask,
  type Board, type BoardColumn, type BoardComment, type Task, type TaskDetail,
} from './api'
import { STAGE_LABELS, weightedProgress } from './Stages'
import { toast } from './toast'

const errMsg = (e: unknown): string => (e instanceof Error ? e.message : String(e))

// 文章 pipeline 的固定 7 階段順序(看板卡片用 done_stages 重建進度條)。
const ARTICLE_STAGES = ['extract', 'content_ai', 'pr_writer', 'format_conversion', 'copy_editing', 'cover_image', 'article_formatting']
type SView = { id: string; status: 'pending' | 'running' | 'done' | 'error' }
function buildStages(done: string[], current: string | null, errored: boolean): SView[] {
  return ARTICLE_STAGES.map((id) => ({
    id,
    status: done.includes(id) ? 'done' : id === current ? (errored ? 'error' : 'running') : 'pending',
  }))
}

const PRIORITY: Record<string, { label: string; cls: string }> = {
  urgent: { label: '🔴 緊急', cls: 'p-urgent' },
  high: { label: '🟠 高', cls: 'p-high' },
  normal: { label: '🟢 一般', cls: 'p-normal' },
  low: { label: '⚪ 低', cls: 'p-low' },
}
const ARTICLE_TYPE_LABEL: Record<string, string> = { regular: '一般文章', sponsored: '廣編稿', 'press-release': '新聞稿' }

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
function dueLabel(iso: string | null): { txt: string; cls: string } | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  const days = Math.floor((t - Date.now()) / 86400000)
  if (days < 0) return { txt: `逾期 ${-days} 天`, cls: 'due-over' }
  if (days === 0) return { txt: '今天到期', cls: 'due-soon' }
  if (days <= 2) return { txt: `${days} 天後`, cls: 'due-soon' }
  return { txt: new Date(iso).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' }), cls: '' }
}

/** 進行中文章卡:訂閱 job SSE,即時更新階段進度(大看板直接看到管線在跑)。 */
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
  const pct = weightedProgress(buildStages(done, current, false))
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
  if (j.status === 'running' || j.status === 'pending') {
    return <LiveProgress jobId={j.job_id} initialDone={j.done_stages} initialCurrent={j.current_stage} />
  }
  if (j.status === 'error') return <div className="tc-job err">⚠️ AI 流程失敗</div>
  if (j.status === 'done') {
    const pct = weightedProgress(buildStages(j.done_stages, null, false))
    return <div className="tc-job ok">✓ AI 完成（{Math.max(pct, ARTICLE_STAGES.every((s) => j.done_stages.includes(s)) ? 100 : pct)}%）</div>
  }
  return null
}

function TaskCard({ task, onOpen, onDragStart, onDropBefore }: {
  task: Task
  onOpen: (t: Task) => void
  onDragStart: (t: Task) => void
  onDropBefore: (t: Task) => void
}) {
  const [over, setOver] = useState(false)
  const p = PRIORITY[task.priority] ?? PRIORITY.normal
  const due = dueLabel(task.due_date)
  return (
    <div
      className={`task-card ${over ? 'drop-over' : ''}`}
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart(task) }}
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setOver(false); onDropBefore(task) }}
      onClick={() => onOpen(task)}
    >
      <div className="tc-top">
        <span className={`tc-type ${task.type}`}>{task.type === 'article' ? '📄 文章' : '📌 工作'}</span>
        <span className={`tc-pri ${p.cls}`}>{p.label}</span>
      </div>
      <div className="tc-title">{task.title}</div>
      {task.type === 'article' && (task.article_type || task.supplier) && (
        <div className="tc-sub">{ARTICLE_TYPE_LABEL[task.article_type] ?? task.article_type}{task.supplier ? ` · ${task.supplier}` : ''}</div>
      )}
      <JobBadge task={task} />
      <div className="tc-foot">
        {task.assignee ? <span className="tc-assignee" title="負責人">👤 {task.assignee}</span> : <span className="muted tc-assignee">未指派</span>}
        {due && <span className={`tc-due ${due.cls}`}>⏰ {due.txt}</span>}
      </div>
    </div>
  )
}

const ADD_KINDS = [
  { kind: 'custom', label: '自訂欄位' },
  { kind: 'ready', label: '待處理（可進 AI）' },
  { kind: 'review', label: '待審稿' },
  { kind: 'publish', label: '待發布' },
  { kind: 'done', label: '已完成' },
]

export function BoardPanel({ onOpenJob }: { onOpenJob: (jobId: number) => void }) {
  const [board, setBoard] = useState<Board | null>(null)
  const [me, setMe] = whoami()
  const [creatingIn, setCreatingIn] = useState<number | null>(null)
  const [openTaskId, setOpenTaskId] = useState<number | null>(null)
  const [addingCol, setAddingCol] = useState(false)
  const dragRef = useRef<Task | null>(null)

  const load = () => getBoard().then(setBoard).catch((e) => toast.err(errMsg(e)))
  useEffect(() => { load() }, [])

  // 即時:套用增量事件(多人同看同步)。
  useEffect(() => {
    const ac = new AbortController()
    streamBoard((ev, data) => {
      const d = (data ?? {}) as Record<string, unknown>
      setBoard((b) => {
        if (!b) return b
        if (ev === 'task.created' || ev === 'task.updated') {
          const t = d as unknown as Task
          const rest = b.tasks.filter((x) => x.id !== t.id)
          return { ...b, tasks: [...rest, t] }
        }
        if (ev === 'task.deleted') return { ...b, tasks: b.tasks.filter((x) => x.id !== d.id) }
        if (ev === 'column.changed') { load(); return b }
        return b
      })
    }, ac.signal)
    return () => ac.abort()
  }, [])

  if (!board) return <div className="panel"><p className="muted">載入看板中…</p></div>

  const cols = [...board.columns].sort((a, b) => a.position - b.position)
  const tasksOf = (colId: number) => board.tasks.filter((t) => t.column_id === colId).sort((a, b) => a.position - b.position)

  function applyLocal(taskId: number, patch: Partial<Task>) {
    setBoard((b) => b ? { ...b, tasks: b.tasks.map((t) => t.id === taskId ? { ...t, ...patch } : t) } : b)
  }

  // 放到某欄底部
  function dropToColumn(colId: number) {
    const t = dragRef.current
    dragRef.current = null
    if (!t || t.column_id === colId) return
    const peers = tasksOf(colId)
    const pos = peers.length ? peers[peers.length - 1].position + 1 : 1
    applyLocal(t.id, { column_id: colId, position: pos })
    updateTask(t.id, { column_id: colId, position: pos, actor: me }).catch((e) => { toast.err(errMsg(e)); load() })
  }
  // 放到某卡之前(插入排序)
  function dropBeforeTask(target: Task) {
    const t = dragRef.current
    dragRef.current = null
    if (!t || t.id === target.id) return
    const peers = tasksOf(target.column_id).filter((x) => x.id !== t.id)
    const idx = peers.findIndex((x) => x.id === target.id)
    const before = idx > 0 ? peers[idx - 1].position : target.position - 1
    const pos = (before + target.position) / 2
    applyLocal(t.id, { column_id: target.column_id, position: pos })
    updateTask(t.id, { column_id: target.column_id, position: pos, actor: me }).catch((e) => { toast.err(errMsg(e)); load() })
  }

  return (
    <div className="board-wrap">
      <div className="board-head">
        <div className="board-name">{board.name}</div>
        <span className="muted board-count">{board.tasks.length} 張卡</span>
        <span className="spacer" />
        <label className="whoami">你是
          <input value={me} placeholder="填名字（記名用）" onChange={(e) => setMe(e.target.value)} />
        </label>
      </div>

      <div className="board-cols">
        {cols.map((col) => (
          <BoardColumnView
            key={col.id}
            col={col}
            tasks={tasksOf(col.id)}
            onAddCard={() => setCreatingIn(col.id)}
            creating={creatingIn === col.id}
            onCancelCreate={() => setCreatingIn(null)}
            onCreated={() => setCreatingIn(null)}
            me={me}
            onOpen={(t) => setOpenTaskId(t.id)}
            onDragStartCard={(t) => { dragRef.current = t }}
            onDropColumn={() => dropToColumn(col.id)}
            onDropBeforeCard={dropBeforeTask}
          />
        ))}
        <div className="add-col">
          {addingCol ? (
            <AddColumn onDone={() => { setAddingCol(false); load() }} onCancel={() => setAddingCol(false)} />
          ) : (
            <button className="add-col-btn" onClick={() => setAddingCol(true)}>＋ 新增欄位</button>
          )}
        </div>
      </div>

      {openTaskId != null && (
        <TaskDrawer
          taskId={openTaskId}
          me={me}
          onClose={() => setOpenTaskId(null)}
          onChanged={() => load()}
          onOpenJob={onOpenJob}
        />
      )}
    </div>
  )
}

function BoardColumnView({ col, tasks, onAddCard, creating, onCancelCreate, onCreated, me, onOpen, onDragStartCard, onDropColumn, onDropBeforeCard }: {
  col: BoardColumn
  tasks: Task[]
  onAddCard: () => void
  creating: boolean
  onCancelCreate: () => void
  onCreated: () => void
  me: string
  onOpen: (t: Task) => void
  onDragStartCard: (t: Task) => void
  onDropColumn: () => void
  onDropBeforeCard: (t: Task) => void
}) {
  const [over, setOver] = useState(false)
  const overLimit = col.wip_limit != null && tasks.length > col.wip_limit
  return (
    <div className={`board-col kind-${col.kind} ${over ? 'col-over' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); onDropColumn() }}
    >
      <div className="col-head">
        <span className="col-dot" />
        <span className="col-name">{col.name}</span>
        <span className={`col-count ${overLimit ? 'over' : ''}`}>{tasks.length}{col.wip_limit != null ? `/${col.wip_limit}` : ''}</span>
      </div>
      <div className="col-body">
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} onOpen={onOpen} onDragStart={onDragStartCard} onDropBefore={onDropBeforeCard} />
        ))}
        {creating
          ? <CreateCard columnId={col.id} kind={col.kind} me={me} onCreated={onCreated} onCancel={onCancelCreate} />
          : <button className="add-card-btn" onClick={onAddCard}>＋ 新增卡</button>}
      </div>
    </div>
  )
}

function CreateCard({ columnId, kind, me, onCreated, onCancel }: {
  columnId: number; kind: string; me: string; onCreated: () => void; onCancel: () => void
}) {
  // ready 欄(可進 AI)預設建文章卡;其餘預設一般工作卡。
  const [type, setType] = useState<'article' | 'general'>(kind === 'ready' || kind === 'processing' ? 'article' : 'general')
  const [title, setTitle] = useState('')
  const [assignee, setAssignee] = useState('')
  const [priority, setPriority] = useState('normal')
  const [busy, setBusy] = useState(false)
  async function submit() {
    if (!title.trim()) { toast.err('請填標題'); return }
    setBusy(true)
    try {
      await createTask({ title: title.trim(), type, assignee, priority: priority as Task['priority'], column_id: columnId, actor: me })
      onCreated()
    } catch (e) { toast.err(errMsg(e)) } finally { setBusy(false) }
  }
  return (
    <div className="create-card">
      <input autoFocus placeholder="工作標題…" value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onCancel() }} />
      <div className="cc-row">
        <select value={type} onChange={(e) => setType(e.target.value as 'article' | 'general')}>
          <option value="general">📌 一般工作</option>
          <option value="article">📄 文章（可跑 AI）</option>
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="low">⚪ 低</option><option value="normal">🟢 一般</option>
          <option value="high">🟠 高</option><option value="urgent">🔴 緊急</option>
        </select>
      </div>
      <input placeholder="負責人（選填）" value={assignee} onChange={(e) => setAssignee(e.target.value)} />
      <div className="cc-actions">
        <button className="primary sm" disabled={busy} onClick={submit}>建立</button>
        <button className="link" onClick={onCancel}>取消</button>
      </div>
    </div>
  )
}

function AddColumn({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [kind, setKind] = useState('custom')
  async function submit() {
    if (!name.trim()) { toast.err('請填欄位名'); return }
    try { await createColumn(name.trim(), kind); onDone() } catch (e) { toast.err(errMsg(e)) }
  }
  return (
    <div className="create-card">
      <input autoFocus placeholder="欄位名稱…" value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onCancel() }} />
      <select value={kind} onChange={(e) => setKind(e.target.value)}>
        {ADD_KINDS.map((k) => <option key={k.kind} value={k.kind}>{k.label}</option>)}
      </select>
      <div className="cc-actions">
        <button className="primary sm" onClick={submit}>新增</button>
        <button className="link" onClick={onCancel}>取消</button>
      </div>
    </div>
  )
}

const ACT_ICON: Record<string, string> = {
  created: '✨', moved: '↦', assigned: '👤', edited: '✏️', commented: '💬',
  job_started: '⚙️', job_done: '✅', job_error: '⚠️',
}

function TaskDrawer({ taskId, me, onClose, onChanged, onOpenJob }: {
  taskId: number; me: string; onClose: () => void; onChanged: () => void; onOpenJob: (jobId: number) => void
}) {
  const [t, setT] = useState<TaskDetail | null>(null)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const reload = () => getTask(taskId).then(setT).catch((e) => toast.err(errMsg(e)))
  useEffect(() => { reload() }, [taskId])

  // 即時協作:別人留言/改這張卡 → 開著抽屜的人立刻看到(不必重整)。dedupe by id 防自己的樂觀更新重複。
  useEffect(() => {
    const ac = new AbortController()
    streamBoard((ev, data) => {
      const d = (data ?? {}) as Record<string, unknown>
      if (ev === 'comment.added' && d.task_id === taskId) {
        const c = d.comment as BoardComment
        setT((prev) => prev && !prev.comments.some((x) => x.id === c.id)
          ? { ...prev, comments: [...prev.comments, c] } : prev)
      } else if (ev === 'task.updated' && (d as { id?: number }).id === taskId) {
        // 別人移卡/改了狀態 → 同步 job 進度與欄位,但保留留言/活動與正在編輯的本地草稿不被蓋掉
        setT((prev) => prev ? { ...prev, job: (d as TaskDetail).job, job_id: (d as TaskDetail).job_id, column_id: (d as TaskDetail).column_id } : prev)
      }
    }, ac.signal)
    return () => ac.abort()
  }, [taskId])

  if (!t) return (
    <div className="drawer-scrim" onClick={onClose}><div className="drawer" onClick={(e) => e.stopPropagation()}><p className="muted">載入中…</p></div></div>
  )

  function patch(p: Partial<Task>) {
    updateTask(taskId, { ...p, actor: me }).then(() => { reload(); onChanged() }).catch((e) => toast.err(errMsg(e)))
  }
  async function run() {
    setBusy(true)
    try { await runTask(taskId, me); toast.info('已觸發 AI 流程,卡片移到「AI 處理中」'); reload(); onChanged() }
    catch (e) { toast.err(errMsg(e)) } finally { setBusy(false) }
  }
  async function send() {
    if (!comment.trim()) return
    try { await addTaskComment(taskId, comment.trim(), me); setComment(''); reload(); onChanged() }
    catch (e) { toast.err(errMsg(e)) }
  }
  async function remove() {
    if (!confirm('確定刪除這張卡?')) return
    try { await deleteTask(taskId); onClose(); onChanged() } catch (e) { toast.err(errMsg(e)) }
  }

  const hasSource = Boolean(t.source_file || t.source_url)
  return (
    <div className="drawer-scrim" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <input className="dr-title" value={t.title} onChange={(e) => setT({ ...t, title: e.target.value })}
            onBlur={() => patch({ title: t.title })} />
          <button className="link" onClick={onClose}>✕</button>
        </div>

        <div className="dr-meta">
          <label>類型
            <select value={t.type} onChange={(e) => patch({ type: e.target.value as Task['type'] })}>
              <option value="general">📌 一般工作</option><option value="article">📄 文章</option>
            </select>
          </label>
          <label>優先級
            <select value={t.priority} onChange={(e) => patch({ priority: e.target.value as Task['priority'] })}>
              <option value="low">⚪ 低</option><option value="normal">🟢 一般</option>
              <option value="high">🟠 高</option><option value="urgent">🔴 緊急</option>
            </select>
          </label>
          <label>負責人
            <input value={t.assignee} onChange={(e) => setT({ ...t, assignee: e.target.value })} onBlur={() => patch({ assignee: t.assignee })} placeholder="未指派" />
          </label>
          <label>到期
            <input type="date" value={t.due_date ? t.due_date.slice(0, 10) : ''} onChange={(e) => patch({ due_date: e.target.value ? new Date(e.target.value).toISOString() : null })} />
          </label>
        </div>

        <label className="dr-block">描述
          <textarea value={t.description} onChange={(e) => setT({ ...t, description: e.target.value })} onBlur={() => patch({ description: t.description })} placeholder="這張卡要做什麼…" />
        </label>

        {t.type === 'article' && (
          <div className="dr-article">
            <div className="dr-sec-title">📄 進稿來源（跑 AI 流程用）</div>
            <label>來源連結 URL
              <input value={t.source_url} onChange={(e) => setT({ ...t, source_url: e.target.value })} onBlur={() => patch({ source_url: t.source_url })} placeholder="https://… 或留空用上傳檔" />
            </label>
            <label>上傳檔路徑
              <input value={t.source_file} onChange={(e) => setT({ ...t, source_file: e.target.value })} onBlur={() => patch({ source_file: t.source_file })} placeholder="data/uploads/…(在處理稿件頁上傳後填入)" />
            </label>
            <div className="dr-meta">
              <label>文稿類型
                <select value={t.article_type} onChange={(e) => patch({ article_type: e.target.value })}>
                  <option value="">—</option><option value="regular">一般文章</option>
                  <option value="sponsored">廣編稿</option><option value="press-release">新聞稿</option>
                </select>
              </label>
              <label>供稿方
                <input value={t.supplier} onChange={(e) => setT({ ...t, supplier: e.target.value })} onBlur={() => patch({ supplier: t.supplier })} placeholder="押註替換" />
              </label>
            </div>
            <div className="dr-run">
              {t.job_id && t.job ? (
                <div className="dr-jobstate">
                  <span className={`tag ${t.job.status}`}>AI 流程:{t.job.status === 'running' ? '進行中' : t.job.status === 'done' ? '已完成' : t.job.status === 'error' ? '失敗' : t.job.status}</span>
                  <button className="ghost sm" onClick={() => onOpenJob(t.job_id!)}>開啟完整管線檢視 →</button>
                  <button className="link" disabled={busy || t.job.status === 'running'} onClick={run}>重跑</button>
                </div>
              ) : (
                <button className="primary" disabled={busy || !hasSource} onClick={run} title={hasSource ? '' : '先填來源連結或上傳檔'}>⚙️ 跑 AI 流程</button>
              )}
            </div>
          </div>
        )}

        <div className="dr-block">
          <div className="dr-sec-title">💬 留言（{t.comments.length}）</div>
          <div className="dr-comments">
            {t.comments.map((c) => (
              <div key={c.id} className="dr-comment">
                <div className="dc-head"><b>{c.author || '匿名'}</b><span className="muted">{relTime(c.created_at)}</span></div>
                <div className="dc-body">{c.body}</div>
              </div>
            ))}
            {!t.comments.length && <div className="muted">還沒有留言</div>}
          </div>
          <div className="dr-comment-input">
            <input value={comment} placeholder="留言給協作者…" onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send() }} />
            <button className="ghost sm" onClick={send}>送出</button>
          </div>
        </div>

        <div className="dr-block">
          <div className="dr-sec-title">🕑 活動時間軸</div>
          <div className="dr-timeline">
            {t.activity.map((a) => (
              <div key={a.id} className="tl-item">
                <span className="tl-ic">{ACT_ICON[a.kind] ?? '•'}</span>
                <span className="tl-txt">{a.detail}</span>
                <span className="tl-meta muted">{a.actor} · {relTime(a.created_at)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dr-foot">
          <button className="danger-link" onClick={remove}>刪除卡片</button>
        </div>
      </div>
    </div>
  )
}
