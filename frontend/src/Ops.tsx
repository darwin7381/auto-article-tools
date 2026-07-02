/** 營運指揮 —— 全新展示層(不動既有頁,供對比後決定是否切換):
 *  CommandPanel  /ops           指揮中心:打開就看到部門自己在跑
 *  ClientsPanel  /ops/clients   客戶 360:BD 對客戶的單一畫面
 *  CalendarPanel /ops/calendar  發佈行事曆:內容側「今天/這月要發什麼」
 */

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getActivity, getBoard, getDigest, listClients, seedDemo, streamBoard,
  HUMAN_QUEUES,
  type Board, type ClientOverview, type Digest, type GlobalActivity, type Task,
} from './api'
import { toast } from './toast'

function relTime(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso + (iso.endsWith('Z') ? '' : 'Z')).getTime()) / 1000)
  if (s < 60) return `${Math.floor(s)} 秒前`
  if (s < 3600) return `${Math.floor(s / 60)} 分鐘前`
  if (s < 86400) return `${Math.floor(s / 3600)} 小時前`
  return `${Math.floor(s / 86400)} 天前`
}
const errMsg = (e: unknown): string => (e instanceof Error ? e.message : String(e))
const fmtDT = (iso: string | null | undefined): string => {
  if (!iso) return ''
  const d = new Date(iso + (iso.endsWith('Z') ? '' : 'Z'))
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const OPS_CSS = `
.ops-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.ops-head h2 { margin: 0; }
.ops-sub { color: var(--muted); font-size: 12.5px; margin: 2px 0 0; }
.ops-layout { display: grid; grid-template-columns: 1fr 360px; gap: 20px; align-items: start; }
@media (max-width: 1100px) { .ops-layout { grid-template-columns: 1fr; } }
.ops-queues { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 760px) { .ops-queues { grid-template-columns: 1fr; } }
.ops-qcard { border: 1px solid var(--border-soft); border-radius: var(--r); padding: 10px 12px; cursor: pointer;
  background: var(--panel-2); transition: var(--transition-fast); display: flex; flex-direction: column; gap: 4px; }
.ops-qcard:hover { border-color: var(--accent); transform: translateY(-1px); }
.ops-qtop { display: flex; justify-content: space-between; gap: 8px; align-items: baseline; }
.ops-qclient { font-weight: 700; font-size: 13px; }
.ops-qtitle { font-size: 12.5px; color: var(--text); opacity: .9; }
.ops-qstatus { font-size: 11px; color: var(--accent); font-weight: 600; white-space: nowrap; }
.ops-qdue { font-size: 11px; color: var(--warn); }
.ops-qdue.over { color: var(--err); font-weight: 700; }
.ops-alert { display: flex; gap: 8px; align-items: baseline; font-size: 12.5px; padding: 6px 10px;
  border-radius: 8px; border: 1px solid transparent; }
.ops-alert.red { background: color-mix(in srgb, var(--err) 8%, transparent); border-color: color-mix(in srgb, var(--err) 25%, transparent); color: var(--err); }
.ops-alert.amber { background: color-mix(in srgb, var(--warn) 8%, transparent); border-color: color-mix(in srgb, var(--warn) 25%, transparent); color: var(--warn); }
.ops-health { display: flex; gap: 4px; align-items: flex-end; }
.ops-health .col { flex: 1; display: flex; flex-direction: column; gap: 6px; align-items: center; }
.ops-health .bar { width: 100%; border-radius: 6px 6px 2px 2px; background: color-mix(in srgb, var(--accent) 55%, var(--panel-2));
  min-height: 4px; transition: var(--transition-smooth); }
.ops-health .bar.over { background: color-mix(in srgb, var(--err) 70%, var(--panel-2)); }
.ops-health .cnt { font-size: 13px; font-weight: 700; font-family: var(--mono); }
.ops-health .lbl { font-size: 10px; color: var(--muted); text-align: center; line-height: 1.2; }
.ops-feed { display: flex; flex-direction: column; gap: 0; max-height: 640px; overflow-y: auto; }
.ops-feed-item { display: flex; gap: 10px; padding: 8px 4px; border-bottom: 1px solid var(--border-soft); font-size: 12px; }
.ops-feed-item:last-child { border-bottom: none; }
.ops-feed-ico { flex: none; width: 22px; text-align: center; }
.ops-feed-main { min-width: 0; }
.ops-feed-who { font-weight: 700; font-size: 11.5px; }
.ops-feed-who.sys { color: var(--accent); }
.ops-feed-detail { color: var(--muted); overflow-wrap: anywhere; }
.ops-feed-time { flex: none; font-size: 10.5px; color: var(--muted); font-family: var(--mono); }
.ops-clients { display: grid; grid-template-columns: 280px 1fr; gap: 20px; align-items: start; }
@media (max-width: 900px) { .ops-clients { grid-template-columns: 1fr; } }
.ops-cli-item { display: flex; justify-content: space-between; gap: 8px; padding: 9px 12px; border-radius: 8px;
  cursor: pointer; font-size: 13px; border: 1px solid transparent; }
.ops-cli-item:hover { background: var(--panel-2); }
.ops-cli-item.on { background: var(--panel-2); border-color: var(--accent); font-weight: 700; }
.ops-cli-meta { color: var(--muted); font-size: 11px; font-family: var(--mono); }
.ops-quota { margin: 6px 0; }
.ops-quota .row { display: flex; align-items: center; gap: 8px; font-size: 12px; margin: 4px 0; }
.ops-quota .name { width: 64px; color: var(--muted); }
.ops-quota .track { flex: 1; height: 8px; border-radius: 4px; background: var(--panel-2); overflow: hidden; }
.ops-quota .fill { height: 100%; border-radius: 4px; background: var(--accent); }
.ops-quota .fill.low { background: var(--warn); }
.ops-quota .fill.out { background: var(--err); }
.ops-quota .num { font-family: var(--mono); font-size: 11px; width: 56px; text-align: right; }
.ops-cal { user-select: none; }
.ops-cal-head { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; margin-bottom: 6px; }
.ops-cal-head span { text-align: center; font-size: 11px; color: var(--muted); font-weight: 600; }
.ops-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.ops-cal-day { min-height: 86px; border: 1px solid var(--border-soft); border-radius: 8px; padding: 6px;
  cursor: pointer; background: var(--panel); transition: var(--transition-fast); display: flex; flex-direction: column; gap: 3px; }
.ops-cal-day:hover { border-color: var(--accent); }
.ops-cal-day.dim { opacity: .35; }
.ops-cal-day.today { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent) inset; }
.ops-cal-day.sel { background: color-mix(in srgb, var(--accent) 7%, var(--panel)); }
.ops-cal-num { font-size: 11px; font-family: var(--mono); color: var(--muted); }
.ops-cal-day.today .ops-cal-num { color: var(--accent); font-weight: 700; }
.ops-cal-item { font-size: 10.5px; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  border-radius: 4px; padding: 1px 4px; background: var(--panel-2); }
.ops-cal-item.deadline { color: var(--warn); }
.ops-cal-item.overdue-mark { color: var(--err); }
`

// ──────────────────────────── 指揮中心 ────────────────────────────

type QueueTask = Task & { _due?: string | null }

export function CommandPanel() {
  const navigate = useNavigate()
  const [board, setBoard] = useState<Board | null>(null)
  const [digest, setDigest] = useState<Digest | null>(null)
  const [acts, setActs] = useState<GlobalActivity[]>([])
  const [aiOnly, setAiOnly] = useState(true)
  const [seeding, setSeeding] = useState(false)

  const load = () => {
    getBoard().then(setBoard).catch(() => {})
    getDigest().then(setDigest).catch(() => {})
  }
  const loadActs = (ai: boolean) => getActivity(80, ai ? 'system' : undefined).then(setActs).catch(() => {})

  useEffect(() => {
    load(); loadActs(aiOnly)
    const t = setInterval(() => { load(); loadActs(aiOnly) }, 30_000)
    const ac = new AbortController()
    streamBoard(() => { load(); loadActs(aiOnly) }, ac.signal)
    return () => { clearInterval(t); ac.abort() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiOnly])

  const queues = useMemo(() => {
    const tasks = board?.tasks ?? []
    const pick = (keys: string[]): QueueTask[] => tasks
      .filter((t) => keys.includes(t.status))
      .map((t) => ({ ...t, _due: t.publish_deadline || t.draft_deadline }))
      .sort((a, b) => (a._due || '9999').localeCompare(b._due || '9999'))
    return { bd: pick(HUMAN_QUEUES.bd), editor: pick(HUMAN_QUEUES.editor) }
  }, [board])

  const openTask = (id: number) => navigate(`/kanban?task=${id}`)
  const now = new Date()

  const seed = () => {
    setSeeding(true)
    seedDemo().then((r) => { toast.ok(`已種 ${r.tasks} 張示範卡 + ${r.contracts} 份合約`); load(); loadActs(aiOnly) })
      .catch((e) => toast.err(errMsg(e))).finally(() => setSeeding(false))
  }

  const kindIcon: Record<string, string> = {
    moved: '↔️', status: '🔀', notified: '📣', billed: '💰', job_started: '⚙️', job_done: '✅',
    job_error: '❌', created: '🆕', commented: '💬', assigned: '👤', edited: '✏️', placement_sync: '🖼️',
  }

  return (
    <div className="status-page">
      <style>{OPS_CSS}</style>
      <div className="ops-head">
        <div>
          <h2 style={{ border: 'none', padding: 0 }}>🎛 指揮中心</h2>
          <p className="ops-sub">部門即時運作總覽 —— 待人動作只看這裡;其餘由 AI 主理人自動推進</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ghost sm" disabled={seeding} onClick={seed} title="種一套示範資料(可重複執行,只動 demo 標記資料)">🌱 種示範資料</button>
          <button className="ghost sm" onClick={() => { load(); loadActs(aiOnly) }}>↻ 重新整理</button>
        </div>
      </div>

      {/* 今日總覽 */}
      <div className="stat-cards" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
        <div className="stat-card"><div className="stat-val">{digest?.open_count ?? '—'}</div><div className="stat-label">進行中</div></div>
        <div className="stat-card"><div className="stat-val">{queues.bd.length}</div><div className="stat-label">待 BD</div></div>
        <div className="stat-card"><div className="stat-val">{queues.editor.length}</div><div className="stat-label">待編輯部</div></div>
        <div className="stat-card"><div className="stat-val" style={{ color: (digest?.overdue.length ?? 0) > 0 ? 'var(--err)' : undefined }}>{digest?.overdue.length ?? '—'}</div><div className="stat-label">已逾期</div></div>
        <div className="stat-card"><div className="stat-val">{(digest?.due_today.length ?? 0) + (digest?.scheduled_today.length ?? 0)}</div><div className="stat-label">今日截止+排程</div></div>
        <div className="stat-card"><div className="stat-val" style={{ color: (digest?.contract_alerts.length ?? 0) > 0 ? 'var(--warn)' : undefined }}>{digest?.contract_alerts.length ?? '—'}</div><div className="stat-label">合約預警</div></div>
      </div>

      <div className="ops-layout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          {/* 預警帶 */}
          {digest && (digest.overdue.length > 0 || digest.contract_alerts.length > 0 || digest.takedown_due.length > 0) && (
            <div className="panel">
              <h2>🚨 需要注意</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {digest.overdue.map((x, i) => (
                  <div key={`o${i}`} className="ops-alert red" style={{ cursor: 'pointer' }} onClick={() => openTask(x.id)}>
                    <b>🔴 逾期</b><span>{x.client || x.title} — {x.status_label || '未設狀態'}({x.which === 'draft_deadline' ? '初稿' : '發佈'} {fmtDT(x.deadline)})</span>
                  </div>
                ))}
                {digest.takedown_due.map((x, i) => (
                  <div key={`t${i}`} className="ops-alert amber" style={{ cursor: 'pointer' }} onClick={() => openTask(x.id)}>
                    <b>📥 Banner 到期</b><span>{x.client || x.title} — 應下架({fmtDT(x.takedown)})</span>
                  </div>
                ))}
                {digest.contract_alerts.map((a, i) => (
                  <div key={`c${i}`} className="ops-alert amber">
                    <b>📑 合約</b>
                    <span>{a.kind === 'expiry' ? `${a.client}「${a.name}」${(a.end_date || '').slice(0, 10)} 到期` : `${a.client}「${a.name}」${a.category} 額度剩 ${a.remaining}/${a.total}`}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 待人動作雙佇列 */}
          <div className="ops-queues">
            {([['👤 待 BD', queues.bd], ['✍️ 待編輯部', queues.editor]] as const).map(([label, items]) => (
              <div className="panel" key={label}>
                <h2>{label}<span style={{ marginLeft: 8, fontSize: 12, color: 'var(--muted)' }}>{items.length} 件</span></h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {items.length === 0 && <p className="hint">目前沒有待辦 — AI 主理人正在處理其餘流程 ✅</p>}
                  {items.map((t) => {
                    const overdue = t._due ? new Date(t._due + (t._due.endsWith('Z') ? '' : 'Z')) < now : false
                    return (
                      <div key={t.id} className="ops-qcard" onClick={() => openTask(t.id)}>
                        <div className="ops-qtop">
                          <span className="ops-qclient">{t.client || '—'}</span>
                          <span className="ops-qstatus">◉ {t.status_label}</span>
                        </div>
                        <span className="ops-qtitle">{t.title}</span>
                        {t._due && <span className={`ops-qdue ${overdue ? 'over' : ''}`}>⏰ {overdue ? '已逾期' : ''} {fmtDT(t._due)}</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Pipeline 健康 */}
          {board && (
            <div className="panel">
              <h2>📊 Pipeline 健康</h2>
              <div className="ops-health">
                {board.columns.filter((c) => c.kind !== 'archive').map((c) => {
                  const cnt = board.tasks.filter((t) => t.column_id === c.id).length
                  const max = Math.max(1, ...board.columns.map((cc) => board.tasks.filter((t) => t.column_id === cc.id).length))
                  const over = c.wip_limit != null && cnt > c.wip_limit
                  return (
                    <div className="col" key={c.id}>
                      <span className="cnt">{cnt}</span>
                      <div className={`bar ${over ? 'over' : ''}`} style={{ height: `${8 + (cnt / max) * 56}px` }} />
                      <span className="lbl">{c.name}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* AI 活動 feed */}
        <div className="panel">
          <h2>🤖 主理人動態
            <span className="seg view-seg" style={{ marginLeft: 10, fontSize: 11 }}>
              <button className={aiOnly ? 'on' : ''} onClick={() => setAiOnly(true)}>只看 AI</button>
              <button className={!aiOnly ? 'on' : ''} onClick={() => setAiOnly(false)}>全部</button>
            </span>
          </h2>
          <div className="ops-feed">
            {acts.length === 0 && <p className="hint">還沒有活動 — 種示範資料或開始建卡</p>}
            {acts.map((a) => (
              <div className="ops-feed-item" key={a.id}>
                <span className="ops-feed-ico">{kindIcon[a.kind] ?? '·'}</span>
                <div className="ops-feed-main">
                  <span className={`ops-feed-who ${a.actor === 'system' ? 'sys' : ''}`}>{a.actor === 'system' ? 'AI 主理人' : a.actor || '—'}</span>
                  <span style={{ margin: '0 6px', color: 'var(--muted)' }}>·</span>
                  <span style={{ fontSize: 11.5 }}>{a.task_client || a.task_title}</span>
                  <div className="ops-feed-detail">{a.detail}</div>
                </div>
                <span className="ops-feed-time">{relTime(a.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────── 客戶 360 ────────────────────────────

export function ClientsPanel() {
  const navigate = useNavigate()
  const [clients, setClients] = useState<ClientOverview[]>([])
  const [sel, setSel] = useState<string>('')
  const [q, setQ] = useState('')

  useEffect(() => { listClients().then((cs) => { setClients(cs); if (cs.length && !sel) setSel(cs[0].client) }).catch((e) => toast.err(errMsg(e))) }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = clients.filter((c) => !q || c.client.toLowerCase().includes(q.toLowerCase()))
  const cur = clients.find((c) => c.client === sel)

  return (
    <div className="status-page">
      <style>{OPS_CSS}</style>
      <div className="ops-head">
        <div>
          <h2 style={{ border: 'none', padding: 0 }}>🤝 客戶 360</h2>
          <p className="ops-sub">BD 對客戶的單一畫面 —— 合約額度、進行中稿件、發佈連結、版位檔期</p>
        </div>
      </div>
      <div className="ops-clients">
        <div className="panel">
          <input placeholder="🔍 搜尋客戶…" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 10 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filtered.map((c) => (
              <div key={c.client} className={`ops-cli-item ${sel === c.client ? 'on' : ''}`} onClick={() => setSel(c.client)}>
                <span>{c.client}</span>
                <span className="ops-cli-meta">{c.open_tasks.length} 進行 · {c.closed_count} 結案</span>
              </div>
            ))}
            {filtered.length === 0 && <p className="hint">沒有客戶資料 — 到指揮中心種示範資料看看效果</p>}
          </div>
        </div>

        {cur ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
            <div className="panel">
              <h2>📑 合約與額度</h2>
              {cur.contracts.length === 0 && <p className="hint">此客戶沒有登錄合約</p>}
              {cur.contracts.map((ct) => (
                <div key={ct.id} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <b>{ct.name || '合約'}</b>
                    <span className="ops-cli-meta">{ct.mode}</span>
                    {ct.end_date && <span className="ops-cli-meta">至 {String(ct.end_date).slice(0, 10)}</span>}
                    {ct.sheet_ref && <span className="ops-cli-meta" title="Google Sheet 參照">📄 {ct.sheet_ref}</span>}
                  </div>
                  <div className="ops-quota">
                    {Object.entries(ct.usage).map(([cat, u]) => {
                      const pct = u.total > 0 ? Math.min(100, (u.used / u.total) * 100) : 0
                      const cls = u.remaining <= 0 ? 'out' : u.remaining <= 1 ? 'low' : ''
                      return (
                        <div className="row" key={cat}>
                          <span className="name">{cat}</span>
                          <div className="track"><div className={`fill ${cls}`} style={{ width: `${pct}%` }} /></div>
                          <span className="num">{u.used}/{u.total}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="panel">
              <h2>📄 進行中稿件({cur.open_tasks.length})</h2>
              <div className="table-wrap"><table>
                <thead><tr><th>標題</th><th>品項</th><th>細狀態</th><th>發佈死線</th></tr></thead>
                <tbody>
                  {cur.open_tasks.map((t) => (
                    <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/kanban?task=${t.id}`)}>
                      <td>{t.title}</td><td>{t.item_type}</td>
                      <td style={{ color: 'var(--accent)' }}>{t.status_label || '—'}</td>
                      <td className="mono">{t.publish_deadline ? fmtDT(t.publish_deadline) : '—'}</td>
                    </tr>
                  ))}
                  {cur.open_tasks.length === 0 && <tr><td colSpan={4} className="hint">沒有進行中稿件</td></tr>}
                </tbody>
              </table></div>
            </div>

            <div className="ops-queues">
              <div className="panel">
                <h2>🔗 最近發佈</h2>
                {cur.published.length === 0 && <p className="hint">尚無發佈連結</p>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5 }}>
                  {cur.published.map((p, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, minWidth: 0 }}>
                      <span className="mono" style={{ color: 'var(--muted)', flex: 'none' }}>{p.channel}</span>
                      <a href={p.url} target="_blank" rel="noreferrer" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.task}</a>
                    </div>
                  ))}
                </div>
              </div>
              <div className="panel">
                <h2>🖼 版位檔期</h2>
                {cur.placements.length === 0 && <p className="hint">此客戶沒有版位檔期</p>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5 }}>
                  {cur.placements.map((p) => (
                    <div key={p.id} style={{ display: 'flex', gap: 8, alignItems: 'baseline', cursor: 'pointer' }} onClick={() => navigate('/placements/schedule')}>
                      <span className={`status-badge ${p.status}`} style={{ fontSize: 10 }}>{p.status === 'booked' ? '已售' : p.status === 'negotiating' ? '洽談中' : '可用'}</span>
                      <span>{p.surface_name} · {p.name}</span>
                      <span className="mono" style={{ color: 'var(--muted)', fontSize: 11 }}>{p.schedule}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : <div className="panel"><p className="hint">左側選一個客戶</p></div>}
      </div>
    </div>
  )
}

// ──────────────────────────── 發佈行事曆 ────────────────────────────

type CalItem = { task: Task; kind: 'scheduled' | 'publish_deadline' | 'draft_deadline' | 'takedown'; when: Date }

const CAL_KIND = {
  scheduled: { icon: '📤', label: '排程發佈' },
  publish_deadline: { icon: '⏰', label: '發佈死線' },
  draft_deadline: { icon: '✍️', label: '初稿死線' },
  takedown: { icon: '📥', label: 'Banner 下架' },
} as const

export function CalendarPanel() {
  const navigate = useNavigate()
  const [board, setBoard] = useState<Board | null>(null)
  const today = new Date()
  const [ym, setYm] = useState<[number, number]>([today.getFullYear(), today.getMonth()])
  const [selDay, setSelDay] = useState<Date | null>(null)

  useEffect(() => { getBoard().then(setBoard).catch((e) => toast.err(errMsg(e))) }, [])

  const items = useMemo((): CalItem[] => {
    const out: CalItem[] = []
    for (const t of board?.tasks ?? []) {
      const add = (iso: string | null, kind: CalItem['kind']) => {
        if (!iso) return
        out.push({ task: t, kind, when: new Date(iso + (iso.endsWith('Z') ? '' : 'Z')) })
      }
      add(t.scheduled_publish_at, 'scheduled')
      add(t.publish_deadline, 'publish_deadline')
      add(t.draft_deadline, 'draft_deadline')
      add(t.takedown_date, 'takedown')
    }
    return out
  }, [board])

  const [year, month] = ym
  const first = new Date(year, month, 1)
  const startPad = first.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (Date | null)[] = [
    ...Array.from({ length: startPad }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  const dayItems = (d: Date) => items.filter((x) => sameDay(x.when, d))
  const selItems = selDay ? dayItems(selDay) : []

  const shift = (n: number) => { const d = new Date(year, month + n, 1); setYm([d.getFullYear(), d.getMonth()]); setSelDay(null) }

  return (
    <div className="status-page">
      <style>{OPS_CSS}</style>
      <div className="ops-head">
        <div>
          <h2 style={{ border: 'none', padding: 0 }}>📅 發佈行事曆</h2>
          <p className="ops-sub">內容側的時間總覽 —— 排程發佈 / 死線 / Banner 下架(版位檔期見廣告版位頁)</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="ghost sm" onClick={() => shift(-1)}>‹ 上個月</button>
          <b style={{ fontFamily: 'var(--mono)' }}>{year} 年 {month + 1} 月</b>
          <button className="ghost sm" onClick={() => shift(1)}>下個月 ›</button>
          <button className="ghost sm" onClick={() => { const n = new Date(); setYm([n.getFullYear(), n.getMonth()]); setSelDay(n) }}>📍 回到今天</button>
        </div>
      </div>

      <div className="panel ops-cal">
        <div className="ops-cal-head">{['日', '一', '二', '三', '四', '五', '六'].map((d) => <span key={d}>{d}</span>)}</div>
        <div className="ops-cal-grid">
          {cells.map((d, i) => {
            if (!d) return <div key={i} className="ops-cal-day dim" style={{ cursor: 'default' }} />
            const its = dayItems(d)
            const isToday = sameDay(d, today)
            const isSel = selDay ? sameDay(d, selDay) : false
            return (
              <div key={i} className={`ops-cal-day ${isToday ? 'today' : ''} ${isSel ? 'sel' : ''}`} onClick={() => setSelDay(d)}>
                <span className="ops-cal-num">{d.getDate()}</span>
                {its.slice(0, 3).map((x, j) => (
                  <span key={j} className={`ops-cal-item ${x.kind.includes('deadline') ? 'deadline' : ''} ${x.when < today && x.kind.includes('deadline') ? 'overdue-mark' : ''}`}>
                    {CAL_KIND[x.kind].icon} {x.task.client || x.task.title}
                  </span>
                ))}
                {its.length > 3 && <span className="ops-cal-item">+{its.length - 3} 更多</span>}
              </div>
            )
          })}
        </div>
      </div>

      {selDay && (
        <div className="panel">
          <h2>{selDay.getMonth() + 1}/{selDay.getDate()} 當日({selItems.length})</h2>
          {selItems.length === 0 && <p className="hint">這天沒有排程或死線</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {selItems.map((x, i) => (
              <div key={i} className="ops-qcard" onClick={() => navigate(`/kanban?task=${x.task.id}`)}>
                <div className="ops-qtop">
                  <span className="ops-qclient">{CAL_KIND[x.kind].icon} {x.task.client || '—'}</span>
                  <span className="ops-qstatus">{CAL_KIND[x.kind].label} · {fmtDT(x.when.toISOString())}</span>
                </div>
                <span className="ops-qtitle">{x.task.title}{x.task.status_label ? ` — ◉ ${x.task.status_label}` : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
