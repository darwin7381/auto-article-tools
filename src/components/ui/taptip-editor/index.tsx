'use client';

import { useState, useCallback, useEffect } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { Mark, mergeAttributes } from '@tiptap/core';
import { Button } from '../button/Button';

// 定義編輯器視圖類型
type EditorView = 'visual' | 'html';

// 編輯器組件Props
export interface TapEditorProps {
  initialContent?: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
}

// 自定義Span標記擴展，用於保留所有HTML屬性
const SpanMark = Mark.create({
  name: 'span',
  
  parseHTML() {
    return [
      { tag: 'span' },
    ];
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0];
  },
  
  addAttributes() {
    return {
      class: {
        default: null,
        parseHTML: element => element.getAttribute('class'),
        renderHTML: attributes => {
          if (!attributes.class) {
            return {};
          }
          return { class: attributes.class };
        },
      },
      style: {
        default: null,
        parseHTML: element => element.getAttribute('style'),
        renderHTML: attributes => {
          if (!attributes.style) {
            return {};
          }
          return { style: attributes.style };
        },
      },
      id: {
        default: null,
        parseHTML: element => element.getAttribute('id'),
        renderHTML: attributes => {
          if (!attributes.id) {
            return {};
          }
          return { id: attributes.id };
        },
      },
      'data-dropcap': {
        default: null,
        parseHTML: element => element.getAttribute('data-dropcap'),
        renderHTML: attributes => {
          if (!attributes['data-dropcap']) {
            return {};
          }
          return { 'data-dropcap': attributes['data-dropcap'] };
        },
      },
    };
  },
});

/**
 * TapEditor - 使用Tiptap實現的富文本編輯器
 */
export function TapEditor({ initialContent = '', onChange, placeholder = '開始輸入內容...', className = '' }: TapEditorProps) {
  // 控制當前視圖模式
  const [currentView, setCurrentView] = useState<EditorView>('visual');
  // 用來存儲HTML源碼的狀態
  const [htmlSource, setHtmlSource] = useState<string>(initialContent);
  // 連結和圖片面板控制
  const [linkMenuIsActive, setLinkMenuIsActive] = useState(false);
  const [linkUrl, setLinkUrl] = useState<string>('');
  const [linkText, setLinkText] = useState<string>('');
  const [imageMenuIsActive, setImageMenuIsActive] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageAlt, setImageAlt] = useState<string>('');

  // 初始化Tiptap編輯器，配置為保留HTML樣式屬性
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
      Link.configure({
        openOnClick: false,
        linkOnPaste: true,
        HTMLAttributes: {
          class: 'text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'mx-auto my-4 max-w-full rounded',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Underline,
      // 添加自定義標記以保留span標籤的樣式
      SpanMark,
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      try {
        const html = editor.getHTML();
        setHtmlSource(html);
        onChange(html);
      } catch (err) {
        console.error('更新內容錯誤:', err);
      }
    },
    editorProps: {
      attributes: {
        class: `prose prose-lg dark:prose-invert focus:outline-none p-4 w-full max-w-none ${className.includes('h-full') ? 'min-h-[80vh]' : 'min-h-[300px]'}`,
      },
      // 保留粘貼的HTML原始格式
      transformPastedHTML: (html) => html,
      // 防止自動滾動到底部
      scrollThreshold: 0,
      scrollMargin: 0,
    },
  }, [currentView === 'visual', className]);

  // 當視圖切換時進行處理
  useEffect(() => {
    if (currentView === 'visual' && editor) {
      // 視覺模式下，設置編輯器內容
      editor.commands.setContent(htmlSource);
      
      // 設置光標位置但不強制滾動
      editor.commands.focus('start');
    }
  }, [currentView, editor]); // 移除htmlSource依賴，避免每次內容變化都觸發滾動

  // 單獨處理htmlSource變化的邏輯，不包含滾動
  useEffect(() => {
    if (currentView === 'visual' && editor && htmlSource) {
      // 不設置內容，避免重新渲染和光標跳轉
      // 只在視圖切換時設置內容，而不是每次htmlSource變化都設置
    }
  }, [htmlSource]);

  // 處理HTML源碼更改
  const handleHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newHtml = e.target.value;
    setHtmlSource(newHtml);
    onChange(newHtml);
  };

  // 添加連結功能
  const handleAddLink = useCallback(() => {
    if (!editor) return;
    
    if (!linkUrl) {
      setLinkMenuIsActive(false);
      return;
    }

    // 如果沒有添加https協議，自動添加
    const url = linkUrl.startsWith('http://') || linkUrl.startsWith('https://') 
      ? linkUrl 
      : `https://${linkUrl}`;
      
    // 如果沒有選中文本，則先插入連結文本
    if (editor.state.selection.empty && linkText) {
      editor.chain()
        .focus()
        .insertContent(`<a href="${url}">${linkText}</a>`)
        .run();
    } else {
      // 如果已選中文本，則直接設置連結
      editor.chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: url })
        .run();
    }
      
    setLinkUrl('');
    setLinkText('');
    setLinkMenuIsActive(false);
  }, [editor, linkUrl, linkText]);

  // 添加圖片功能
  const handleAddImage = useCallback(() => {
    if (!editor || !imageUrl) return;
    
    editor.chain()
      .focus()
      .setImage({ 
        src: imageUrl,
        alt: imageAlt || '圖片' 
      })
      .run();
      
    setImageUrl('');
    setImageAlt('');
    setImageMenuIsActive(false);
  }, [editor, imageUrl, imageAlt]);

  // CSS樣式
  const editorStyles = `
    .ProseMirror {
      outline: none;
      height: 100%;
      min-height: 300px;
      padding-bottom: 100px; /* 確保滾動到底部有足夠空間 */
    }
    
    .tiptap-toolbar {
      position: sticky !important;
      top: 0 !important;
      z-index: 9999 !important;
      background-color: inherit !important;
    }
    
    .tiptap-toolbar + .tiptap-toolbar {
      top: 41px !important; /* 第二個工具欄的位置 */
    }
    
    .fullscreen-editor .tiptap-toolbar {
      position: sticky !important;
      top: 0 !important;
      z-index: 9999 !important;
    }
    
    /* 確保內容區域有正確的相對定位，這樣sticky才能正常工作 */
    .tiptap-editor-container {
      position: relative !important;
      overflow: visible !important;
    }
    
    /* 修復可視化編輯模式下的問題 */
    .tiptap-editor-container > div {
      overflow: visible !important;
    }
    
    .ProseMirror h1 {
      font-size: 2.25rem;
      line-height: 2.5rem;
      font-weight: 700;
      margin-top: 1.5rem;
      margin-bottom: 1rem;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 0.5rem;
    }
    
    .ProseMirror h2 {
      font-size: 1.875rem;
      line-height: 2.25rem;
      font-weight: 600;
      margin-top: 1.5rem;
      margin-bottom: 0.75rem;
    }
    
    .ProseMirror h3 {
      font-size: 1.5rem;
      line-height: 2rem;
      font-weight: 600;
      margin-top: 1.25rem;
      margin-bottom: 0.75rem;
    }
    
    .ProseMirror h4 {
      font-size: 1.25rem;
      line-height: 1.75rem;
      font-weight: 600;
      margin-top: 1rem;
      margin-bottom: 0.5rem;
    }
    
    .ProseMirror h5, .ProseMirror h6 {
      font-size: 1.125rem;
      line-height: 1.75rem;
      font-weight: 600;
      margin-top: 0.75rem;
      margin-bottom: 0.5rem;
    }
    
    .ProseMirror p {
      margin-top: 0.75rem;
      margin-bottom: 0.75rem;
      line-height: 1.6;
    }
    
    .ProseMirror ul {
      list-style-type: disc;
      padding-left: 1.5rem;
      margin: 0.75rem 0;
    }
    
    .ProseMirror ol {
      list-style-type: decimal;
      padding-left: 1.5rem;
      margin: 0.75rem 0;
    }
    
    .ProseMirror li {
      margin: 0.25rem 0;
    }
    
    .ProseMirror blockquote {
      border-left: 4px solid #e5e7eb;
      padding-left: 1rem;
      font-style: italic;
      margin: 1rem 0;
      color: #6b7280;
    }
    
    .ProseMirror code {
      background-color: #f3f4f6;
      padding: 0.2rem 0.4rem;
      border-radius: 0.25rem;
      font-family: monospace;
      font-size: 0.875rem;
    }
    
    .ProseMirror pre {
      background-color: #1f2937;
      color: #e5e7eb;
      padding: 1rem;
      border-radius: 0.375rem;
      font-family: monospace;
      font-size: 0.875rem;
      overflow-x: auto;
      margin: 1rem 0;
    }
    
    .ProseMirror a {
      color: #2563eb;
      text-decoration: underline;
    }
    
    .ProseMirror a:hover {
      color: #1e40af;
    }
    
    .ProseMirror hr {
      border: none;
      border-top: 2px solid #e5e7eb;
      margin: 2rem 0;
    }
    
    .ProseMirror img {
      max-width: 100%;
      height: auto;
      margin: 1rem 0;
      display: block;
    }
    
    .ProseMirror table {
      border-collapse: collapse;
      margin: 1rem 0;
      width: 100%;
      table-layout: fixed;
      overflow: hidden;
    }
    
    .ProseMirror th {
      background-color: #f3f4f6;
      font-weight: 600;
      text-align: left;
      padding: 0.75rem;
      border: 1px solid #e5e7eb;
    }
    
    .ProseMirror td {
      padding: 0.75rem;
      border: 1px solid #e5e7eb;
      vertical-align: top;
    }
    
    .ProseMirror tr:nth-child(even) {
      background-color: #f9fafb;
    }
    
    /* Dark mode styles */
    .dark .ProseMirror a {
      color: #60a5fa;
    }
    
    .dark .ProseMirror a:hover {
      color: #93c5fd;
    }
    
    .dark .ProseMirror blockquote {
      border-left-color: #4b5563;
      color: #9ca3af;
    }
    
    .dark .ProseMirror code {
      background-color: #374151;
      color: #e5e7eb;
    }
    
    .dark .ProseMirror th {
      background-color: #374151;
      border-color: #4b5563;
    }
    
    .dark .ProseMirror td {
      border-color: #4b5563;
    }
    
    .dark .ProseMirror tr:nth-child(even) {
      background-color: #1f2937;
    }
    
    .dark .ProseMirror hr {
      border-top-color: #4b5563;
    }
  `;

  // 檢查是否為全屏模式
  const isFullScreen = className.includes('h-full');

  return (
    <div className={`border border-gray-300 rounded-md overflow-visible bg-white text-black dark:bg-gray-800 dark:text-white dark:border-gray-700 ${className} ${isFullScreen ? 'fullscreen-editor' : ''}`} style={{ display: 'flex', flexDirection: 'column' }}>
      <style jsx global>{`
        ${editorStyles}
        /* 強制使編輯器容器不影響sticky定位 */
        .ProseMirror {
          outline: none;
          height: 100%;
          min-height: 300px;
          padding-bottom: 100px;
        }
        
        /* 特別處理置頂欄 */
        .sticky-header {
          position: sticky !important;
          z-index: 9999 !important;
        }
        
        .top-header {
          top: 0 !important;
        }
        
        .second-header {
          top: 41px !important;
        }
        
        /* 讓滾動獨立於頭部 */
        .editor-scroll-container {
          overflow-y: auto;
          min-height: 300px;
          flex: 1;
        }
        
        /* 進一步優化 Tiptap 編輯器容器 */
        .ProseMirror-focused {
          outline: none !important;
        }
      `}</style>
      
      {/* 工具欄 - 兩種視圖共享 - 使用獨立class而非內聯樣式 */}
      <div className="sticky-header top-header bg-gray-100 dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600 p-2 flex justify-between items-center">
        <div className="flex space-x-1">
          <button
            onClick={() => setCurrentView('visual')}
            className={`px-3 py-1.5 text-sm font-medium rounded-t-md ${
              currentView === 'visual' 
                ? 'bg-white dark:bg-gray-800 border-t border-l border-r border-gray-300 dark:border-gray-600' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            可視化編輯
          </button>
          <button
            onClick={() => setCurrentView('html')}
            className={`px-3 py-1.5 text-sm font-medium rounded-t-md ${
              currentView === 'html' 
                ? 'bg-white dark:bg-gray-800 border-t border-l border-r border-gray-300 dark:border-gray-600' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            HTML編輯
          </button>
        </div>
      </div>

      {/* 視覺編輯視圖工具欄 - 只在視覺模式顯示 */}
      {currentView === 'visual' && (
        <div className="sticky-header second-header bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-2 flex flex-wrap gap-1">
          {/* 文本格式工具 */}
          <div className="flex gap-1 mr-2 border-r border-gray-300 dark:border-gray-600 pr-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor?.chain().focus().toggleBold().run()}
              className={`h-8 px-2 ${editor?.isActive('bold') ? 'bg-gray-200 dark:bg-gray-600' : ''}`}
              title="粗體 (Ctrl+B)"
            >
              <span className="font-bold">B</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              className={`h-8 px-2 ${editor?.isActive('italic') ? 'bg-gray-200 dark:bg-gray-600' : ''}`}
              title="斜體 (Ctrl+I)"
            >
              <span className="italic">I</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
              className={`h-8 px-2 ${editor?.isActive('underline') ? 'bg-gray-200 dark:bg-gray-600' : ''}`}
              title="下劃線 (Ctrl+U)"
            >
              <span className="underline">U</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor?.chain().focus().toggleStrike().run()}
              className={`h-8 px-2 ${editor?.isActive('strike') ? 'bg-gray-200 dark:bg-gray-600' : ''}`}
              title="刪除線"
            >
              <span className="line-through">S</span>
            </Button>
          </div>

          {/* 標題工具 */}
          <div className="flex gap-1 mr-2 border-r border-gray-300 dark:border-gray-600 pr-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
              className={`h-8 px-2 ${editor?.isActive('heading', { level: 1 }) ? 'bg-gray-200 dark:bg-gray-600' : ''}`}
              title="一級標題"
            >
              H1
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`h-8 px-2 ${editor?.isActive('heading', { level: 2 }) ? 'bg-gray-200 dark:bg-gray-600' : ''}`}
              title="二級標題"
            >
              H2
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
              className={`h-8 px-2 ${editor?.isActive('heading', { level: 3 }) ? 'bg-gray-200 dark:bg-gray-600' : ''}`}
              title="三級標題"
            >
              H3
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor?.chain().focus().toggleHeading({ level: 4 }).run()}
              className={`h-8 px-2 ${editor?.isActive('heading', { level: 4 }) ? 'bg-gray-200 dark:bg-gray-600' : ''}`}
              title="四級標題"
            >
              H4
            </Button>
          </div>

          {/* 列表工具 */}
          <div className="flex gap-1 mr-2 border-r border-gray-300 dark:border-gray-600 pr-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              className={`h-8 px-2 ${editor?.isActive('bulletList') ? 'bg-gray-200 dark:bg-gray-600' : ''}`}
              title="項目符號列表"
            >
              • 列表
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              className={`h-8 px-2 ${editor?.isActive('orderedList') ? 'bg-gray-200 dark:bg-gray-600' : ''}`}
              title="編號列表"
            >
              1. 編號
            </Button>
          </div>

          {/* 高級工具 */}
          <div className="flex gap-1 mr-2 border-r border-gray-300 dark:border-gray-600 pr-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
              className={`h-8 px-2 ${editor?.isActive('blockquote') ? 'bg-gray-200 dark:bg-gray-600' : ''}`}
              title="引用區塊"
            >
              引用
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
              className={`h-8 px-2 ${editor?.isActive('codeBlock') ? 'bg-gray-200 dark:bg-gray-600' : ''}`}
              title="代碼區塊"
            >
              代碼
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor?.chain().focus().setHorizontalRule().run()}
              className="h-8 px-2"
              title="水平分隔線"
            >
              分隔線
            </Button>
          </div>

          {/* 插入工具 */}
          <div className="flex gap-1">
            {/* 連結按鈕和浮動輸入框 */}
            <div className="relative">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setLinkMenuIsActive(!linkMenuIsActive)}
                className={`h-8 px-2 ${editor?.isActive('link') ? 'bg-gray-200 dark:bg-gray-600' : ''}`}
                title="插入連結"
              >
                連結
              </Button>
              {linkMenuIsActive && (
                <div className="absolute z-10 top-full left-0 mt-1 bg-white dark:bg-gray-800 shadow-lg rounded-md p-3 border border-gray-200 dark:border-gray-700 w-64">
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">連結文字</label>
                      <input
                        type="text"
                        value={linkText}
                        onChange={(e) => setLinkText(e.target.value)}
                        placeholder="連結顯示文字"
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">URL 地址</label>
                      <input
                        type="text"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        placeholder="https://example.com"
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded"
                        autoFocus
                      />
                    </div>
                    <div className="flex justify-end gap-2 mt-2">
                      <Button 
                        variant="light" 
                        size="sm" 
                        onClick={() => setLinkMenuIsActive(false)} 
                        className="py-1 text-xs px-2"
                      >
                        取消
                      </Button>
                      <Button 
                        variant="solid" 
                        size="sm" 
                        onClick={handleAddLink} 
                        className="py-1 text-xs px-2"
                        disabled={!linkUrl}
                      >
                        添加連結
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* 圖片按鈕和浮動輸入框 */}
            <div className="relative">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setImageMenuIsActive(!imageMenuIsActive)}
                className="h-8 px-2"
                title="插入圖片"
              >
                圖片
              </Button>
              {imageMenuIsActive && (
                <div className="absolute z-10 top-full left-0 mt-1 bg-white dark:bg-gray-800 shadow-lg rounded-md p-3 border border-gray-200 dark:border-gray-700 w-64">
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">圖片URL地址</label>
                      <input
                        type="text"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">替代文字 (Alt)</label>
                      <input
                        type="text"
                        value={imageAlt}
                        onChange={(e) => setImageAlt(e.target.value)}
                        placeholder="圖片描述"
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded"
                      />
                    </div>
                    <div className="flex justify-end gap-2 mt-2">
                      <Button 
                        variant="light" 
                        size="sm" 
                        onClick={() => setImageMenuIsActive(false)} 
                        className="py-1 text-xs px-2"
                      >
                        取消
                      </Button>
                      <Button 
                        variant="solid" 
                        size="sm" 
                        onClick={handleAddImage} 
                        className="py-1 text-xs px-2"
                        disabled={!imageUrl}
                      >
                        插入圖片
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* 表格按鈕 */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
              className="h-8 px-2"
              title="插入表格"
            >
              表格
            </Button>
          </div>
        </div>
      )}

      {/* 獨立的滾動容器 */}
      <div className="editor-scroll-container">
        {/* 視覺編輯器 */}
        {currentView === 'visual' ? (
          <div className="bg-white dark:bg-gray-800 text-black dark:text-white h-full">
            {editor && <EditorContent editor={editor} className="prose-lg max-w-none h-full" />}
          </div>
        ) : (
          /* HTML 代碼編輯器 */
          <div className="bg-white dark:bg-gray-800 text-black dark:text-white h-full">
            <textarea
              className="w-full h-full min-h-[300px] p-4 font-mono text-sm bg-white dark:bg-gray-800 text-black dark:text-white border-none focus:ring-0 focus:outline-none"
              value={htmlSource}
              onChange={handleHtmlChange}
              placeholder="輸入HTML代碼..."
              spellCheck="false"
            />
          </div>
        )}
      </div>

      {/* 表格操作工具欄 - 僅在選中表格時顯示 */}
      {currentView === 'visual' && editor?.isActive('table') && (
        <div className="sticky-header bg-gray-100 dark:bg-gray-700 border-t border-gray-300 dark:border-gray-600 p-2 flex gap-1 flex-wrap" style={{ bottom: 0 }}>
          <Button
            type="button"
            variant="light"
            size="sm"
            onClick={() => editor.chain().focus().addColumnBefore().run()}
            className="h-8 px-2"
            title="左側添加列"
          >
            左側添加列
          </Button>
          <Button
            type="button"
            variant="light"
            size="sm"
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            className="h-8 px-2"
            title="右側添加列"
          >
            右側添加列
          </Button>
          <Button
            type="button"
            variant="light"
            size="sm"
            onClick={() => editor.chain().focus().deleteColumn().run()}
            className="h-8 px-2"
            title="刪除列"
          >
            刪除列
          </Button>
          <Button
            type="button"
            variant="light"
            size="sm"
            onClick={() => editor.chain().focus().addRowBefore().run()}
            className="h-8 px-2"
            title="上方添加行"
          >
            上方添加行
          </Button>
          <Button
            type="button"
            variant="light"
            size="sm"
            onClick={() => editor.chain().focus().addRowAfter().run()}
            className="h-8 px-2"
            title="下方添加行"
          >
            下方添加行
          </Button>
          <Button
            type="button"
            variant="light"
            size="sm"
            onClick={() => editor.chain().focus().deleteRow().run()}
            className="h-8 px-2"
            title="刪除行"
          >
            刪除行
          </Button>
          <Button
            type="button"
            variant="light"
            size="sm"
            onClick={() => editor.chain().focus().deleteTable().run()}
            className="h-8 px-2"
            title="刪除表格"
          >
            刪除表格
          </Button>
        </div>
      )}
    </div>
  );
}

export default TapEditor; 