import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

// 定義類型
interface ScrapedImage {
  url: string;
  alt?: string;
}

interface ScrapedMetadata {
  language?: string;
  wordCount: number;
  author?: string;
  publishDate?: string;
}

interface ScrapedData {
  title: string;
  content: string;
  images: ScrapedImage[];
  metadata: ScrapedMetadata;
}

interface ProcessedImage {
  original: string;
  stored: string;
  alt?: string;
}

interface UrlInfo {
  url: string;
  type: string;
  processResult?: {
    title?: string;
    url?: string;
    status?: string;
    message?: string;
    metadata?: Record<string, unknown>;
  };
  processTime?: string;
}

// FireScrawl 爬取功能模擬
// 注意：實際項目中應該使用真實的FireScrawl API，這裡僅為示例
async function scrapeWithFireScrawl(url: string, type: string): Promise<ScrapedData> {
  // 這裡應該是調用FireScrawl API的實際實現
  // 當前僅模擬返回數據
  console.log(`模擬爬取URL: ${url}, 類型: ${type}`);
  
  // 根據不同類型返回不同的模擬數據
  if (type === 'gdocs') {
    return {
      title: 'Google Docs樣本文件',
      content: '# Google Docs樣本內容\n\n這是從Google Docs提取的內容示例。\n\n## 第二級標題\n\n這是第二段落內容。',
      images: [
        { url: 'https://example.com/placeholder1.jpg', alt: '示例圖片1' }
      ],
      metadata: {
        language: 'zh-TW',
        wordCount: 150,
        author: '示例作者',
        publishDate: new Date().toISOString()
      }
    };
  } else if (type === 'medium') {
    return {
      title: 'Medium文章標題',
      content: '# Medium文章標題\n\n這是從Medium文章爬取的內容示例。\n\n## 子標題\n\n具體內容段落。',
      images: [
        { url: 'https://example.com/medium-img1.jpg', alt: 'Medium圖片' },
        { url: 'https://example.com/medium-img2.jpg', alt: '文章圖片' }
      ],
      metadata: {
        language: 'zh-CN',
        wordCount: 200,
        author: 'Medium作者',
        publishDate: new Date().toISOString()
      }
    };
  } else if (type === 'wechat') {
    return {
      title: '微信公眾號文章',
      content: '# 微信公眾號文章標題\n\n這是從微信公眾號爬取的內容示例。\n\n內容段落。',
      images: [
        { url: 'https://example.com/wechat-header.jpg', alt: '頭圖' },
        { url: 'https://example.com/wechat-content.jpg', alt: '內容圖片' }
      ],
      metadata: {
        language: 'zh-CN',
        wordCount: 350,
        author: '公眾號名稱',
        publishDate: new Date().toISOString()
      }
    };
  } else {
    // 一般網站
    return {
      title: '網站文章標題',
      content: '# 網站文章標題\n\n這是從一般網站爬取的內容示例。\n\n## 段落標題\n\n詳細內容。\n\n## 另一段落\n\n更多內容。',
      images: [
        { url: 'https://example.com/site-img1.jpg', alt: '網站圖片1' },
        { url: 'https://example.com/site-img2.jpg', alt: '網站圖片2' }
      ],
      metadata: {
        language: 'en',
        wordCount: 500,
        author: '網站作者',
        publishDate: new Date().toISOString()
      }
    };
  }
}

// 將爬取的圖片上傳到R2
async function uploadScrapedImagesToR2(images: ScrapedImage[], urlId: string): Promise<ProcessedImage[]> {
  // 實際項目中，這裡應該下載圖片並上傳到R2
  // 當前僅模擬此過程
  console.log(`模擬上傳${images.length}張圖片到R2`);
  
  // 模擬上傳結果
  return images.map((img, index) => {
    return {
      original: img.url,
      stored: `https://yourcdndomain.com/images/${urlId}-image-${index}.jpg`,
      alt: img.alt
    };
  });
}

// 生成Markdown內容
function generateMarkdown(scrapedData: ScrapedData, processedImages: ProcessedImage[], urlId: string, sourceUrl: string, type: string): string {
  // 替換圖片連結
  let content = scrapedData.content;
  
  // 替換原始圖片URL為R2存儲的URL
  processedImages.forEach(img => {
    content = content.replace(
      new RegExp(img.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
      img.stored
    );
  });
  
  // 生成Front Matter元數據
  const frontMatter = `---
source: url
sourceType: ${type}
urlId: ${urlId}
originalUrl: ${sourceUrl}
title: ${scrapedData.title}
language: ${scrapedData.metadata.language || 'unknown'}
wordCount: ${scrapedData.metadata.wordCount}
author: ${scrapedData.metadata.author || 'unknown'}
publishDate: ${scrapedData.metadata.publishDate || 'unknown'}
processTime: ${new Date().toISOString()}
---

`;

  // 組合最終Markdown
  return frontMatter + content;
}

// R2 存儲客戶端配置
const R2 = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '',
  },
});

// 從R2獲取URL信息
async function getUrlInfoFromR2(urlInfoKey: string): Promise<UrlInfo> {
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'auto-article-tools';
  
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: urlInfoKey,
  });
  
  try {
    const response = await R2.send(command);
    const stream = response.Body as { transformToByteArray(): Promise<Uint8Array> };
    const buffer = Buffer.from(await stream.transformToByteArray());
    return JSON.parse(buffer.toString()) as UrlInfo;
  } catch (error) {
    console.error('獲取URL信息失敗:', error);
    throw error;
  }
}

// 保存處理結果為Markdown
async function saveMarkdownToR2(content: string, urlId: string): Promise<string> {
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'auto-article-tools';
  const key = `processed/${urlId}.md`;
  
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: content,
    ContentType: 'text/markdown',
  });
  
  await R2.send(command);
  return key;
}

export async function POST(request: Request) {
  try {
    const { urlId } = await request.json();
    
    if (!urlId) {
      return NextResponse.json(
        { error: '缺少必要參數' },
        { status: 400 }
      );
    }
    
    // 從R2獲取URL信息
    const urlInfoKey = `input/url-${urlId}.json`;
    const urlInfo = await getUrlInfoFromR2(urlInfoKey);
    
    if (!urlInfo || !urlInfo.url || !urlInfo.type) {
      return NextResponse.json(
        { error: 'URL信息無效或未找到' },
        { status: 404 }
      );
    }
    
    // 使用FireScrawl爬取內容
    const scrapedData = await scrapeWithFireScrawl(urlInfo.url, urlInfo.type);
    
    // 處理爬取的圖片（上傳到R2）
    const processedImages = await uploadScrapedImagesToR2(scrapedData.images, urlId);
    
    // 生成Markdown
    const markdown = generateMarkdown(
      scrapedData,
      processedImages,
      urlId,
      urlInfo.url,
      urlInfo.type
    );
    
    // 保存Markdown到R2
    const markdownKey = await saveMarkdownToR2(markdown, urlId);
    
    return NextResponse.json({
      success: true,
      urlId,
      markdownKey,
      status: 'processed',
      metadata: {
        title: scrapedData.title,
        language: scrapedData.metadata.language,
        wordCount: scrapedData.metadata.wordCount,
        imageCount: processedImages.length
      }
    });
    
  } catch (error) {
    console.error('URL處理錯誤:', error);
    return NextResponse.json(
      { error: '爬取URL內容失敗' },
      { status: 500 }
    );
  }
} 