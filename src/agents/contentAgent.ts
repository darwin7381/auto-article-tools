import OpenAI from 'openai';
import { getFileFromR2 } from '../services/storage/r2Service';
import { saveMarkdown } from '../services/document/markdownService';

/**
 * 內容處理Agent - 專門處理文檔內容增強
 * 
 * 此Agent負責：
 * 1. 將任何語言和類型的文章，轉換為指定語言的文章
 * 2. 初步內容處理、以Markdown格式和結構
 * 3. 保留原始內容的重要信息
 */

// 初始化OpenAI客戶端
let openaiClient: OpenAI | null = null;
try {
  openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  console.log('OpenAI客戶端初始化成功');
} catch (error) {
  console.error('OpenAI客戶端初始化失敗:', error instanceof Error ? error.message : '未知錯誤');
}

/**
 * 處理Markdown內容
 * @param markdownContent Markdown內容
 * @returns 處理後的內容
 */
export async function processContent(markdownContent: string): Promise<string> {
  if (!openaiClient) {
    console.warn('OpenAI客戶端未初始化，返回原始內容');
    return markdownContent;
  }

  // 系統提示詞
  const systemPrompt = `你是一個 30 年經驗的彭博社資深編輯，擅長任何形式的正規專業新聞稿處理。你的任務是：

1. 將來源內容統一轉換為正規的台灣繁體為主的內容
2. 進行內容初步處理、整理，使其成為專業的 PR 新聞文章
3. 需注意，要保留原始文章的所有重要信息和細節，包括連結、圖片、表格等，且處於正確位置
4. 將內容以 Markdown 格式輸出，保持標題層級正確、段落清晰、列表正確

請保持專業的寫作風格，確保輸出的Markdown格式完整正確，可以直接顯示。
直接返回處理後的Markdown內容，不需要添加任何元數據。`;

  // 用戶提示詞
  const userPrompt = `請處理以下來源內容，你正在進行將客戶或合作公司給的稿件，統一處理為正規專業的新聞稿：

${markdownContent}`;

  // 設置模型參數
  const modelConfig = {
    model: "GPT-4.1",
    temperature: 0.3,
    max_tokens: 200000,
    top_p: 1
  };

  try {
    console.log('開始使用AI處理內容...');
    const response = await openaiClient.chat.completions.create({
      ...modelConfig,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    });

    // 獲取回應內容
    const content = response.choices[0].message.content;
    if (!content) {
      console.warn('AI回應為空，返回原始內容');
      return markdownContent;
    }

    console.log('AI處理成功');
    return content;
  } catch (error) {
    console.error('AI處理失敗:', error);
    // 發生任何錯誤，返回原始內容
    return markdownContent;
  }
}

/**
 * 增強Markdown內容
 * @param fileId 文件ID
 * @param markdownKey Markdown文件在R2的鍵值
 * @returns 處理結果
 */
export async function enhanceMarkdown(fileId: string, markdownKey: string): Promise<{
  success: boolean;
  fileId: string;
  markdownKey: string;
  markdownUrl: string;
}> {
  try {
    // 從R2獲取Markdown內容
    const markdownBuffer = await getFileFromR2(markdownKey);
    const markdownContent = markdownBuffer.toString('utf-8');
    
    try {
      // 使用Agent處理內容
      const enhancedContent = await processContent(markdownContent);
      
      // 添加簡單元數據
      const finalMarkdown = `---
source: ai-enhanced
fileId: ${fileId}
processTime: ${new Date().toISOString()}
---

${enhancedContent}`;
      
      // 保存處理後的Markdown
      const { r2Key, localPath } = await saveMarkdown(finalMarkdown, fileId, '-enhanced');
      
      return {
        success: true,
        fileId,
        markdownKey: r2Key,
        markdownUrl: localPath,
      };
    } catch (aiError) {
      console.error('AI處理異常:', aiError);
      
      // 如果AI處理失敗，仍然保存原始內容
      const finalMarkdown = `---
source: original-content
fileId: ${fileId}
processTime: ${new Date().toISOString()}
---

${markdownContent}`;
      
      // 保存原始內容
      const { r2Key, localPath } = await saveMarkdown(finalMarkdown, fileId, '-unprocessed');
      
      return {
        success: false,
        fileId,
        markdownKey: r2Key,
        markdownUrl: localPath,
      };
    }
  } catch (error) {
    console.error('內容處理整體失敗:', error);
    throw error;
  }
} 