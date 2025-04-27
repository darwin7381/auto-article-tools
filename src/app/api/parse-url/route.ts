import { NextResponse } from 'next/server';

interface UrlProcessResult {
  title: string;
  url: string;
  status: string;
  message: string;
}

// URL類型和處理方法的映射
const URL_HANDLERS: Record<string, (url: string) => Promise<UrlProcessResult>> = {
  'website': handleGeneralWebsite,
  'gdocs': handleGoogleDocs,
  'medium': handleMedium,
  'wechat': handleWechat
};

// 一般網站處理
async function handleGeneralWebsite(url: string): Promise<UrlProcessResult> {
  // 實際實現將會在階段二使用FireScrawl進行網頁爬取
  return {
    title: '一般網站文章',
    url: url,
    status: 'pending',
    message: '將使用FireScrawl爬取網頁內容',
  };
}

// Google Docs處理
async function handleGoogleDocs(url: string): Promise<UrlProcessResult> {
  return {
    title: 'Google Docs文件',
    url: url,
    status: 'pending',
    message: '將使用Google API獲取文檔內容',
  };
}

// Medium文章處理
async function handleMedium(url: string): Promise<UrlProcessResult> {
  return {
    title: 'Medium文章',
    url: url,
    status: 'pending',
    message: '將使用特定方法爬取Medium文章',
  };
}

// WeChat公眾號文章處理
async function handleWechat(url: string): Promise<UrlProcessResult> {
  return {
    title: 'WeChat公眾號文章',
    url: url,
    status: 'pending',
    message: '將使用特定方法爬取WeChat文章',
  };
}

// 驗證URL格式
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (_) {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const { url, type = 'website' } = await request.json();
    
    // 驗證輸入
    if (!url) {
      return NextResponse.json(
        { error: '未提供URL' },
        { status: 400 }
      );
    }
    
    if (!isValidUrl(url)) {
      return NextResponse.json(
        { error: 'URL格式無效' },
        { status: 400 }
      );
    }
    
    // 檢查URL類型處理方法是否存在
    if (!URL_HANDLERS[type]) {
      return NextResponse.json(
        { error: '不支持的URL類型' },
        { status: 400 }
      );
    }
    
    // 調用相應的處理方法
    const handler = URL_HANDLERS[type];
    const result = await handler(url);
    
    // 返回處理結果
    return NextResponse.json({
      success: true,
      result,
      url,
      type
    });
    
  } catch (error) {
    console.error('URL處理失敗:', error);
    return NextResponse.json(
      { error: 'URL處理失敗' },
      { status: 500 }
    );
  }
} 