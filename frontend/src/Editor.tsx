import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

/** TipTap 富文本審稿器（純前端）。用 key={job.id} 讓每次換 job 重新掛載、載入新內容。 */
export function RichEditor({ html, onChange }: { html: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: html,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })
  if (!editor) return null
  return (
    <div className="editor">
      <div className="toolbar">
        <button onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'on' : ''}><b>B</b></button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'on' : ''}><i>I</i></button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive('heading', { level: 2 }) ? 'on' : ''}>H2</button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={editor.isActive('heading', { level: 3 }) ? 'on' : ''}>H3</button>
        <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={editor.isActive('bulletList') ? 'on' : ''}>• List</button>
        <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={editor.isActive('blockquote') ? 'on' : ''}>❝</button>
      </div>
      <EditorContent editor={editor} className="tiptap" />
    </div>
  )
}
