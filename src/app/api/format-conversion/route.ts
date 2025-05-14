import { NextResponse } from 'next/server';
import { getFileFromR2, uploadFileToR2 } from '@/services/storage/r2Service';
import { convertMarkdownToHtml } from '@/services/conversion/markdownToHtmlService';

/**
 * 清理Markdown內容，移除frontmatter和程式碼區塊標記
 * @param content 原始Markdown內容
 * @returns 清理後的內容
 */
function cleanMarkdownContent(content: string): string {
  let cleanedContent = content;
  
  // 移除YAML frontmatter (位於文件開頭的---之間的內容)
  cleanedContent = cleanedContent.replace(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/, '');
  
  // 移除開頭的 ```markdown 標記
  cleanedContent = cleanedContent.replace(/^```markdown\r?\n/g, '');
  
  // 移除結尾的 ``` 標記
  cleanedContent = cleanedContent.replace(/\r?\n```\s*$/g, '');
  
  // 移除可能的HTML註釋
  cleanedContent = cleanedContent.replace(/<!--[\s\S]*?-->/g, '');
  
  // 移除可能的額外換行符和空格
  cleanedContent = cleanedContent.trim();
  
  return cleanedContent;
}

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
      
      // 清理Markdown內容
      markdownContent = cleanMarkdownContent(markdownContent);
      console.log('已清理Markdown內容，移除了frontmatter和程式碼標記');
    } catch (error) {
      console.error(`從R2讀取失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
      throw new Error(`無法讀取Markdown文件: ${markdownPath}`);
    }
    
    // 使用共用的 markdownToHtmlService 進行轉換
    let htmlContent = '';
    try {
      // 轉換 Markdown 為 HTML，使用與 markdown-test 相同的服務
      htmlContent = await convertMarkdownToHtml(markdownContent || '');
      
      console.log(`Markdown轉換成功，HTML長度: ${htmlContent.length}`);
    } catch (parseError) {
      console.error(`Markdown解析錯誤: ${parseError instanceof Error ? parseError.message : '未知錯誤'}`);
      throw new Error('Markdown轉換為HTML失敗');
    }
    
    // 生成HTML文件名稱，去除所有可能的後綴
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