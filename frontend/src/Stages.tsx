import { marked } from 'marked'
import { useState } from 'react'
import { apiBase } from './api'
import { collapseSame, lineDiff } from './diff'

marked.setOptions({ gfm: true, breaks: true })

/** markdown → HTML（給人看的渲染；表格/標題/清單都成真元素）。 */
function mdToHtml(md: string): string {
  try { return marked.parse(md, { async: false }) as string }
  catch { return md }
}

type Status = 'pending' | 'running' | 'done' | 'error'
export type StageView = {
  id: string
  status: Status
  output?: Record<string, unknown> | null
  elapsedMs?: number
  tokens?: number
}

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
function abs(u: string): string {
  if (!u) return u
  return u.startsWith('http') ? u : `${apiBase}${u}`
}
function fmtMs(ms?: number): string {
  if (ms == null) return ''
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
}
/** 階段的「主文字」——用於字數與 diff。 */
function mainText(o: Record<string, unknown> | null | undefined): string {
  const x = rec(o)
  return String(x.markdown || x.text || rec(x.wordpress).content || x.final_html || x.html || '')
}

function OutputView({ output, prevOutput }: {
  output: Record<string, unknown>
  prevOutput: Record<string, unknown> | null
}) {
  const [view, setView] = useState<'pretty' | 'diff' | 'raw'>('pretty')
  const o = output
  const cover = (o.cover_image_url as string) || ''
  const html = (o.final_html as string) || (o.html as string) || ''
  const md = (o.markdown as string) || ''
  const wp = rec(o.wordpress)
  const cur = mainText(o)
  const prev = mainText(prevOutput)
  const canDiff = Boolean(cur && prev && cur !== prev)
  const known = new Set(['cover_image_url', 'final_html', 'html', 'markdown', 'wordpress', 'cover_image', 'cover_image_bytes', 'text', 'source', 'output_url', 'preview', 'chars', 'file', 'model', 'source_chars', 'result_chars', 'article_type', 'header_disclaimer', 'footer_disclaimer', 'supplier', 'url'])
  const rest = Object.fromEntries(Object.entries(o).filter(([k]) => !known.has(k)))

  return (
    <div className="out">
      <div className="row" style={{ marginBottom: 6 }}>
        <button className={`link ${view === 'pretty' ? 'cur' : ''}`} onClick={() => setView('pretty')}>內容</button>
        {canDiff && <button className={`link ${view === 'diff' ? 'cur' : ''}`} onClick={() => setView('diff')}>查看變更</button>}
        <button className={`link ${view === 'raw' ? 'cur' : ''}`} onClick={() => setView('raw')}>原始 JSON</button>
      </div>

      {view === 'raw' && <pre className="log">{JSON.stringify(o, null, 2).slice(0, 8000)}</pre>}

      {view === 'diff' && canDiff && (
        <div className="diff">
          {collapseSame(lineDiff(prev, cur)).map((l, i) =>
            'count' in l
              ? <div key={i} className="d-skip">⋯ {l.count} 行未變動 ⋯</div>
              : <div key={i} className={`d-${l.kind}`}>{l.kind === 'add' ? '+ ' : l.kind === 'del' ? '− ' : '  '}{l.text || ' '}</div>
          )}
        </div>
      )}

      {view === 'pretty' && (
        <>
          {Boolean(o.chars) && <div className="muted">抽取 {String(o.chars)} 字{o.source ? ` · ${String(o.source).split('/').pop()}` : ''}</div>}
          {cover && <img className="cover" src={abs(cover)} alt="cover" loading="lazy" />}
          {Boolean(wp.title) && (
            <div className="kv">
              <span className="k">標題</span><span>{String(wp.title)}</span>
              <span className="k">slug</span><span className="muted">{String(wp.slug || '')}</span>
              <span className="k">摘要</span><span>{String(wp.excerpt || '')}</span>
            </div>
          )}
          {html
            ? <iframe className="htmlframe" srcDoc={html} title="preview" />
            : md
              ? <MarkdownBox md={md} />
              : (o.text as string)
                ? <div className="md-render"><p style={{ whiteSpace: 'pre-wrap' }}>{String(o.text).slice(0, 8000)}</p></div>
                : null}
          {Object.keys(rest).length > 0 && (
            <details className="rest-fields">
              <summary>其他欄位（{Object.keys(rest).join('、')}）</summary>
              <pre className="log" style={{ fontSize: 11 }}>{JSON.stringify(rest, null, 2).slice(0, 1500)}</pre>
            </details>
          )}
        </>
      )}
    </div>
  )
}

/** 渲染 markdown 給人看（表格/標題/清單成真元素）；過長截斷並提示。 */
function MarkdownBox({ md }: { md: string }) {
  const LIMIT = 12000
  const truncated = md.length > LIMIT
  const html = mdToHtml(truncated ? md.slice(0, LIMIT) : md)
  return (
    <>
      <div className="md-render" dangerouslySetInnerHTML={{ __html: html }} />
      {truncated && <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>（內容過長，已截斷顯示；完整內容見「原始 JSON」）</div>}
    </>
  )
}

const ICON: Record<Status, string> = { pending: '○', running: '◐', done: '✓', error: '✕' }
const STATUS_TEXT: Record<string, string> = { pending: '等待中', running: '處理中', done: '已完成', error: '錯誤' }

function StageCard({ index, stage, prevOutput, originalInput, onRerun }: {
  index: number
  stage: StageView
  prevOutput: Record<string, unknown> | null
  originalInput: Record<string, unknown>
  onRerun: ((stageId: string, input: Record<string, unknown>) => void) | null
}) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const inputState = index === 0 ? originalInput : (prevOutput ?? {})
  const [draft, setDraft] = useState('')

  const o = rec(stage.output)
  const model = (o.model as string) || ''
  const curChars = mainText(o).length
  const prevChars = mainText(prevOutput).length
  const delta = stage.status === 'done' && curChars && prevChars ? curChars - prevChars : null

  function startEdit() {
    setDraft(JSON.stringify(inputState, null, 2))
    setEditing(true)
  }
  function confirmRerun() {
    try { onRerun?.(stage.id, JSON.parse(draft)); setEditing(false) }
    catch { setDraft(draft); alert('輸入不是合法 JSON') }
  }

  return (
    <div className={`stage-card ${stage.status}`}>
      <div className="stage-head">
        <span className="ic">{ICON[stage.status]}</span>
        <span className="name">{index + 1}. {STAGE_LABELS[stage.id] ?? stage.id}</span>
        <span className={`status ${stage.status}`}>{STATUS_TEXT[stage.status] ?? stage.status}</span>
        {stage.elapsedMs != null && <span className="meta-badge">{fmtMs(stage.elapsedMs)}</span>}
        {Boolean(stage.tokens) && <span className="meta-badge">{stage.tokens! >= 1000 ? `${(stage.tokens! / 1000).toFixed(1)}k` : stage.tokens} tok</span>}
        {model && <span className="meta-badge model">{model.split('/').pop()}</span>}
        {stage.status === 'done' && curChars > 0 && (
          <span className="meta-badge">{curChars} 字{delta != null && delta !== 0 ? ` (${delta > 0 ? '+' : ''}${delta})` : ''}</span>
        )}
        <span className="spacer" />
        {stage.status === 'done' && stage.output && (
          <button className="link" onClick={() => setOpen((v) => !v)}>{open ? '收合' : '查看'}</button>
        )}
        {onRerun && (stage.status === 'done' || stage.status === 'error') && (
          <button className="link" onClick={startEdit}>↻ 從這步重跑</button>
        )}
      </div>
      {stage.status === 'running' && <div className="stage-msg">{STAGE_MESSAGES[stage.id] ?? '處理中...'}</div>}
      {open && stage.output && <OutputView output={stage.output} prevOutput={prevOutput} />}
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

export function StageList({ stages, originalInput, onRerun, grouped = true, meta, totalMs }: {
  stages: StageView[]
  originalInput: Record<string, unknown>
  onRerun: ((stageId: string, input: Record<string, unknown>) => void) | null
  grouped?: boolean
  meta?: string
  totalMs?: number | null
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
          <span className={hasError ? 'err' : 'muted'}>
            {overallText} · {pct}% 完成{totalMs ? ` · 共 ${fmtMs(totalMs)}` : ''}
          </span>
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
