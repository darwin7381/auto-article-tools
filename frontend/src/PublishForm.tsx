import { useState } from 'react'
import { publishJob, type Job } from './api'
import { toast } from './toast'

function rec(o: unknown): Record<string, unknown> {
  return (o ?? {}) as Record<string, unknown>
}
function idsOf(list: unknown): string {
  if (!Array.isArray(list)) return ''
  return list.map((x) => rec(x).id).filter(Boolean).join(',')
}

/** WordPress 上稿表單（復刻舊版全部欄位 + 摘要），content 來自審稿編輯器。 */
export function PublishForm({ job, editedHtml, defaultStatus }: {
  job: Job
  editedHtml: string
  defaultStatus: string
}) {
  const r = rec(job.result)
  const wp = rec(r.wordpress)
  const [title, setTitle] = useState(String(wp.title || ''))
  const [slug, setSlug] = useState(String(wp.slug || ''))
  const [excerpt, setExcerpt] = useState(String(wp.excerpt || ''))
  const [author, setAuthor] = useState('')
  const [cats, setCats] = useState(idsOf(wp.categories))
  const [tags, setTags] = useState(idsOf(wp.tags))
  const [status, setStatus] = useState(defaultStatus)
  const [date, setDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<{ link?: string; status?: string } | null>(null)
  const [err, setErr] = useState('')
  const [confirming, setConfirming] = useState(false)
  const coverUrl = (r.cover_image_url as string) || ''

  function precheck(): boolean {
    if (!title.trim()) { setErr('文章標題為必填'); toast.err('文章標題為必填'); return false }
    if (status === 'future' && !date) { setErr('選擇「定時發布」時必須設定發布日期時間'); return false }
    return true
  }

  /** 對外動作防呆：直接發布/定時/私密需內嵌確認；草稿/待審不擋。 */
  function onPublishClick() {
    if (!precheck()) return
    if (status === 'publish' || status === 'future') { setConfirming(true); return }
    publish()
  }

  async function publish() {
    setConfirming(false)
    setBusy(true); setErr(''); setDone(null)
    try {
      const toIds = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean).map((id) => ({ id: Number(id) }))
      const overrides: Record<string, unknown> = {
        title: title.trim(),
        slug: slug.trim() || undefined,
        excerpt,
        content: editedHtml || undefined,
        categories: cats ? toIds(cats) : undefined,
        tags: tags ? toIds(tags) : undefined,
        author: author.trim() ? Number(author.trim()) : undefined,
        date: date || undefined,
      }
      const out = await publishJob(job.id, status, overrides)
      setDone(out)
      toast.ok(`發布成功（${out.status}）`)
    } catch (e) {
      setErr(String(e))
      toast.err('發布失敗')
    } finally { setBusy(false) }
  }

  return (
    <div className="pubform">
      <div className="two-col">
        <div>
          <label>文章標題 <span className="req">*</span></label>
          <input type="text" value={title} placeholder="請輸入文章標題" onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label>自訂連結 (slug)</label>
          <input type="text" value={slug} placeholder="例如: my-custom-article-url" onChange={(e) => setSlug(e.target.value)} />
          <p className="hint">不填寫時將自動根據標題生成{wp.slug ? ` · 自動提取: ${String(wp.slug)}` : ''}</p>
        </div>
      </div>
      <label>摘要 (excerpt)</label>
      <textarea value={excerpt} style={{ minHeight: 56 }} onChange={(e) => setExcerpt(e.target.value)} />
      <div className="two-col">
        <div>
          <label>分類 ID（多個用逗號分隔）</label>
          <input type="text" value={cats} placeholder="例如: 1,4,7" onChange={(e) => setCats(e.target.value)} />
          {idsOf(wp.categories) && <p className="hint">自動提取: {idsOf(wp.categories)}</p>}
        </div>
        <div>
          <label>標籤 ID（多個用逗號分隔）</label>
          <input type="text" value={tags} placeholder="例如: 315,316" onChange={(e) => setTags(e.target.value)} />
          {idsOf(wp.tags) && <p className="hint">自動提取: {idsOf(wp.tags)}</p>}
        </div>
      </div>
      <div className="two-col">
        <div>
          <label>指定作者 (ID)</label>
          <input type="text" value={author} placeholder="例如: 1（不填用 API 登入者）" onChange={(e) => setAuthor(e.target.value)} />
        </div>
        <div>
          <label>發布狀態</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="draft">草稿</option>
            <option value="pending">待審核</option>
            <option value="publish">直接發布</option>
            <option value="future">定時發布</option>
            <option value="private">私密文章</option>
          </select>
        </div>
      </div>
      {status === 'future' && (
        <>
          <label>發布日期時間</label>
          <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
          <p className="hint">選擇「定時發布」時必須設定未來的發布日期時間</p>
        </>
      )}
      {coverUrl && (
        <>
          <label>特色圖片（pipeline 產出，發布時自動上傳到媒體庫）</label>
          <img className="cover" src={coverUrl} alt="featured" style={{ maxHeight: 160, objectFit: 'cover' }} />
        </>
      )}

      <div className="row" style={{ marginTop: 14 }}>
        <button className="primary" style={{ width: 'auto', marginTop: 0 }} disabled={busy || confirming} onClick={onPublishClick}>
          {busy ? '發布中...' : '發布到WordPress'}
        </button>
        {done && (
          <span className="ok-box">✓ 發布成功！文章已發送到WordPress（{done.status}）
            {done.link && <> · <a href={done.link} target="_blank" rel="noreferrer">在WordPress中查看文章</a></>}
          </span>
        )}
      </div>
      {confirming && (
        <div className="confirm-box">
          即將以「{status === 'publish' ? '直接發布' : '定時發布'}」發到 <b>wp.blocktempo.ai</b>，文章會公開可見。確定？
          <div className="row" style={{ marginTop: 8 }}>
            <button className="primary" style={{ width: 'auto', marginTop: 0 }} onClick={publish}>確認發布</button>
            <button className="ghost" onClick={() => setConfirming(false)}>取消</button>
          </div>
        </div>
      )}
      {err && <div className="err-box">發布失敗：{err}</div>}
    </div>
  )
}
