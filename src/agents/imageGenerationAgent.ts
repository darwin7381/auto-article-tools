import { withRetry } from './common/agentUtils';
import { getApiUrl } from '../services/utils/apiHelpers';

/**
 * ImageGenerationAgent - 專門處理文章封面圖生成
 * 
 * 此Agent負責：
 * 1. 根據文章內容和標題生成適合的封面圖
 * 2. 調用封面圖生成API路由
 * 3. 返回圖片URL供WordPress使用
 */

// 定義WordPress參數接口（簡化版）
interface SimpleWordPressParams {
  title?: string;
  content?: string;
  excerpt?: string;
  featured_image?: {
    url: string;
    alt?: string;
  } | null;
  [key: string]: unknown;
}

// 定義圖片生成結果接口
export interface ImageGenerationResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
  metadata?: {
    prompt: string;
    model: string;
    size: string;
    generationTime: number;
  };
}

/**
 * 生成文章封面圖
 * @param title 文章標題
 * @param content 文章內容
 * @param articleType 文章類型
 * @returns 生成結果
 */
export async function generateCoverImage(
  title: string, 
  content: string, 
  articleType: string = 'article'
): Promise<ImageGenerationResult> {
  try {
    console.log('開始調用封面圖生成API...', { title: title.substring(0, 50) });
    
    // 使用重試機制調用API
    const response = await withRetry(
      async () => {
        const apiResponse = await fetch(getApiUrl('/api/generate-cover-image'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title,
            content,
            articleType
          }),
        });

        if (!apiResponse.ok) {
          const errorText = await apiResponse.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            throw new Error(`API請求失敗: ${apiResponse.status} ${apiResponse.statusText} - ${errorText}`);
          }
          throw new Error(errorData.error || `API請求失敗: ${apiResponse.status}`);
        }

        return await apiResponse.json();
      },
      {
        maxRetries: 3,
        retryDelay: 2000,
        onRetry: (error, count) => {
          console.warn(`封面圖生成API調用重試 #${count}：`, error.message);
        },
        retryCondition: (error) => {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const retryableErrors = [
            'timeout', 
            'rate limit', 
            'server error',
            'network error',
            'Gateway Timeout',
            'timed out',
            'fetch failed'
          ];
          
          return retryableErrors.some(errText => 
            errorMessage.toLowerCase().includes(errText.toLowerCase())
          );
        }
      }
    );

    console.log('封面圖生成API調用成功:', response.success ? '成功' : '失敗');
    return response as ImageGenerationResult;

  } catch (error) {
    console.error('封面圖生成失敗:', error);
    const errorMessage = error instanceof Error ? error.message : '未知錯誤';
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * 檢查是否需要生成封面圖
 * @param wordpressParams WordPress參數
 * @returns 是否需要生成封面圖
 */
export function shouldGenerateCoverImage(wordpressParams: SimpleWordPressParams): boolean {
  // 檢查是否已有featured_image
  const featuredImage = wordpressParams?.featured_image;
  
  if (!featuredImage) {
    return true; // 沒有封面圖，需要生成
  }
  
  if (typeof featuredImage === 'object' && featuredImage !== null && !featuredImage.url) {
    return true; // 有featured_image對象但沒有URL，需要生成
  }
  
  return false; // 已有有效的封面圖，不需要生成
}

/**
 * 為文章生成並設置封面圖
 * @param wordpressParams WordPress參數
 * @param adaptedContent 文章內容
 * @returns 更新後的WordPress參數
 */
export async function generateAndSetCoverImage(
  wordpressParams: SimpleWordPressParams,
  adaptedContent: string
): Promise<{
  success: boolean;
  updatedParams: SimpleWordPressParams;
  result?: ImageGenerationResult;
  error?: string;
}> {
  try {
    // 檢查是否需要生成封面圖
    if (!shouldGenerateCoverImage(wordpressParams)) {
      console.log('已有封面圖，跳過生成');
      return {
        success: true,
        updatedParams: wordpressParams
      };
    }

    console.log('開始為文章生成封面圖...');
    
    // 提取標題和內容
    const title = wordpressParams?.title || '文章';
    const content = adaptedContent || '';
    
    // 生成封面圖
    const generationResult = await generateCoverImage(title, content, 'article');
    
    if (!generationResult.success || !generationResult.imageUrl) {
      console.error('封面圖生成失敗:', generationResult.error);
      return {
        success: false,
        updatedParams: wordpressParams,
        result: generationResult,
        error: generationResult.error
      };
    }

    // 更新WordPress參數
    const updatedParams = {
      ...wordpressParams,
      featured_image: {
        url: generationResult.imageUrl,
        alt: `${title} - 文章封面圖`
      }
    };

    console.log('封面圖生成並設置成功:', generationResult.imageUrl);
    
    return {
      success: true,
      updatedParams,
      result: generationResult
    };

  } catch (error) {
    console.error('生成並設置封面圖時發生錯誤:', error);
    const errorMessage = error instanceof Error ? error.message : '未知錯誤';
    
    return {
      success: false,
      updatedParams: wordpressParams,
      error: errorMessage
    };
  }
} 