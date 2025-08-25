import OpenAI from 'openai';
import { getFileFromR2 } from '../services/storage/r2Service';
import { saveMarkdown } from '../services/document/markdownService';
import { createChatConfig, createModelAdaptedConfig, withRetry, getAgentConfig, logModelUsage, replacePromptVariables, getProviderType, callAIAPI, type AgentConfig } from './common/agentUtils';

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

  try {
    // 獲取 Agent 配置
    const agentConfig: AgentConfig = await getAgentConfig('contentAgent');
    
    // 記錄模型使用信息
    logModelUsage('contentAgent', agentConfig, '開始處理Markdown內容');

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
        if (providerType === 'google' || providerType === 'openrouter' || 
            agentConfig.provider === 'grok' || agentConfig.provider === 'claude') {
          // 使用統一 API 調用函數（支援 Gemini、OpenRouter、Grok、Claude）
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
          console.warn(`內容處理重試 #${count}：`, error.message);
        },
        retryCondition: (error) => {
          // 根據錯誤類型決定是否重試
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

    console.log('✅ Content Agent處理成功');
    
    // 檢查 AI 回應是否包含可疑內容
    if (content.includes('Request En') || content.includes('```json')) {
      console.error(`[ContentAgent Debug] AI 回應包含可疑內容!`);
      console.error(`[ContentAgent Debug] AI 回應前 500 字符:`, content.substring(0, 500));
    }
    
    return content;
  } catch (configError) {
    console.error('❌ Content Agent配置獲取失敗:', configError);
    console.log('🔄 降級使用硬編碼配置');
    
    // 如果配置獲取失敗，使用硬編碼配置
    const fallbackSystemPrompt = `你是一個 30 年經驗的彭博社資深編輯，擅長任何形式的正規專業新聞稿處理。你的任務是：

1. 將來源內容統一轉換為正規的台灣繁體為主的內容
2. 若是內容處理涉及翻譯，請確實考量實際語意表達，以免有些詞或標題在翻譯後失去語境含義
3. 進行內容初步處理、整理，使其成為專業的 PR 新聞稿
4. 但需注意，要保留原始文章的所有重要信息和細節，包括連結、圖片、表格...格式和位置相符等
5. 不要遺漏任何重要資訊，或過度簡化格式，仍須遵正客戶所給的原始內容格式和佈局，僅有大錯誤或大問題時，才進行修正
6. 輸出必須保持正確的 Markdown 格式，維持標題層級、段落和列表的格式
7. 不同段落之間不要自己亂加一大堆奇怪的分隔線，未來我們是會轉換成 html 的，所以不要自己亂加分隔線「---」以免未來造成格式隱患`;

    const fallbackUserPrompt = `請處理以下來源內容，你正在進行將客戶或合作公司給的稿件，統一處理為正規專業的新聞稿，但必須尊重原始內容，不要遺漏任何重要資訊或錯誤簡化格式或過度進行改寫：

${markdownContent}`;

    console.log('🤖 [contentAgent] 使用降級配置');
    console.log('📡 提供商: openai');
    console.log('🧠 模型: gpt-4o');
    console.log('🌡️  溫度: 0.3');
    console.log('📝 最大Token: 16000');

    try {
      const config = createChatConfig("gpt-4o", {
        temperature: 0.3,
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
            console.warn(`內容處理重試 #${count}：`, error.message);
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

      console.log('✅ Content Agent處理成功(降級模式)');
      return content;
    } catch (fallbackError) {
      console.error('❌ Content Agent處理失敗(已重試，降級模式):', fallbackError);
      return markdownContent;
    }
  }
}

/**
 * 增強Markdown內容
 * @param fileId 文件ID
 * @param markdownPath Markdown文件路徑
 * @returns 處理結果
 */
export async function enhanceMarkdown(fileId: string, markdownPath: string): Promise<{
  success: boolean;
  fileId: string;
  markdownKey: string;
  markdownUrl: string;
}> {
  try {
    // 從R2獲取Markdown內容
    const markdownBuffer = await withRetry(
      () => getFileFromR2(markdownPath),
      {
        maxRetries: 3,
        retryDelay: 1000,
        onRetry: (error, count) => {
          console.warn(`獲取原始Markdown內容重試 #${count}：`, error.message);
        }
      }
    );
    
    const markdownContent = markdownBuffer.toString('utf-8');
    
    try {
      console.log(`[ContentAgent Debug] 開始處理內容, 長度: ${markdownContent.length}`);
      
      // 檢查輸入內容是否包含可疑字符
      if (markdownContent.includes('Request En') || markdownContent.includes('```json')) {
        console.error(`[ContentAgent Debug] 輸入內容包含可疑字符!`);
        console.error(`[ContentAgent Debug] 內容前 500 字符:`, markdownContent.substring(0, 500));
      }
      
      // 使用Agent處理內容
      const enhancedContent = await processContent(markdownContent);
      
      console.log(`[ContentAgent Debug] 處理完成, 輸出長度: ${enhancedContent.length}`);
      
      // 檢查輸出內容是否包含可疑字符
      if (enhancedContent.includes('Request En') || enhancedContent.includes('```json')) {
        console.error(`[ContentAgent Debug] 輸出內容包含可疑字符!`);
        console.error(`[ContentAgent Debug] 輸出前 500 字符:`, enhancedContent.substring(0, 500));
      }
      
      // 直接使用處理後的內容，不添加frontmatter
      const finalMarkdown = enhancedContent;
      
      // 保存處理後的Markdown
      const { r2Key, localPath } = await withRetry(
        () => saveMarkdown(finalMarkdown, fileId, '-enhanced'),
        {
          maxRetries: 3,
          retryDelay: 1000,
          onRetry: (error, count) => {
            console.warn(`保存增強內容重試 #${count}：`, error.message);
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
      console.error('AI處理異常(已重試):', aiError);
      
      // 如果AI處理失敗，保存原始內容，不添加frontmatter
      const finalMarkdown = markdownContent;
      
      // 保存原始內容
      const { r2Key, localPath } = await withRetry(
        () => saveMarkdown(finalMarkdown, fileId, '-unprocessed'),
        {
          maxRetries: 3,
          retryDelay: 1000,
          onRetry: (error, count) => {
            console.warn(`保存未處理內容重試 #${count}：`, error.message);
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
    console.error('內容處理整體失敗:', error);
    throw error;
  }
} 