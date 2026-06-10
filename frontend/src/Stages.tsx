import { useState } from 'react'
import { apiBase } from './api'

type Status = 'pending' | 'running' | 'done' | 'error'
export type StageView = { id: string; status: Status; output?: Record<string, unknown> | null }

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

  return (
    <div className={`stage-card ${stage.status}`}>
      <div className="stage-head">
        <span className="ic">{ICON[stage.status]}</span>
        <span className="name">{index + 1}. {stage.id}</span>
        <span className={`status ${stage.status}`}>{stage.status}</span>
        <span className="spacer" />
        {stage.status === 'done' && stage.output && (
          <button className="link" onClick={() => setOpen((v) => !v)}>{open ? '收合' : '檢視結果'}</button>
        )}
        {(stage.status === 'done' || stage.status === 'error') && (
          <button className="link" onClick={startEdit}>↻ 從這步重跑</button>
        )}
      </div>
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
  stages, originalInput, onRerun,
}: {
  stages: StageView[]
  originalInput: Record<string, unknown>
  onRerun: (stageId: string, input: Record<string, unknown>) => void
}) {
  return (
    <div className="stage-list">
      {stages.map((s, i) => (
        <StageCard
          key={s.id}
          index={i}
          stage={s}
          prevOutput={i > 0 ? stages[i - 1].output ?? null : null}
          originalInput={originalInput}
          onRerun={onRerun}
        />
      ))}
    </div>
  )
}
