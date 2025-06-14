import { NextRequest, NextResponse } from 'next/server';
import { uploadMediaFromUrl } from '@/services/wordpress/serverWordpressService';

// 增加執行時間限制，因為圖片上傳可能很慢
export const maxDuration = 120; // 120秒

/**
 * 從URL上傳圖片到WordPress媒體庫
 * POST /api/wordpress-proxy/upload-image-from-url
 * Body: { imageUrl: string }
 */
export async function POST(request: NextRequest) {
  try {
    // 解析請求數據
    let data;
    try {
      data = await request.json();
    } catch (parseError) {
      console.error('解析請求JSON失敗:', parseError);
      return NextResponse.json(
        { error: '無效的請求格式，需要JSON', success: false, details: String(parseError) },
        { status: 400 }
      );
    }
    
    const { imageUrl } = data;
    
    if (!imageUrl) {
      return NextResponse.json(
        { error: '缺少圖片URL', success: false },
        { status: 400 }
      );
    }
    
    // 從環境變量獲取認證信息
    const username = process.env.WORDPRESS_API_USER;
    const password = process.env.WORDPRESS_API_PASSWORD;
    const wpApiBase = process.env.NEXT_PUBLIC_WORDPRESS_API_URL;
    
    if (!username || !password || !wpApiBase) {
      console.error('缺少WordPress API認證配置或基本URL');
      return NextResponse.json(
        { error: '缺少WordPress認證配置或基本URL', success: false },
        { status: 500 }
      );
    }
    
    console.log(`服務端API: 從URL上傳圖片到WordPress: ${imageUrl}`);
    
    try {
      // 使用服務函數上傳圖片，傳入WordPress API基本URL
      const result = await uploadMediaFromUrl(
        { username, password },
        imageUrl,
        wpApiBase
      );
      
      if (!result.success) {
        const errorMessage = result.error || '上傳圖片失敗，但未返回具體錯誤';
        console.error(`上傳圖片失敗: ${errorMessage}`);
        return NextResponse.json(
          { error: errorMessage, success: false, technical_details: result },
          { status: 400 }
        );
      }
      
      // 返回成功結果
      console.log(`圖片上傳成功，媒體ID: ${result.id}`);
      return NextResponse.json({
        success: true,
        id: result.id,
        message: '圖片上傳成功'
      });
    } catch (uploadError) {
      // 特別處理上傳過程中的錯誤
      const errorMessage = uploadError instanceof Error ? uploadError.message : String(uploadError);
      console.error('圖片上傳處理過程發生錯誤:', errorMessage);
      
      return NextResponse.json(
        { error: `上傳圖片處理失敗: ${errorMessage}`, success: false },
        { status: 500 }
      );
    }
  } catch (error) {
    // 處理請求解析或其他未知錯誤
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('處理圖片上傳請求時發生未捕獲錯誤:', errorMessage);
    
    return NextResponse.json(
      { error: '處理請求時發生未知錯誤', details: errorMessage, success: false },
      { status: 500 }
    );
  }
} 