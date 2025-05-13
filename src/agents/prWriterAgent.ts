import OpenAI from 'openai';
import { getFileFromR2 } from '../services/storage/r2Service';
import { saveMarkdown } from '../services/document/markdownService';
import { createChatConfig } from './common/agentUtils';

/**
 * PR Writer Agent - 專門處理PR新聞稿增強
 * 
 * 此Agent負責：
 * 1. 將已經處理過的文章進一步優化為專業PR新聞稿格式
 * 2. 添加PR宣傳要點和目標受眾分析
 * 3. 增強SEO表現和新聞稿結構
 */

// 共用contentAgent的OpenAI客戶端實例
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
 * 處理PR新聞稿內容
 * @param markdownContent 已處理的Markdown內容
 * @returns 增強後的PR新聞稿內容
 */
export async function processPRContent(markdownContent: string): Promise<string> {
  if (!openaiClient) {
    console.warn('OpenAI客戶端未初始化，返回原始內容');
    return markdownContent;
  }

  // 系統提示詞 - 專注於PR新聞稿增強
  const systemPrompt = `你是一位擁有15年經驗的PR新聞稿專家，專門將普通內容轉換為專業的新聞稿。你的任務是：

1. 將現有內容進一步優化為專業PR新聞稿格式
2. 保留所有原始信息、結構和格式
3. 增加新聞稿標準元素，如引言、聯絡資訊區塊（如果沒有）
4. 添加PR關鍵要點摘要，包括目標受眾分析
5. 優化標題和副標題使其更具吸引力
6. 增強SEO表現，但不要過度堆砌關鍵字
7. 維持專業的新聞稿語氣和風格

輸出必須保持正確的Markdown格式，並包含原始內容的所有重要信息。`;

  // 用戶提示詞
  const userPrompt = `請將以下內容增強為專業PR新聞稿格式，確保保留所有原始信息和格式結構：

${markdownContent}`;

  try {
    console.log('開始使用PR Writer Agent處理內容...');
    
    // 使用工具函數創建API配置
    const config = createChatConfig("gpt-4o", {
      temperature: 0.4,
      max_tokens: 16000,
      top_p: 0.95,
    });
    
    // API調用
    const completion = await openaiClient.chat.completions.create({
      ...config,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    });

    // 獲取回應內容
    const content = completion.choices[0].message.content;
    if (!content) {
      console.warn('AI回應為空，返回原始內容');
      return markdownContent;
    }

    console.log('PR Writer處理成功');
    return content;
  } catch (error) {
    console.error('PR Writer處理失敗:', error);
    // 發生任何錯誤，返回原始內容
    return markdownContent;
  }
}

/**
 * 增強為PR新聞稿
 * @param fileId 文件ID
 * @param markdownPath Markdown文件路徑
 * @returns 處理結果
 */
export async function enhanceToPRRelease(fileId: string, markdownPath: string): Promise<{
  success: boolean;
  fileId: string;
  markdownKey: string;
  markdownUrl: string;
}> {
  try {
    // 從R2獲取已處理的Markdown內容
    const markdownBuffer = await getFileFromR2(markdownPath);
    const markdownContent = markdownBuffer.toString('utf-8');
    
    try {
      // 使用PR Writer Agent處理內容
      const enhancedContent = await processPRContent(markdownContent);
      
      // 添加PR新聞稿元數據
      const finalMarkdown = `---
source: pr-writer-enhanced
fileId: ${fileId}
processTime: ${new Date().toISOString()}
---

${enhancedContent}`;
      
      // 保存處理後的PR新聞稿Markdown
      const { r2Key, localPath } = await saveMarkdown(finalMarkdown, fileId, '-pr-enhanced');
      
      return {
        success: true,
        fileId,
        markdownKey: r2Key,
        markdownUrl: localPath,
      };
    } catch (aiError) {
      console.error('PR Writer處理異常:', aiError);
      
      // 如果AI處理失敗，仍然保存原始內容
      const finalMarkdown = `---
source: content-processed-only
fileId: ${fileId}
processTime: ${new Date().toISOString()}
note: PR Writer處理失敗，使用原始內容
---

${markdownContent}`;
      
      // 保存原始內容
      const { r2Key, localPath } = await saveMarkdown(finalMarkdown, fileId, '-content-only');
      
      return {
        success: false,
        fileId,
        markdownKey: r2Key,
        markdownUrl: localPath,
      };
    }
  } catch (error) {
    console.error('PR Writer處理整體失敗:', error);
    throw error;
  }
} 