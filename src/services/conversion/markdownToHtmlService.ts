import { marked } from 'marked';

/**
 * 增強圖片標籤，添加圖片容器和樣式
 * @param html 原始HTML
 * @returns 增強後的HTML
 */
function enhanceImages(html: string): string {
  // 查找所有img標籤並替換為帶figure的版本
  return html.replace(/<img\s+([^>]*)>/g, 
    (match, attributes) => {
      // 提取src屬性
      const srcMatch = attributes.match(/src=["']([^"']*)["']/);
      if (!srcMatch) return match; // 如果沒有src屬性，保持不變
      
      const src = srcMatch[1];
      
      // 提取title屬性，如果存在的話
      const titleMatch = attributes.match(/title=["']([^"']*)["']/);      
      const title = titleMatch ? titleMatch[1] : '';
      
      // 確保保留原有的屬性
      const sanitizedAttributes = attributes
        .replace(/src=["'][^"']*["']/, `src="${src}"`)
        .replace(/\s+$/, '');
      
      return `<figure class="article-image">
        <img ${sanitizedAttributes} loading="lazy" class="max-w-full rounded-lg" />
        ${title ? `<figcaption class="text-center text-gray-500 text-sm mt-2">${title}</figcaption>` : ''}
      </figure>`;
    }
  );
}

/**
 * 使用 marked 將 Markdown 轉換為 HTML
 * @param markdownContent Markdown 內容
 * @returns 轉換後的 HTML
 */
export async function convertMarkdownToHtml(markdownContent: string): Promise<string> {
  try {
    // 設置 marked 選項
    marked.setOptions({
      gfm: true,        // GitHub 風格 Markdown
      breaks: true,     // 將換行符轉換為 <br>
      pedantic: false,  // 不使用原始 markdown.pl 的錯誤行為
    });
    
    // 轉換 Markdown 為 HTML
    const result = await marked.parse(markdownContent || '');
    
    // 確保返回字符串
    let htmlContent = typeof result === 'string' ? result : String(result);
    
    // 增強圖片顯示
    htmlContent = enhanceImages(htmlContent);
    
    return htmlContent;
  } catch (error) {
    console.error('Markdown 轉換失敗:', error);
    throw new Error(`Markdown 轉換失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
  }
}

/**
 * 獲取 HTML 中的純文本內容（用於摘要等）
 * @param html HTML 內容
 * @param maxLength 最大長度
 * @returns 純文本內容
 */
export function getPlainTextFromHtml(html: string, maxLength = 200): string {
  if (typeof window !== 'undefined') {
    // 瀏覽器環境
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // 獲取純文本
    let text = tempDiv.textContent || tempDiv.innerText || '';
    
    // 截取指定長度
    if (text.length > maxLength) {
      text = text.substring(0, maxLength) + '...';
    }
    
    return text;
  } else {
    // Node.js 環境
    // 簡單的 HTML 標籤移除
    const textOnly = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    
    // 截取指定長度
    if (textOnly.length > maxLength) {
      return textOnly.substring(0, maxLength) + '...';
    }
    
    return textOnly;
  }
}

/**
 * 從 HTML 中提取第一張圖片的 URL
 * @param html HTML 內容
 * @returns 圖片 URL 或 null
 */
export function getFirstImageFromHtml(html: string): string | null {
  const match = html.match(/<img[^>]+src="([^">]+)"/i);
  return match ? match[1] : null;
} 