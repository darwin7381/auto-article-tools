import { uploadFileToR2 } from '../storage/r2Service';
import { saveToLocalStorage } from '../storage/localService';

/**
 * Markdown處理服務 - 處理Markdown文件的創建、儲存及格式化
 */

/**
 * 保存Markdown內容到R2和本地
 * @param content Markdown內容
 * @param fileId 文件ID
 * @param suffix 可選的後綴（如'-enhanced'）
 * @returns 保存結果，包含R2路径和公开访问URL
 */
export async function saveMarkdown(content: string, fileId: string, suffix = ''): Promise<{
  r2Key: string;
  localPath: string;
  publicUrl: string;
}> {
  const fileName = suffix ? `${fileId}${suffix}.md` : `${fileId}.md`;
  const r2Key = `processed/${fileName}`;
  
  // 保存到R2
  const { key, publicUrl } = await uploadFileToR2(Buffer.from(content), r2Key, 'text/markdown');
  
  // 不再生成本地URL，直接使用R2的公開URL
  
  // 保存到本地 (僅用於開發環境，現在已不再實際保存)
  const localPath = saveToLocalStorage(content, fileName);
  
  // 如果localPath為空字符串，則使用publicUrl作為替代
  return { 
    r2Key: key, 
    localPath: localPath || publicUrl, 
    publicUrl 
  };
}

interface MarkdownMetadata {
  [key: string]: string | number | boolean | Date | object | undefined | null;
}

/**
 * 生成Markdown的前言(Front Matter)
 * @param metadata 元數據
 * @returns 格式化的Front Matter
 */
export function generateFrontMatter(metadata: MarkdownMetadata): string {
  const frontMatter = ['---'];
  
  for (const [key, value] of Object.entries(metadata)) {
    // 跳過undefined或null值
    if (value === undefined || value === null) continue;
    
    // 處理字符串、數字和布爾值
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      frontMatter.push(`${key}: ${typeof value === 'string' ? value : String(value)}`);
    }
    // 處理日期對象
    else if (value instanceof Date) {
      frontMatter.push(`${key}: ${value.toISOString()}`);
    }
    // 處理數組和對象
    else if (typeof value === 'object') {
      // 簡單處理，實際可能需要更複雜的YAML序列化
      frontMatter.push(`${key}: ${JSON.stringify(value)}`);
    }
  }
  
  frontMatter.push('---');
  frontMatter.push(''); // 添加空行
  
  return frontMatter.join('\n');
}

/**
 * 創建DOCX處理後的Markdown內容
 * @param htmlContent 轉換後的HTML內容
 * @returns 格式化的Markdown內容
 */
export function createDocxMarkdown(htmlContent: string): string {
  // 先處理列表，避免 <li> 轉換衝突
  let markdown = htmlContent
    // 有序列表
    .replace(/<ol>([\s\S]*?)<\/ol>/g, (_, inner) => {
      const items = inner
        .replace(/^<li>|<\/li>$/g, '')
        .split(/<\/li>\s*<li>/g)
        .map((item: string, i: number) => `${i + 1}. ${item.trim()}`);
      return items.join('\n') + '\n\n';
    })
    // 無序列表
    .replace(/<ul>([\s\S]*?)<\/ul>/g, (_, inner) => {
      const items = inner
        .replace(/^<li>|<\/li>$/g, '')
        .split(/<\/li>\s*<li>/g)
        .map((item: string) => `- ${item.trim()}`);
      return items.join('\n') + '\n\n';
    });

  // 其他基本標籤轉換
  markdown = markdown
    .replace(/<h1>(.*?)<\/h1>/g, '# $1\n\n')
    .replace(/<h2>(.*?)<\/h2>/g, '## $1\n\n')
    .replace(/<h3>(.*?)<\/h3>/g, '### $1\n\n')
    .replace(/<p>(.*?)<\/p>/g, '$1\n\n')
    .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
    .replace(/<em>(.*?)<\/em>/g, '*$1*')
    .replace(/<a href="(.*?)">(.*?)<\/a>/g, '[$2]($1)')
    .replace(/<img src="(.*?)".*?>/g, '![]($1)\n\n');

  // 直接返回處理後的Markdown內容，不添加frontmatter
  return markdown;
}

/**
 * 解析Markdown内容的Front Matter
 * @param content Markdown內容
 * @returns 解析後的Front Matter和正文
 */
export function parseFrontMatter(content: string): {
  frontMatter: Record<string, string>;
  body: string;
} {
  const frontMatterRegex = /^---\n([\s\S]*?)\n---\n/;
  const match = content.match(frontMatterRegex);
  
  if (!match) {
    return {
      frontMatter: {},
      body: content
    };
  }
  
  const frontMatterStr = match[1];
  const body = content.replace(frontMatterRegex, '');
  
  // 解析Front Matter
  const frontMatter: Record<string, string> = {};
  frontMatterStr.split('\n').forEach(line => {
    const [key, ...values] = line.split(':');
    if (key && values.length) {
      const value = values.join(':').trim();
      frontMatter[key.trim()] = value;
    }
  });
  
  return { frontMatter, body };
} 