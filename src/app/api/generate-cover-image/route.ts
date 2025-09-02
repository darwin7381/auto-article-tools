import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { uploadImageToR2 } from '@/services/storage/r2Service';
import { withRetry, replacePromptVariables } from '@/agents/common/agentUtils';
import { apiAuth } from '@/middleware/api-auth';
import { getJsonFromR2 } from '@/services/storage/r2Service';
import { DEFAULT_AI_CONFIG, type ImageAgentConfig } from '@/types/ai-config';

// 初始化OpenAI客戶端
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 定義請求接口
interface GenerateCoverImageRequest {
  title: string;
  content: string;
  articleType?: string;
}

// 定義響應接口
interface GenerateCoverImageResponse {
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
 * 載入圖片生成配置
 * @returns 圖片生成配置
 */
async function loadImageGenerationConfig(): Promise<ImageAgentConfig> {
  try {
    // 從 R2 獲取圖片生成配置
    const config = await getJsonFromR2(`config/agents/imageGeneration.json`);
    console.log('✅ 成功載入 imageGeneration 配置');
    return config as ImageAgentConfig;
  } catch (error) {
    console.warn('⚠️  無法載入 imageGeneration 配置，使用預設值:', error);
    // 如果無法獲取配置，返回預設配置
    return DEFAULT_AI_CONFIG.imageGeneration;
  }
}

/**
 * 根據配置和文章內容生成封面圖描述提示詞
 * @param config 圖片生成配置
 * @param title 文章標題
 * @param content 文章內容（前500字）
 * @param articleType 文章類型
 * @returns 圖片生成提示詞
 */
function generateImagePrompt(config: ImageAgentConfig, title: string, content: string, articleType: string): string {
  // 擷取內容前500字，避免提示詞過長
  const contentSummary = content.replace(/<[^>]*>/g, '').substring(0, 500);
  
  // 使用統一的模板變數替換函數
  const prompt = replacePromptVariables(config.promptTemplate, {
    title: title,
    contentSummary: contentSummary,
    articleType: articleType
  });

  return prompt;
}

export async function POST(request: Request) {
  // API 認證檢查
  const authResponse = await apiAuth(request);
  if (authResponse) return authResponse; // 未授權，直接返回錯誤響應

  try {
    // 解析請求數據
    let requestData: GenerateCoverImageRequest;
    try {
      requestData = await request.json();
    } catch (parseError) {
      console.error('請求數據解析錯誤:', parseError);
      return NextResponse.json(
        { success: false, error: '無效的JSON請求格式' },
        { status: 400 }
      );
    }

    const { title, content, articleType = 'article' } = requestData;

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: '缺少必要參數: title, content' },
        { status: 400 }
      );
    }

    console.log('開始生成文章封面圖...', { title: title.substring(0, 50) });
    
    const startTime = Date.now();

    // 載入圖片生成配置
    const imageConfig = await loadImageGenerationConfig();
    
    // 生成圖片描述提示詞
    const prompt = generateImagePrompt(imageConfig, title, content, articleType);
    console.log('圖片生成提示詞:', prompt.substring(0, 200) + '...');

    // 記錄圖片生成使用信息
    console.log('🤖 [imageGeneration] 開始生成封面圖');
    console.log('📡 提供商:', imageConfig.provider);
    console.log('🧠 模型:', imageConfig.model);
    console.log('📐 尺寸:', imageConfig.size);
    console.log('🎨 品質:', imageConfig.quality);

    // 使用重試機制調用最新的GPT Image API
    const imageResponse = await withRetry(
      async () => {
        const response = await openai.images.generate({
          model: imageConfig.model,
          prompt: prompt,
          size: imageConfig.size as "1024x1024" | "1536x1024" | "1024x1536", // GPT Image 1 支援的尺寸
          quality: imageConfig.quality as "low" | "medium" | "high" | "auto" // GPT Image 1 支援的品質參數
        });

        if (!response.data || response.data.length === 0) {
          throw new Error('GPT Image API未返回圖片數據');
        }

        return response.data[0];
      },
      {
        maxRetries: 3,
        retryDelay: 2000,
        onRetry: (error, count) => {
          console.warn(`圖片生成重試 #${count}：`, error.message);
        },
        retryCondition: (error) => {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const retryableErrors = [
            'timeout', 
            'rate limit', 
            'server error',
            'network error',
            'Gateway Timeout',
            'timed out'
          ];
          
          return retryableErrors.some(errText => 
            errorMessage.toLowerCase().includes(errText.toLowerCase())
          );
        }
      }
    );

    if (!imageResponse.b64_json) {
      throw new Error('生成的圖片沒有base64數據');
    }

    console.log('圖片生成成功，開始處理base64數據並上傳到R2...');

    // 直接從base64數據創建Buffer
    const imageBuffer = Buffer.from(imageResponse.b64_json, 'base64');
    
    // 生成唯一的檔案名
    const timestamp = Date.now();
    const fileName = `cover-${timestamp}-${Math.random().toString(36).substring(2, 8)}.png`;
    
    // 上傳到R2
    const r2ImageUrl = await withRetry(
      async () => {
        return await uploadImageToR2(imageBuffer, fileName, 'image/png');
      },
      {
        maxRetries: 3,
        retryDelay: 1000,
        onRetry: (error, count) => {
          console.warn(`圖片上傳到R2重試 #${count}：`, error.message);
        }
      }
    );

    const endTime = Date.now();
    const generationTime = endTime - startTime;

    console.log(`封面圖生成完成，耗時: ${generationTime}ms，URL: ${r2ImageUrl}`);

    const response: GenerateCoverImageResponse = {
      success: true,
      imageUrl: r2ImageUrl,
      metadata: {
        prompt: prompt.substring(0, 200) + '...',
        model: imageConfig.model,
        size: imageConfig.size,
        generationTime
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('封面圖生成失敗:', error);
    const errorMessage = error instanceof Error ? error.message : '未知錯誤';
    
    const response: GenerateCoverImageResponse = {
      success: false,
      error: errorMessage
    };

    return NextResponse.json(response, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Cover Image Generation API is running',
    availableEndpoints: {
      POST: {
        description: '生成文章封面圖',
        requiredParams: ['title', 'content'],
        optionalParams: ['articleType']
      }
    }
  });
} 