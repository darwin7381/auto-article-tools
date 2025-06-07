import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { uploadImageToR2 } from '@/services/storage/r2Service';
import { withRetry } from '@/agents/common/agentUtils';

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
 * 根據文章內容生成封面圖描述提示詞
 * @param title 文章標題
 * @param content 文章內容（前500字）
 * @param articleType 文章類型
 * @returns 圖片生成提示詞
 */
function generateImagePrompt(title: string, content: string, articleType: string): string {
  // 擷取內容前500字，避免提示詞過長
  const contentSummary = content.replace(/<[^>]*>/g, '').substring(0, 500);
  
  const basePrompt = `Create a professional, modern cover image for an article with the following details:

Title: ${title}
Content Summary: ${contentSummary}
Article Type: ${articleType}

Style Requirements:
- Professional and modern design
- Suitable for tech/business/news article
- Clean, minimal composition
- High contrast and readability
- No text overlay (title will be added separately)
- Color scheme should be professional (blues, grays, whites)
- Abstract or conceptual representation of the topic
- High quality, suitable for web publication

The image should be visually appealing and relevant to the article content while maintaining a professional appearance suitable for a technology/business news website.`;

  return basePrompt;
}

export async function POST(request: Request) {
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

    // 生成圖片描述提示詞
    const prompt = generateImagePrompt(title, content, articleType);
    console.log('圖片生成提示詞:', prompt.substring(0, 200) + '...');

    // 使用重試機制調用最新的GPT Image API
    const imageResponse = await withRetry(
      async () => {
        const response = await openai.images.generate({
          model: "gpt-image-1",
          prompt: prompt,
          n: 1,
          size: "1536x1024", // landscape format，適合文章封面
          quality: "medium" // 使用medium品質平衡圖片質量和檔案大小
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
        model: 'gpt-image-1',
        size: '1536x1024',
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