import { useEffect, useRef, useState } from 'react'

export type Uploaded = { file: string; original_name: string; size: number }

export const ACCEPT = '.pdf,.docx,.md,.txt,.html,.htm,.rtf'

export function acceptOk(name: string): boolean {
  const ext = '.' + (name.split('.').pop()?.toLowerCase() ?? '')
  return ACCEPT.split(',').includes(ext)
}

function fileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return <span className="ficon pdf">PDF</span>
  if (ext === 'docx') return <span className="ficon docx">DOC</span>
  return <span className="ficon md">TXT</span>
}

/** 拖放上傳（展示元件；上傳邏輯在父層，讓全頁拖放共用同一條路）。 */
export function FileDrop({ uploaded, uploading, onFile, onReset }: {
  uploaded: Uploaded | null
  uploading: boolean
  onFile: (f: File) => void
  onReset: () => void
}) {
  const [drag, setDrag] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  if (uploaded) {
    return (
      <div className="file-card">
        {fileIcon(uploaded.original_name)}
        <div className="finfo">
          <div className="fname">{uploaded.original_name}</div>
          <div className="muted">({(uploaded.size / 1024).toFixed(1)} KB) · 已上傳</div>
        </div>
        <button className="ghost" onClick={() => { onReset(); if (inputRef.current) inputRef.current.value = '' }}>重設</button>
      </div>
    )
  }
  return (
    <>
      <div
        className={`dropzone ${drag ? 'drag' : ''} ${uploading ? 'busy' : ''}`}
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(f) }}
      >
        <div className="dz-icon">{uploading ? <span className="spin">◐</span> : '⬆'}</div>
        <div>{uploading ? '上傳中…' : '拖放文件到這裡或點擊選擇'}</div>
        <div className="muted">支持 PDF、DOCX 和其他文本格式（拖到頁面任何位置都可以）</div>
      </div>
      <input ref={inputRef} type="file" accept={ACCEPT} style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
    </>
  )
}

/** 全頁拖放：擋掉瀏覽器預設「開啟檔案」行為；拖進視窗任何位置都顯示 overlay 並可放開上傳。 */
export function useGlobalDrop(onFile: (f: File) => void): boolean {
  const [over, setOver] = useState(false)
  const depth = useRef(0)
  useEffect(() => {
    const hasFiles = (e: DragEvent) => [...(e.dataTransfer?.types ?? [])].includes('Files')
    const enter = (e: DragEvent) => { if (!hasFiles(e)) return; e.preventDefault(); depth.current++; setOver(true) }
    const over_ = (e: DragEvent) => { if (hasFiles(e)) e.preventDefault() }
    const leave = (e: DragEvent) => { if (!hasFiles(e)) return; depth.current = Math.max(0, depth.current - 1); if (depth.current === 0) setOver(false) }
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault() // 永遠擋預設（避免瀏覽器直接開檔）
      depth.current = 0; setOver(false)
      const f = e.dataTransfer?.files?.[0]
      if (f) onFile(f)
    }
    window.addEventListener('dragenter', enter)
    window.addEventListener('dragover', over_)
    window.addEventListener('dragleave', leave)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragover', over_)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('drop', drop)
    }
  }, [onFile])
  return over
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

export function UrlInput({ url, onUrl }: { url: string; onUrl: (u: string) => void }) {
  const t = detectUrlType(url)
  const valid = !url || /^https?:\/\/.+\..+/.test(url)
  return (
    <>
      <label>文章連結</label>
      <div className="url-wrap">
        <input type="text" value={url} placeholder="輸入URL，例如：https://example.com/article"
          inputMode="url" autoCapitalize="off" autoCorrect="off"
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
