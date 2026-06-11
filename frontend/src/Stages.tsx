import { useState } from 'react'
import { apiBase } from './api'

type Status = 'pending' | 'running' | 'done' | 'error'
export type StageView = { id: string; status: Status; output?: Record<string, unknown> | null }

/** 階段中文名（對齊舊版）。 */
export const STAGE_LABELS: Record<string, string> = {
  extract: '提取內容',
  content_ai: 'AI 初步內容處理',
  pr_writer: 'PR writer 處理',
  format_conversion: '格式轉換',
  copy_editing: 'AI 上稿編修',
  cover_image: '封面圖處理',
  article_formatting: '進階格式化',
  uppercase: '大寫化',
  exclaim: '加驚嘆號',
}

/** 階段分組（對齊舊版：初步/後期）。沒列到的階段歸入後期。 */
const GROUPS: { title: string; ids: string[] }[] = [
  { title: '初步處理階段', ids: ['extract', 'content_ai'] },
  { title: '後期處理階段', ids: ['pr_writer', 'format_conversion', 'copy_editing', 'cover_image', 'article_formatting'] },
]

const STAGE_MESSAGES: Record<string, string> = {
  extract: '提取內容中...',
  content_ai: 'AI 初步內容處理中...',
  pr_writer: 'PR writer 處理中...',
  format_conversion: '格式轉換中...',
  copy_editing: 'AI 上稿編修中...',
  cover_image: '封面圖生成中...',
  article_formatting: '進階格式化中...',
}

function rec(o: unknown): Record<string, unknown> {
  return (o ?? {}) as Record<string, unknown>
}

/** 把後端相對的 /files URL 補成可直接開的絕對 URL（tunnel/同源都通）。 */
function abs(u: string): string {
  if (!u) return u
  if (u.startsWith('http')) return u
  return `${apiBase}${u}`
}

/** 一個階段的輸出渲染：認得的欄位特別顯示，其餘 JSON。 */
function OutputView({ output }: { output: Record<string, unknown> }) {
  const [raw, setRaw] = useState(false)
  const o = output
  const cover = (o.cover_image_url as string) || ''
  const html = (o.final_html as string) || (o.html as string) || ''
  const md = (o.markdown as string) || ''
  const wp = rec(o.wordpress)
  const known = new Set(['cover_image_url', 'final_html', 'html', 'markdown', 'wordpress', 'cover_image', 'cover_image_bytes', 'text', 'source', 'output_url', 'preview', 'chars', 'file'])
  const rest = Object.fromEntries(Object.entries(o).filter(([k]) => !known.has(k)))

  if (raw) {
    return (
      <>
        <button className="link" onClick={() => setRaw(false)}>← 回正常檢視</button>
        <pre className="log">{JSON.stringify(o, null, 2).slice(0, 8000)}</pre>
      </>
    )
  }
  return (
    <div className="out">
      {Boolean(o.chars) && <div className="muted">抽取 {String(o.chars)} 字{o.source ? ` · ${String(o.source).split('/').pop()}` : ''}</div>}
      {cover && <img className="cover" src={abs(cover)} alt="cover" />}
      {Boolean(wp.title) && (
        <div className="kv">
          <span className="k">標題</span><span>{String(wp.title)}</span>
          <span className="k">slug</span><span className="muted">{String(wp.slug || '')}</span>
          <span className="k">摘要</span><span>{String(wp.excerpt || '')}</span>
        </div>
      )}
      {html && <iframe className="htmlframe" srcDoc={html} title="preview" />}
      {!html && md && <pre className="log" style={{ color: '#cdd3dc' }}>{md.slice(0, 4000)}</pre>}
      {!html && !md && (o.text as string) && <pre className="log" style={{ color: '#cdd3dc' }}>{String(o.text).slice(0, 4000)}</pre>}
      {Object.keys(rest).length > 0 && <pre className="log" style={{ fontSize: 11 }}>{JSON.stringify(rest, null, 2).slice(0, 2000)}</pre>}
      <button className="link" onClick={() => setRaw(true)}>檢視原始 JSON →</button>
    </div>
  )
}

const ICON: Record<Status, string> = { pending: '○', running: '◐', done: '✓', error: '✕' }

function StageCard({
  index, stage, prevOutput, originalInput, onRerun,
}: {
  index: number
  stage: StageView
  prevOutput: Record<string, unknown> | null
  originalInput: Record<string, unknown>
  onRerun: (stageId: string, input: Record<string, unknown>) => void
}) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const inputState = index === 0 ? originalInput : (prevOutput ?? {})
  const [draft, setDraft] = useState('')

  function startEdit() {
    setDraft(JSON.stringify(inputState, null, 2))
    setEditing(true)
  }
  function confirmRerun() {
    try {
      onRerun(stage.id, JSON.parse(draft))
      setEditing(false)
    } catch {
      alert('輸入不是合法 JSON')
    }
  }

  const STATUS_TEXT: Record<string, string> = { pending: '等待中', running: '處理中', done: '已完成', error: '錯誤' }
  return (
    <div className={`stage-card ${stage.status}`}>
      <div className="stage-head">
        <span className="ic">{ICON[stage.status]}</span>
        <span className="name">{index + 1}. {STAGE_LABELS[stage.id] ?? stage.id}</span>
        <span className={`status ${stage.status}`}>{STATUS_TEXT[stage.status] ?? stage.status}</span>
        <span className="spacer" />
        {stage.status === 'done' && stage.output && (
          <button className="link" onClick={() => setOpen((v) => !v)}>{open ? '收合' : '查看'}</button>
        )}
        {(stage.status === 'done' || stage.status === 'error') && (
          <button className="link" onClick={startEdit}>↻ 從這步重跑</button>
        )}
      </div>
      {stage.status === 'running' && (
        <div className="stage-msg">{STAGE_MESSAGES[stage.id] ?? '處理中...'}</div>
      )}
      {open && stage.output && <OutputView output={stage.output} />}
      {editing && (
        <div className="rerun">
          <label>這步的輸入（可編輯後重跑，下游階段會接著重跑）</label>
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} style={{ minHeight: 140, fontFamily: 'ui-monospace, monospace', fontSize: 12 }} />
          <div className="row" style={{ marginTop: 8 }}>
            <button className="ghost" onClick={confirmRerun}>重跑此階段 ↻</button>
            <button className="link" onClick={() => setEditing(false)}>取消</button>
          </div>
        </div>
      )}
    </div>
  )
}

export function StageList({
  stages, originalInput, onRerun, grouped = true, meta,
}: {
  stages: StageView[]
  originalInput: Record<string, unknown>
  onRerun: (stageId: string, input: Record<string, unknown>) => void
  grouped?: boolean
  meta?: string // 檔名 / 連結，顯示在進度條下
}) {
  const doneCount = stages.filter((s) => s.status === 'done').length
  const hasError = stages.some((s) => s.status === 'error')
  const pct = stages.length ? Math.round((doneCount / stages.length) * 100) : 0
  const overallText = hasError ? '錯誤' : pct === 100 ? '已完成' : doneCount > 0 || stages.some((s) => s.status === 'running') ? '處理中' : '等待開始'

  const card = (s: StageView) => {
    const i = stages.findIndex((x) => x.id === s.id)
    return (
      <StageCard key={s.id} index={i} stage={s}
        prevOutput={i > 0 ? stages[i - 1].output ?? null : null}
        originalInput={originalInput} onRerun={onRerun} />
    )
  }

  const groupedIds = new Set(GROUPS.flatMap((g) => g.ids))
  const ungrouped = stages.filter((s) => !groupedIds.has(s.id))

  return (
    <div className="stage-list">
      <div className="overall">
        <div className="row">
          <span>處理進度</span>
          <span className="spacer" />
          <span className={hasError ? 'err' : 'muted'}>{overallText} · {pct}% 完成</span>
        </div>
        <div className="bar"><div className={`fill ${hasError ? 'bad' : ''}`} style={{ width: `${pct}%` }} /></div>
        {meta && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{meta}</div>}
      </div>
      {grouped ? (
        <>
          {GROUPS.map((g) => {
            const items = stages.filter((s) => g.ids.includes(s.id))
            if (items.length === 0) return null
            return (
              <div key={g.title} className="stage-group">
                <div className="group-title">{g.title}</div>
                {items.map(card)}
              </div>
            )
          })}
          {ungrouped.length > 0 && <div className="stage-group">{ungrouped.map(card)}</div>}
        </>
      ) : stages.map(card)}
    </div>
  )
}
