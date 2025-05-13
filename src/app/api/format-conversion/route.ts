import { NextResponse } from 'next/server';
import { marked } from 'marked';
import { getFileFromR2, uploadFileToR2 } from '@/services/storage/r2Service';

export async function POST(req: Request) {
  try {
    const { markdownKey, fileId, format } = await req.json();
    
    if (!markdownKey) {
      return NextResponse.json(
        { success: false, error: '缺少必要的markdownKey參數' },
        { status: 400 }
      );
    }
    
    if (format !== 'html') {
      return NextResponse.json(
        { success: false, error: '目前僅支持轉換為HTML格式' },
        { status: 400 }
      );
    }
    
    console.log(`開始格式轉換: ${markdownKey} -> ${format}`);
    
    // 修正：markdownKey已包含完整路徑，直接使用而不添加額外的路徑前綴和後綴
    // 判斷markdownKey是否包含文件副檔名，如果沒有則添加.md
    const markdownPath = markdownKey.endsWith('.md') 
      ? markdownKey 
      : `${markdownKey}.md`;
    
    // 從R2中讀取Markdown內容
    let markdownContent;
    try {
      // 使用R2服務獲取文件
      const buffer = await getFileFromR2(markdownPath);
      markdownContent = buffer.toString('utf-8');
      console.log(`成功從R2讀取文件: ${markdownPath}`);
    } catch (error) {
      console.error(`從R2讀取失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
      throw new Error(`無法讀取Markdown文件: ${markdownPath}`);
    }
    
    // 將Markdown轉換為HTML
    const htmlContent = await convertMarkdownToHtml(markdownContent);
    
    // 生成HTML文件名稱，去除所有可能的後綴再添加-html
    const baseName = markdownKey
      .replace(/\.md$/, '')
      .replace(/-enhanced$/, '')
      .replace(/-pr-enhanced$/, '')
      .replace(/-content-only$/, '');
    
    const htmlKey = `${baseName}-html`;
    
    // 添加檔案名後綴
    const htmlFileName = htmlKey.endsWith('.html') ? htmlKey : `${htmlKey}.html`;
    
    // 存儲HTML內容到R2
    try {
      const htmlBuffer = Buffer.from(htmlContent, 'utf-8');
      // 第三個參數使用fileId，作為上傳文件的標識
      await uploadFileToR2(htmlBuffer, htmlFileName, fileId);
      console.log(`成功將HTML上傳到R2: ${htmlFileName}`);
    } catch (uploadError) {
      console.error(`HTML上傳到R2失敗: ${uploadError instanceof Error ? uploadError.message : '未知錯誤'}`);
      throw new Error(`保存HTML文件失敗: ${htmlFileName}`);
    }
    
    // 返回結果
    return NextResponse.json({
      success: true,
      markdownKey,
      htmlContent, // 返回HTML內容用於前端可能的即時預覽
      htmlKey: htmlFileName,
      htmlUrl: htmlFileName, // 直接返回R2的鍵值，前端可以根據需要構建完整URL
      fileId,
      format,
      stage: 'format-conversion',
      stageComplete: true
    });
  } catch (error) {
    console.error('格式轉換錯誤:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '格式轉換失敗' },
      { status: 500 }
    );
  }
}

// 將Markdown轉換為HTML
async function convertMarkdownToHtml(markdownContent: string): Promise<string> {
  // 設置marked選項
  marked.setOptions({
    gfm: true, // GitHub風格Markdown
    breaks: true, // 將換行符轉換為<br>
  });
  
  // 轉換Markdown為HTML
  const htmlContent = marked.parse(markdownContent);
  
  // 添加基本的HTML結構和樣式
  const fullHtmlContent = `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>文章內容</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    img {
      max-width: 100%;
      height: auto;
    }
    h1, h2, h3, h4, h5, h6 {
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      color: #222;
    }
    a {
      color: #0366d6;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    code {
      background-color: #f6f8fa;
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
    }
    pre {
      background-color: #f6f8fa;
      padding: 16px;
      border-radius: 3px;
      overflow: auto;
    }
    pre code {
      background-color: transparent;
      padding: 0;
    }
    blockquote {
      margin: 0;
      padding: 0 1em;
      color: #6a737d;
      border-left: 0.25em solid #dfe2e5;
    }
    hr {
      height: 0.25em;
      padding: 0;
      margin: 24px 0;
      background-color: #e1e4e8;
      border: 0;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin-bottom: 16px;
    }
    table th, table td {
      padding: 6px 13px;
      border: 1px solid #dfe2e5;
    }
    table tr {
      background-color: #fff;
      border-top: 1px solid #c6cbd1;
    }
    table tr:nth-child(2n) {
      background-color: #f6f8fa;
    }
  </style>
</head>
<body>
  <article>
    ${htmlContent}
  </article>
</body>
</html>
`;

  return fullHtmlContent;
} 