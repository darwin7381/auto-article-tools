'use client';

import { TapEditor } from '@/components/ui/taptip-editor/index';

export default function TiptapTestPage() {
  // 處理內容變化
  const handleContentChange = (newContent: string) => {
    console.log('內容已更新:', newContent.slice(0, 50) + '...');
  };

  // 準備初始內容樣例，包含各種元素格式
  const initialContent = `
    <h1>標題一 H1</h1>
    <h2>標題二 H2</h2>
    <h3>標題三 H3</h3>
    <h4>標題四 H4</h4>
    <p>這是一個<strong>粗體</strong>文本示例，還有<em>斜體</em>和<u>底線</u>以及<s>刪除線</s>。</p>
    <p>這是一個<a href="https://example.com">超連結</a>示例。</p>
    <blockquote>這是一個引用區塊的示例，通常用於引用其他來源的內容。</blockquote>
    <ul>
      <li>無序列表項目 1</li>
      <li>無序列表項目 2</li>
      <li>無序列表項目 3</li>
    </ul>
    <ol>
      <li>有序列表項目 1</li>
      <li>有序列表項目 2</li>
      <li>有序列表項目 3</li>
    </ol>
    <p>以下是一個代碼區塊：</p>
    <pre><code>function example() {
      console.log("Hello, world!");
    }</code></pre>
    <p>以下是一張圖片：</p>
    <img src="https://via.placeholder.com/640x360" alt="示例圖片" />
    <p>以下是一個表格：</p>
    <table>
      <thead>
        <tr>
          <th>表頭1</th>
          <th>表頭2</th>
          <th>表頭3</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>單元格1</td>
          <td>單元格2</td>
          <td>單元格3</td>
        </tr>
        <tr>
          <td>單元格4</td>
          <td>單元格5</td>
          <td>單元格6</td>
        </tr>
      </tbody>
    </table>
    <hr />
    <p>這是水平分隔線之後的內容。</p>
  `;

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <h1 className="text-3xl font-bold mb-4 text-primary-600 dark:text-primary-400">
        Tiptap 編輯器功能測試
      </h1>
      
      <div className="mb-6">
        <p className="text-foreground/80 mb-4">
          這個頁面用於測試和展示 Tiptap 編輯器的完整功能，包括表格、超連結、圖片等。右上角可切換設計視圖/HTML源碼視圖。
        </p>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl border border-yellow-100 dark:border-yellow-800/30 mb-6">
          <h3 className="font-medium text-yellow-800 dark:text-yellow-300 mb-2">使用提示</h3>
          <ul className="list-disc pl-5 text-yellow-700 dark:text-yellow-400 space-y-1 text-sm">
            <li>選擇文字後會顯示浮動工具欄</li>
            <li>創建表格後會出現表格專用工具欄</li>
            <li>可以切換到HTML模式直接編輯源碼</li>
            <li>所有更改都是實時顯示的</li>
          </ul>
        </div>

        {/* Tiptap 編輯器 */}
        <div className="border-2 border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
          <TapEditor 
            initialContent={initialContent}
            onChange={handleContentChange}
            placeholder="開始輸入內容..."
          />
        </div>
      </div>
    </div>
  );
} 