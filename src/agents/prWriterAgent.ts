import OpenAI from 'openai';
import { getFileFromR2 } from '../services/storage/r2Service';
import { saveMarkdown } from '../services/document/markdownService';
import { createChatConfig, createModelAdaptedConfig, withRetry, getAgentConfig, logModelUsage, replacePromptVariables, getProviderType, callAIAPI, type AgentConfig } from './common/agentUtils';

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

  try {
    // 獲取 Agent 配置
    const agentConfig: AgentConfig = await getAgentConfig('prWriterAgent');
    
    // 記錄模型使用信息
    logModelUsage('prWriterAgent', agentConfig, '開始處理PR新聞稿內容');

    // 從配置中獲取系統提示詞
    const systemPrompt = agentConfig.systemPrompt;

    // 從配置中獲取用戶提示詞模板並替換變數
    const userPrompt = replacePromptVariables(agentConfig.userPrompt, {
      markdownContent: markdownContent
    });

    // 根據提供商類型選擇 API 調用方式
    const providerType = getProviderType(agentConfig.provider);
    
    // 使用重試機制調用API
    const content = await withRetry(
      async () => {
        if (providerType === 'google') {
          // 使用 Gemini API
          return await callAIAPI(agentConfig, systemPrompt, userPrompt);
        } else {
          // 使用 OpenAI API
          if (!openaiClient) {
            throw new Error('OpenAI 客戶端未初始化');
          }
          
          const config = createModelAdaptedConfig(agentConfig);
          const completion = await openaiClient.chat.completions.create({
            ...config,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ]
          });

          const content = completion.choices[0].message.content;
          if (!content) {
            throw new Error('AI回應為空');
          }
          return content;
        }
      },
      {
        maxRetries: 3,
        retryDelay: 2000,
        onRetry: (error, count) => {
          console.warn(`PR Writer處理重試 #${count}：`, error.message);
        },
        retryCondition: (error) => {
          // 根據錯誤類型決定是否重試
          // 網絡錯誤、超時錯誤等可以重試，語法或參數錯誤等可能不應該重試
          const errorMessage = error instanceof Error ? error.message : String(error);
          const retryableErrors = [
            'timeout', 
            'exceeded maximum time', 
            'rate limit', 
            'server error',
            'network error',
            'Gateway Timeout',
            'timed out',
            'not valid JSON'
          ];
          
          return retryableErrors.some(errText => 
            errorMessage.toLowerCase().includes(errText.toLowerCase())
          );
        }
      }
    );

    console.log('✅ PR Writer處理成功');
    return content;
  } catch (configError) {
    console.error('❌ PR Writer配置獲取失敗:', configError);
    console.log('🔄 降級使用硬編碼配置');
    
    // 如果配置獲取失敗，使用硬編碼配置
    const fallbackSystemPrompt = `你是一位擁有15年經驗的PR新聞稿專家，專門將普通內容轉換為專業的新聞稿。你的任務是：

1. 將來源內容統一轉換為正規的台灣繁體為主的內容
2. 若是內容處理涉及翻譯，請確實考量實際語意表達，以免有些詞或標題在翻譯後失去語境含義
3. 進行內容初步處理、整理，使其成為專業的 PR 新聞稿
4. 但需注意，要保留原始文章的所有重要信息和細節，包括連結、圖片、表格...格式和位置相符等
5. 不要遺漏任何重要資訊，或過度簡化格式，仍須遵正客戶所給的原始內容格式和佈局，僅有大錯誤或大問題時，才進行修正
6. 輸出必須保持正確的 Markdown 格式，維持標題層級、段落和列表的格式
7. 不同段落之間不要自己亂加一大堆奇怪的分隔線，未來我們是會轉換成 html 的，所以不要自己亂加分隔線「---」以免未來造成格式隱患

輸出必須保持正確的Markdown格式，並包含原始內容的所有重要信息。`;

    const fallbackUserPrompt = `請處理以下來源內容，你正在進行將客戶或合作公司給的稿件，統一處理為正規專業的新聞稿，但必須尊重原始內容，不要遺漏任何重要資訊或錯誤簡化格式或過度進行改寫：

${markdownContent}`;

    console.log('🤖 [prWriterAgent] 使用降級配置');
    console.log('📡 提供商: openai');
    console.log('🧠 模型: gpt-4o');
    console.log('🌡️  溫度: 0.4');
    console.log('📝 最大Token: 16000');

    try {
      const config = createChatConfig("gpt-4o", {
        temperature: 0.4,
        max_tokens: 16000,
        top_p: 0.95,
      });
      
      const content = await withRetry(
        async () => {
          const completion = await openaiClient!.chat.completions.create({
            ...config,
            messages: [
              { role: "system", content: fallbackSystemPrompt },
              { role: "user", content: fallbackUserPrompt }
            ]
          });

          const content = completion.choices[0].message.content;
          if (!content) {
            throw new Error('AI回應為空');
          }
          return content;
        },
        {
          maxRetries: 3,
          retryDelay: 2000,
          onRetry: (error, count) => {
            console.warn(`PR Writer處理重試 #${count}：`, error.message);
          },
          retryCondition: (error) => {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const retryableErrors = [
              'timeout', 
              'exceeded maximum time', 
              'rate limit', 
              'server error',
              'network error',
              'Gateway Timeout',
              'timed out',
              'not valid JSON'
            ];
            
            return retryableErrors.some(errText => 
              errorMessage.toLowerCase().includes(errText.toLowerCase())
            );
          }
        }
      );

      console.log('✅ PR Writer處理成功(降級模式)');
      return content;
    } catch (fallbackError) {
      console.error('❌ PR Writer處理失敗(已重試，降級模式):', fallbackError);
      return markdownContent;
    }
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
      // 使用PR Writer Agent處理內容，帶重試機制
      const enhancedContent = await processPRContent(markdownContent);
      
      // 直接使用处理后的内容，不添加frontmatter
      const finalMarkdown = enhancedContent;
      
      // 保存處理後的PR新聞稿Markdown
      const { r2Key, localPath } = await withRetry(
        () => saveMarkdown(finalMarkdown, fileId, '-pr-enhanced'),
        {
          maxRetries: 3,
          retryDelay: 1000,
          onRetry: (error, count) => {
            console.warn(`保存PR增強內容重試 #${count}：`, error.message);
          }
        }
      );
      
      return {
        success: true,
        fileId,
        markdownKey: r2Key,
        markdownUrl: localPath,
      };
    } catch (aiError) {
      console.error('PR Writer處理異常(已重試):', aiError);
      
      // 如果AI處理失敗，仍然保存原始內容，不添加frontmatter
      const finalMarkdown = markdownContent;
      
      // 保存原始內容
      const { r2Key, localPath } = await withRetry(
        () => saveMarkdown(finalMarkdown, fileId, '-content-only'),
        {
          maxRetries: 3,
          retryDelay: 1000,
          onRetry: (error, count) => {
            console.warn(`保存原始內容重試 #${count}：`, error.message);
          }
        }
      );
      
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