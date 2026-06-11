import { EditorContent, useEditor } from '@tiptap/react'
import Image from '@tiptap/extension-image'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import StarterKit from '@tiptap/starter-kit'
import { useEffect, useState } from 'react'

/** TipTap 富文本審稿器：可視化 / HTML 雙模式（復刻舊版編輯器並強化）。
 *  用 key={job.id} 讓每次換 job 重新掛載。 */
export function RichEditor({ html, onChange }: { html: string; onChange: (html: string) => void }) {
  const [mode, setMode] = useState<'visual' | 'html'>('visual')
  const [rawHtml, setRawHtml] = useState(html)
  const [insert, setInsert] = useState<'link' | 'image' | null>(null)
  const [f1, setF1] = useState('') // link url / image url
  const [f2, setF2] = useState('') // link text / image alt

  const editor = useEditor({
    extensions: [
      StarterKit, // v3 已含 link / underline
      Image,
      Table.configure({ resizable: false }),
      TableRow, TableHeader, TableCell,
    ],
    content: html,
    onUpdate: ({ editor }) => {
      const h = editor.getHTML()
      setRawHtml(h)
      onChange(h)
    },
  })

  useEffect(() => () => editor?.destroy(), [editor])
  if (!editor) return null

  function switchMode(m: 'visual' | 'html') {
    if (m === 'visual' && mode === 'html') editor!.commands.setContent(rawHtml)
    setMode(m)
  }
  function onRawChange(v: string) {
    setRawHtml(v)
    onChange(v)
  }
  function doInsert() {
    if (insert === 'link' && f1) {
      if (f2) editor!.chain().focus().insertContent(`<a href="${f1}">${f2}</a>`).run()
      else editor!.chain().focus().setLink({ href: f1 }).run()
    }
    if (insert === 'image' && f1) {
      editor!.chain().focus().setImage({ src: f1, alt: f2 || '' }).run()
    }
    setInsert(null); setF1(''); setF2('')
  }

  const T = ({ on, label, act, title }: { on?: boolean; label: string; act: () => void; title?: string }) => (
    <button title={title} className={on ? 'on' : ''} onMouseDown={(e) => { e.preventDefault(); act() }}>{label}</button>
  )

  return (
    <div className="editor">
      <div className="editor-tabs">
        <button className={mode === 'visual' ? 'on' : ''} onClick={() => switchMode('visual')}>可視化編輯</button>
        <button className={mode === 'html' ? 'on' : ''} onClick={() => switchMode('html')}>HTML編輯</button>
      </div>

      {mode === 'visual' && (
        <>
          <div className="toolbar">
            <T on={editor.isActive('bold')} label="B" act={() => editor.chain().focus().toggleBold().run()} title="粗體" />
            <T on={editor.isActive('italic')} label="I" act={() => editor.chain().focus().toggleItalic().run()} title="斜體" />
            <T on={editor.isActive('underline')} label="U" act={() => editor.chain().focus().toggleUnderline().run()} title="底線" />
            <T on={editor.isActive('strike')} label="S" act={() => editor.chain().focus().toggleStrike().run()} title="刪除線" />
            <span className="sep" />
            <T on={editor.isActive('heading', { level: 2 })} label="H2" act={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
            <T on={editor.isActive('heading', { level: 3 })} label="H3" act={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
            <T on={editor.isActive('heading', { level: 4 })} label="H4" act={() => editor.chain().focus().toggleHeading({ level: 4 }).run()} />
            <span className="sep" />
            <T on={editor.isActive('bulletList')} label="• 列表" act={() => editor.chain().focus().toggleBulletList().run()} />
            <T on={editor.isActive('orderedList')} label="1. 編號" act={() => editor.chain().focus().toggleOrderedList().run()} />
            <span className="sep" />
            <T on={editor.isActive('blockquote')} label="引用" act={() => editor.chain().focus().toggleBlockquote().run()} />
            <T label="分隔線" act={() => editor.chain().focus().setHorizontalRule().run()} />
            <span className="sep" />
            <T on={insert === 'link'} label="連結" act={() => { setInsert(insert === 'link' ? null : 'link'); setF1(''); setF2('') }} />
            <T on={insert === 'image'} label="圖片" act={() => { setInsert(insert === 'image' ? null : 'image'); setF1(''); setF2('') }} />
            <T label="表格" act={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} />
            <span className="sep" />
            <T label="↶" act={() => editor.chain().focus().undo().run()} title="復原" />
            <T label="↷" act={() => editor.chain().focus().redo().run()} title="重做" />
          </div>
          {insert && (
            <div className="insert-bar">
              <input type="text" placeholder={insert === 'link' ? 'URL 地址（https://example.com）' : '圖片URL地址'} value={f1} onChange={(e) => setF1(e.target.value)} />
              <input type="text" placeholder={insert === 'link' ? '連結文字（選填）' : '替代文字 Alt（選填）'} value={f2} onChange={(e) => setF2(e.target.value)} />
              <button className="ghost" onClick={doInsert}>{insert === 'link' ? '添加連結' : '插入圖片'}</button>
              <button className="link" onClick={() => setInsert(null)}>取消</button>
            </div>
          )}
          {editor.isActive('table') && (
            <div className="toolbar table-bar">
              <T label="左加列" act={() => editor.chain().focus().addColumnBefore().run()} />
              <T label="右加列" act={() => editor.chain().focus().addColumnAfter().run()} />
              <T label="刪列" act={() => editor.chain().focus().deleteColumn().run()} />
              <T label="上加行" act={() => editor.chain().focus().addRowBefore().run()} />
              <T label="下加行" act={() => editor.chain().focus().addRowAfter().run()} />
              <T label="刪行" act={() => editor.chain().focus().deleteRow().run()} />
              <T label="刪表格" act={() => editor.chain().focus().deleteTable().run()} />
            </div>
          )}
          <EditorContent editor={editor} className="tiptap" />
        </>
      )}

      {mode === 'html' && (
        <textarea
          className="html-editor"
          value={rawHtml}
          placeholder="輸入HTML代碼..."
          onChange={(e) => onRawChange(e.target.value)}
        />
      )}
    </div>
  )
}
