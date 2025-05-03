import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

interface UrlProcessResult {
  title: string;
  url: string;
  status: string;
  message: string;
  metadata?: {
    sourceType: string;
    detectedTitle?: string;
    estimatedWordCount?: number;
    hasImages?: boolean;
    language?: string;
    urlId?: string;
    documentId?: string;
  };
}

// URL類型和處理方法的映射
const URL_HANDLERS: Record<string, (url: string) => Promise<UrlProcessResult>> = {
  'website': handleGeneralWebsite,
  'gdocs': handleGoogleDocs,
  'medium': handleMedium,
  'wechat': handleWechat
};

// R2 存儲客戶端配置
const R2 = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '',
  },
});

// 將URL資訊儲存到R2
async function saveUrlInfoToR2(url: string, type: string, data: UrlProcessResult): Promise<string> {
  // 生成唯一ID
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const urlId = `${type}-${timestamp}-${randomStr}`;
  
  // 準備儲存的數據
  const metadata = {
    'Content-Type': 'application/json',
    'url': encodeURIComponent(url),
    'url-type': type,
    'detected-title': data.metadata?.detectedTitle ? 
      encodeURIComponent(data.metadata.detectedTitle).substring(0, 100) : 
      'Unknown',
    'processed-time': new Date().toISOString(),
  };
  
  const jsonData = JSON.stringify({
    url,
    type,
    processResult: data,
    processTime: new Date().toISOString(),
  });
  
  // 儲存到R2
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'auto-article-tools';
  const key = `input/url-${urlId}.json`;
  
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: jsonData,
    Metadata: metadata,
    ContentType: 'application/json',
  });
  
  await R2.send(command);
  return urlId;
}

// 一般網站處理
async function handleGeneralWebsite(url: string): Promise<UrlProcessResult> {
  // 基本檢測，實際爬取將在階段二使用FireScrawl
  try {
    const urlObj = new URL(url);
    
    const response: UrlProcessResult = {
      title: getBasicTitle(urlObj),
      url: url,
      status: 'pending',
      message: '網站URL已驗證，將在階段二使用FireScrawl進行爬取',
      metadata: {
        sourceType: 'website',
        detectedTitle: getBasicTitle(urlObj),
        estimatedWordCount: 0, // 實際需爬取後才能確定
        hasImages: false, // 實際需爬取後才能確定
        language: 'unknown', // 實際需爬取後才能確定
      }
    };
    
    return response;
  } catch (error) {
    throw new Error(`網站URL處理失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
  }
}

// Google Docs處理
async function handleGoogleDocs(url: string): Promise<UrlProcessResult> {
  // 驗證是否為Google Docs URL
  if (!url.includes('docs.google.com')) {
    throw new Error('提供的URL不是有效的Google Docs鏈接');
  }
  
  // 從URL中提取文檔ID
  let docId = '';
  try {
    const urlObj = new URL(url);
    if (url.includes('/document/d/')) {
      // 標準Google Docs URL格式: https://docs.google.com/document/d/DOC_ID/edit
      const pathParts = urlObj.pathname.split('/');
      for (let i = 0; i < pathParts.length; i++) {
        if (pathParts[i] === 'd' && i + 1 < pathParts.length) {
          docId = pathParts[i + 1];
          break;
        }
      }
    } else {
      // 其他可能的Google Docs URL格式
      docId = urlObj.searchParams.get('id') || '';
    }
  } catch (error) {
    console.error('解析Google Docs URL錯誤:', error);
  }

  // 如果無法提取文檔ID，使用整個URL作為標識
  if (!docId) {
    docId = url.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
  }
  
  return {
    title: 'Google Docs文件',
    url: url,
    status: 'pending',
    message: 'Google Docs鏈接已驗證，將在階段二使用Google API獲取內容',
    metadata: {
      sourceType: 'gdocs',
      detectedTitle: 'Google Docs文件', // 需API獲取
      estimatedWordCount: 0, // 需API獲取
      hasImages: false, // 需API獲取
      language: 'unknown', // 需API獲取
      documentId: docId // 添加文檔ID，方便後續處理
    }
  };
}

// Medium文章處理
async function handleMedium(url: string): Promise<UrlProcessResult> {
  // 驗證是否為Medium URL
  if (!url.includes('medium.com') && !url.match(/^https:\/\/[\w-]+\.medium\.com/)) {
    throw new Error('提供的URL不是有效的Medium文章鏈接');
  }
  
  return {
    title: 'Medium文章',
    url: url,
    status: 'pending',
    message: 'Medium鏈接已驗證，將在階段二使用特定方法爬取',
    metadata: {
      sourceType: 'medium',
      detectedTitle: '待爬取Medium文章標題',
      estimatedWordCount: 0,
      hasImages: false,
      language: 'unknown',
    }
  };
}

// WeChat公眾號文章處理
async function handleWechat(url: string): Promise<UrlProcessResult> {
  // 驗證是否為WeChat URL
  if (!url.includes('weixin.qq.com') && !url.includes('mp.weixin.qq.com')) {
    throw new Error('提供的URL不是有效的微信公眾號文章鏈接');
  }
  
  return {
    title: 'WeChat公眾號文章',
    url: url,
    status: 'pending',
    message: 'WeChat鏈接已驗證，將在階段二使用特定方法爬取',
    metadata: {
      sourceType: 'wechat',
      detectedTitle: '待爬取微信文章標題',
      estimatedWordCount: 0,
      hasImages: false,
      language: 'zh', // 假設微信文章主要是中文
    }
  };
}

// 從URL獲取基本標題
function getBasicTitle(urlObj: URL): string {
  // 從路徑獲取可能的標題
  const pathSegments = urlObj.pathname.split('/').filter(Boolean);
  if (pathSegments.length > 0) {
    // 取最後一個路徑段，可能是文章slug
    const lastSegment = pathSegments[pathSegments.length - 1]
      .replace(/-/g, ' ')
      .replace(/\.\w+$/, ''); // 移除可能的副檔名
    
    // 首字母大寫
    return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1);
  }
  
  // 如果無法從路徑獲取，則使用域名
  return `來自 ${urlObj.hostname} 的內容`;
}

// 驗證URL格式
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
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
    
    // 將URL信息存儲到R2
    const urlId = await saveUrlInfoToR2(url, type, result);
    
    // 將ID添加到結果中
    if (result.metadata) {
      result.metadata.urlId = urlId;
    } else {
      result.metadata = {
        sourceType: type,
        urlId: urlId
      };
    }
    
    // 返回處理結果
    return NextResponse.json({
      success: true,
      result,
      url,
      type,
      urlId
    });
    
  } catch (error) {
    console.error('URL處理失敗:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'URL處理失敗' },
      { status: 500 }
    );
  }
} 