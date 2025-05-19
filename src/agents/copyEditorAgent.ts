import OpenAI from 'openai';
import { createChatConfig, withRetry } from './common/agentUtils';

/**
 * CopyEditorAgent - 專門處理文稿編輯與WordPress參數生成
 * 
 * 此Agent負責：
 * 1. 智能分析文章內容提取參數（標題、分類、標籤等）
 * 2. 生成符合品牌標準的WordPress發布參數
 * 3. 根據品牌要求適配內容格式（處理前言、添加相關閱讀等）
 * 4. 支持不同級別的自動化處理
 */

// 初始化OpenAI客戶端
let openaiClient: OpenAI | null = null;
try {
  openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  console.log('CopyEditorAgent: OpenAI客戶端初始化成功');
} catch (error) {
  console.error('CopyEditorAgent: OpenAI客戶端初始化失敗:', error instanceof Error ? error.message : '未知錯誤');
}

// 定義WordPress參數接口
export interface WordPressParams {
  title: string;
  content: string;
  excerpt?: string;
  slug?: string;
  status?: string;
  date?: string;
  author?: number;
  password?: string;
  featured_media?: number;
  featured_image?: {
    url: string;
    alt: string;
  };
  categories?: Array<{ id: number }>;
  tags?: Array<{ id: number }>;
}

// 定義處理結果接口
export interface CopyEditResult {
  wordpressParams: WordPressParams;
  adaptedContent: string;
}

/**
 * 從HTML或Markdown內容中提取WordPress參數
 * @param content HTML或Markdown內容
 * @param contentType 內容類型，html或markdown
 * @returns WordPress參數和適配後的內容
 */
export async function extractWordPressParams(
  content: string, 
  contentType: 'html' | 'markdown'
): Promise<CopyEditResult> {
  if (!openaiClient) {
    console.warn('CopyEditorAgent: OpenAI客戶端未初始化，返回基本參數');
    // 創建一個基本的結果
    return {
      wordpressParams: {
        title: '未處理的文章',
        content: content,
        excerpt: '此文章未經過參數生成處理',
      },
      adaptedContent: content
    };
  }

  // 系統提示詞 - 專注於內容分析與參數提取
  const systemPrompt = `你是一位專業的內容分析師和WordPress參數生成專家，負責分析網站文章並生成適合發布的參數和內容。

你的任務是：
1. 仔細分析提供的${contentType === 'html' ? 'HTML' : 'Markdown'}內容
2. 提取核心信息，生成WordPress發布所需的參數
3. 根據內容適配格式（避免標題和首圖重複出現等）
4. 基於文章內容智能判斷適合的分類和標籤ID

請根據內容分析，生成以下參數的完整JSON結構：
1. title: 文章標題（核心必填）
2. content: 完整的${contentType === 'html' ? 'HTML' : 'Markdown'}內容（經過適配後的）
3. excerpt: 文章摘要（若無法提取則創建100-120字的摘要）
4. slug: 網址後綴（基於標題生成的英文短語）
5. categories: 分類ID列表，格式為[{id: 數字}]
6. tags: 標籤ID列表，格式為[{id: 數字}]
7. featured_image: 特色圖片信息（如果能從內容中識別）

注意：
- 必須根據你分析的內容生成適合的參數值
- 分類ID和標籤ID應為數字，請依據內容估計合適的分類和標籤ID
- 如發現第一張圖片適合作為特色圖片，請將其URL和alt信息提取出來，但保留在內容中
- 如果內容已有H1標題，請確保它不會在WordPress標題和內容中重複出現

你的輸出格式必須為固定的JSON格式，包含wordpress_params和adaptedContent兩個字段：`;

  // 用戶提示詞
  const userPrompt = `請分析以下${contentType === 'html' ? 'HTML' : 'Markdown'}內容並生成WordPress發布參數。內容如下：

${content}`;

  try {
    console.log('開始使用CopyEditorAgent生成WordPress參數...');
    
              // 使用工具函數創建API配置
     const config = createChatConfig("gpt-4o", {
       temperature: 0.3,
       max_tokens: 16000,
       top_p: 0.95
     });
     
     // 使用重試機制調用API
     const result = await withRetry(
       async () => {
         const completion = await openaiClient!.chat.completions.create({
           ...config,
           messages: [
             { role: "system", content: systemPrompt + '\n\n請以JSON格式響應，包含wordpress_params和adaptedContent字段。' },
             { role: "user", content: userPrompt }
           ]
         });

        // 獲取回應內容
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
          console.warn(`CopyEditorAgent處理重試 #${count}：`, error.message);
        }
      }
    );

    console.log('WordPress參數生成成功');
    
    // 解析JSON回應
    try {
      // 嘗試解析OpenAI回應
      let parsedResult;
      try {
        // 處理JSON格式回應
        parsedResult = JSON.parse(result);
        console.log('解析AI回應成功:', JSON.stringify(parsedResult).substring(0, 200) + '...');
      } catch (jsonError) {
        console.error('JSON解析失敗，嘗試提取JSON部分:', jsonError);
        
        // 嘗試從文本中提取JSON部分
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsedResult = JSON.parse(jsonMatch[0]);
            console.log('從文本中提取JSON成功');
          } catch (extractError) {
            console.error('提取的JSON仍然無法解析:', extractError);
            throw new Error('無法解析AI回應為JSON格式');
          }
        } else {
          throw new Error('回應不包含有效的JSON結構');
        }
      }
      
      // 檢查是否有必要的字段
      if (!parsedResult.wordpress_params) {
        console.error('解析結果缺少wordpress_params字段:', parsedResult);
        
        // 嘗試從其他可能的字段提取
        const possibleFields = ['wordpressParams', 'wordpress_parameters', 'params', 'parameters'];
        for (const field of possibleFields) {
          if (parsedResult[field] && typeof parsedResult[field] === 'object') {
            console.log(`找到替代字段 ${field}，使用它代替wordpress_params`);
            parsedResult.wordpress_params = parsedResult[field];
            break;
          }
        }
        
        // 如果仍然找不到，創建一個基本結構
        if (!parsedResult.wordpress_params) {
          console.warn('無法找到任何WordPress參數字段，創建基本結構');
          parsedResult.wordpress_params = {};
        }
      }
      
      // 確保內容字段存在
      if (!parsedResult.wordpress_params.content) {
        console.log('wordpress_params.content缺失，使用原始內容');
        // 使用原始內容作為備用
        parsedResult.wordpress_params.content = content;
      }
      
      // 確保標題存在
      if (!parsedResult.wordpress_params.title) {
        console.log('wordpress_params.title缺失，使用默認標題');
        parsedResult.wordpress_params.title = '未能提取標題';
      }
      
      // 獲取adaptedContent，如果不存在則使用content
      const adaptedContent = parsedResult.adaptedContent || parsedResult.wordpress_params.content;
      console.log('最終WordPress參數:', parsedResult.wordpress_params);
      
      return {
        wordpressParams: parsedResult.wordpress_params,
        adaptedContent: adaptedContent
      };
    } catch (parseError) {
      console.error('解析AI回應JSON失敗:', parseError);
      // 返回基本結果結構
      return {
        wordpressParams: {
          title: '參數解析失敗',
          content: content,
          excerpt: '無法解析WordPress參數JSON'
        },
        adaptedContent: content
      };
    }
  } catch (error) {
    console.error('WordPress參數生成失敗:', error);
    // 發生錯誤時返回原始內容
    return {
      wordpressParams: {
        title: '參數生成失敗',
        content: content,
        excerpt: '生成WordPress參數時發生錯誤'
      },
      adaptedContent: content
    };
  }
} 