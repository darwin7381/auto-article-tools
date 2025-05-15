import { NextRequest, NextResponse } from 'next/server';

// 正確使用環境變量命名（與.env.local保持一致）
const WP_API_URL = process.env.NEXT_PUBLIC_WORDPRESS_API_URL || '';
const WP_API_USER = process.env.WORDPRESS_API_USER || '';
const WP_API_PASSWORD = process.env.WORDPRESS_API_PASSWORD || '';

// 調試日誌以顯示環境變量狀態（不顯示實際值）
console.log('WordPress服務端環境變量檢查:', {
  hasApiUrl: !!WP_API_URL,
  hasUser: !!WP_API_USER,
  hasPassword: !!WP_API_PASSWORD,
  apiUrlPrefix: WP_API_URL ? WP_API_URL.substring(0, 10) + '...' : '未設置'
});

export async function POST(request: NextRequest) {
  try {
    // 檢查環境變量是否設置
    if (!WP_API_URL) {
      console.error('WordPress API URL環境變量未設置');
      return NextResponse.json(
        { error: '服務端環境變量未正確配置: 缺少NEXT_PUBLIC_WORDPRESS_API_URL' },
        { status: 500 }
      );
    }
    
    if (!WP_API_USER || !WP_API_PASSWORD) {
      console.error('WordPress API認證環境變量未設置');
      return NextResponse.json(
        { error: '服務端環境變量未正確配置: 缺少WORDPRESS_API_USER或WORDPRESS_API_PASSWORD' },
        { status: 500 }
      );
    }

    // 解析請求體
    const requestData = await request.json();
    
    // 構建WordPress API端點
    const apiEndpoint = `${WP_API_URL.endsWith('/') ? WP_API_URL.slice(0, -1) : WP_API_URL}/wp-json/wp/v2/posts`;
    
    // 準備Basic認證
    const authString = `${WP_API_USER}:${WP_API_PASSWORD}`;
    const base64Auth = Buffer.from(authString).toString('base64');
    
    console.log(`WordPress服務端代理: 開始請求 ${apiEndpoint}`);
    
    // 執行WordPress API請求
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${base64Auth}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestData),
      cache: 'no-store'
    });
    
    // 獲取響應內容
    const contentType = response.headers.get('content-type') || '';
    
    // 根據內容類型處理響應
    if (contentType.includes('application/json')) {
      const data = await response.json();
      console.log(`WordPress API響應成功: 狀態碼=${response.status}`);
      
      return NextResponse.json(data, { status: response.status });
    } else {
      // 非JSON響應處理
      const text = await response.text();
      console.error('WordPress API返回非JSON響應:', {
        status: response.status,
        contentType,
        textPreview: text.substring(0, 500)
      });
      
      return NextResponse.json(
        { 
          error: `WordPress API返回非JSON格式 (${response.status})`, 
          details: '服務器返回了HTML而不是預期的JSON響應，請檢查API配置', 
          textPreview: text.substring(0, 200) 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    // 詳細記錄錯誤
    console.error('WordPress代理API發生異常:', error);
    
    return NextResponse.json(
      { 
        error: '處理WordPress發布請求時發生系統錯誤', 
        message: error instanceof Error ? error.message : '未知錯誤',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 