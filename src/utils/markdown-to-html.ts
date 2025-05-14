/**
 * Markdown轉HTML工具
 * 使用簡易的正則表達式處理基本Markdown語法
 * 
 * @param markdown Markdown文本
 * @returns 轉換後的HTML
 */
export default async function markdownToHtml(markdown: string): Promise<string> {
  // 使用fetch API調用我們的內部API進行轉換
  try {
    const response = await fetch('/api/format-conversion/route', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        markdown,
        format: 'html'
      }),
    });

    if (!response.ok) {
      throw new Error(`Conversion failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.html || '';
  } catch (error) {
    console.error('Markdown轉HTML失敗:', error);
    
    // 失敗時嘗試進行本地簡單轉換
    return simpleMarkdownToHtml(markdown);
  }
}

/**
 * 簡單的Markdown轉HTML本地實現
 * 作為API失敗時的備用方案
 * 
 * @param markdown Markdown文本
 * @returns 轉換後的HTML
 */
function simpleMarkdownToHtml(markdown: string): string {
  if (!markdown) return '';
  
  let html = markdown
    // 處理標題
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // 處理粗體和斜體
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    // 處理列表
    .replace(/^\s*- (.*$)/gim, '<ul><li>$1</li></ul>')
    .replace(/^\s*\d+\. (.*$)/gim, '<ol><li>$1</li></ol>')
    // 處理連結
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2">$1</a>')
    // 處理圖片
    .replace(/!\[([^\]]+)\]\(([^)]+)\)/gim, '<img src="$2" alt="$1">')
    // 處理代碼塊
    .replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>')
    // 處理行內代碼
    .replace(/`([^`]+)`/gim, '<code>$1</code>')
    // 處理引用
    .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');
  
  // 處理換行和段落
  const paragraphs = html.split(/\n\s*\n/);
  html = paragraphs
    .map(p => {
      if (
        p.trim().startsWith('<h') || 
        p.trim().startsWith('<ul') || 
        p.trim().startsWith('<ol') || 
        p.trim().startsWith('<blockquote') ||
        p.trim().startsWith('<pre')
      ) {
        return p;
      }
      return `<p>${p.replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n\n');
  
  // 修復嵌套標籤問題
  html = html
    .replace(/<\/ul>\s*<ul>/g, '')
    .replace(/<\/ol>\s*<ol>/g, '');
  
  return html;
} 