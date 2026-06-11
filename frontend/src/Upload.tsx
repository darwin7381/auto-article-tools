import { useRef, useState } from 'react'
import { uploadFile } from './api'

export type Uploaded = { file: string; original_name: string; size: number }

const ACCEPT = '.pdf,.docx,.md,.txt'

function fileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return <span className="ficon pdf">PDF</span>
  if (ext === 'docx') return <span className="ficon docx">DOC</span>
  return <span className="ficon md">TXT</span>
}

/** 拖放上傳（復刻舊版 FileUpload：拖放區/檔案卡/重設）。 */
export function FileDrop({ uploaded, onUploaded }: {
  uploaded: Uploaded | null
  onUploaded: (u: Uploaded | null) => void
}) {
  const [drag, setDrag] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(f: File | undefined | null) {
    if (!f) return
    const ext = '.' + (f.name.split('.').pop()?.toLowerCase() ?? '')
    if (!ACCEPT.includes(ext)) { setErr(`不支援的格式 ${ext}（支持 PDF、DOCX、MD）`); return }
    setErr(''); setBusy(true)
    try {
      onUploaded(await uploadFile(f))
    } catch (e) {
      setErr('上傳失敗：' + String(e))
    } finally { setBusy(false) }
  }

  if (uploaded) {
    return (
      <div className="file-card">
        {fileIcon(uploaded.original_name)}
        <div className="finfo">
          <div className="fname">{uploaded.original_name}</div>
          <div className="muted">({(uploaded.size / 1024).toFixed(1)} KB) · 已上傳</div>
        </div>
        <button className="ghost" onClick={() => { onUploaded(null); if (inputRef.current) inputRef.current.value = '' }}>重設</button>
      </div>
    )
  }

  return (
    <>
      <div
        className={`dropzone ${drag ? 'drag' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files?.[0]) }}
      >
        <div className="dz-icon">⬆</div>
        <div>{busy ? '上傳中…' : '拖放文件到這裡或點擊選擇'}</div>
        <div className="muted">支持 PDF、DOCX 和其他文本格式</div>
      </div>
      <input ref={inputRef} type="file" accept={ACCEPT} style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files?.[0])} />
      {err && <p className="err">{err}</p>}
    </>
  )
}

export type UrlType = 'website' | 'gdocs' | 'medium' | 'wechat'

export function detectUrlType(url: string): UrlType {
  if (/docs\.google\.com/.test(url)) return 'gdocs'
  if (/(^|\.)medium\.com/.test(url)) return 'medium'
  if (/weixin\.qq\.com/.test(url)) return 'wechat'
  return 'website'
}

const URL_TYPES: { key: UrlType; label: string }[] = [
  { key: 'website', label: '一般網站' },
  { key: 'gdocs', label: 'Google Docs' },
  { key: 'medium', label: 'Medium' },
  { key: 'wechat', label: 'WeChat' },
]

/** 連結輸入（復刻舊版：類型自動偵測徽章 + 清除鈕 + 驗證）。 */
export function UrlInput({ url, onUrl }: { url: string; onUrl: (u: string) => void }) {
  const t = detectUrlType(url)
  const valid = !url || /^https?:\/\/.+\..+/.test(url)
  return (
    <>
      <label>文章連結</label>
      <div className="url-wrap">
        <input type="text" value={url} placeholder="輸入URL，例如：https://example.com/article"
          onChange={(e) => onUrl(e.target.value)} />
        {url && <button className="clear" onClick={() => onUrl('')} title="清除">✕</button>}
      </div>
      {!valid && <p className="err">請輸入有效的URL</p>}
      <div className="url-types">
        {URL_TYPES.map((u) => (
          <span key={u.key} className={`chip ${url && t === u.key ? 'on' : ''}`}>{u.label}</span>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 12 }}>
        系統會自動偵測連結類型（Google Docs / Medium / WeChat 有專門的抽取方式）。
      </p>
    </>
  )
}
