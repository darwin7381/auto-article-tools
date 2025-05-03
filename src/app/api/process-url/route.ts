import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getApiUrl } from '@/services/utils/apiHelpers';

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
  documentId?: string;
  markdownKey?: string;
  publicUrl?: string;
  processingStatus?: string;
  aiProcessed?: boolean;
  processingComplete?: boolean;
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
async function scrapeWithFireScrawl(url: string, type: string, metadata?: Record<string, unknown>): Promise<ScrapedData> {
  console.log(`處理URL: ${url}, 類型: ${type}`, metadata);
  
  // 針對Google Docs，使用專門的處理API
  if (type === 'gdocs') {
    try {
      // 獲取文檔ID
      const docId = (metadata?.documentId as string) || extractGoogleDocId(url);
      if (!docId) {
        throw new Error('無法獲取Google文檔ID');
      }
      
      console.log(`調用Google Docs專門處理API，文檔ID: ${docId}`);
      
      // 調用專門的Google Docs處理API
      const urlId = metadata?.urlId as string;
      if (!urlId) {
        throw new Error('缺少URL ID參數');
      }
      
      // 調用API - 使用apiHelpers獲取正確URL
      const apiUrl = getApiUrl('/api/processors/process-gdocs');
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId: docId,
          urlId: urlId,
          originalUrl: url
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Google Docs處理失敗');
      }
      
      const result = await response.json();
      console.log('Google Docs 專門處理API返回結果:', result);
      
      // 判斷處理階段，從狀態值確定目前是內容提取還是AI處理階段
      const processingStatus = result.status || 'content-extracted';
      const isAiProcessed = processingStatus === 'processed-by-ai';
      
      // 從處理結果構建ScrapedData
      return {
        title: result.title || `Google Docs: ${docId}`,
        content: `# ${result.title || 'Google Docs內容'}\n\n正在從Google Docs獲取內容，請查看最終生成的Markdown文件。`,
        images: [],
        metadata: {
          language: 'zh-TW',
          wordCount: result.metadata?.wordCount || 0,
          author: 'Google Docs用戶',
          publishDate: new Date().toISOString(),
          documentId: docId,
          markdownKey: result.markdownKey,
          publicUrl: result.publicUrl,
          processingStatus: processingStatus,
          aiProcessed: isAiProcessed, // 標記是否已經完成AI處理
          processingComplete: isAiProcessed // 標記處理是否完成
        }
      };
    } catch (error) {
      console.error('Google Docs處理失敗:', error);
      throw error;
    }
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

// 從Google Docs URL提取文檔ID
function extractGoogleDocId(url: string): string {
  try {
    const urlObj = new URL(url);
    if (url.includes('/document/d/')) {
      // 標準Google Docs URL格式: https://docs.google.com/document/d/DOC_ID/edit
      const pathParts = urlObj.pathname.split('/');
      for (let i = 0; i < pathParts.length; i++) {
        if (pathParts[i] === 'd' && i + 1 < pathParts.length) {
          return pathParts[i + 1];
        }
      }
    } else {
      // 其他可能的Google Docs URL格式
      const id = urlObj.searchParams.get('id');
      if (id) return id;
    }
  } catch (error) {
    console.error('解析Google Docs URL錯誤:', error);
  }
  
  // 如果無法提取，返回一個預設值
  return 'unknown-doc-id';
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
    
    // 獲取元數據
    const metadata = urlInfo.processResult?.metadata || {};
    // 確保urlId包含在metadata中
    metadata.urlId = urlId;
    
    // 使用FireScrawl或專門API爬取內容
    const scrapedData = await scrapeWithFireScrawl(urlInfo.url, urlInfo.type, metadata);
    
    // 如果是Google Docs等已經處理過的內容，使用處理結果直接進入AI處理階段
    if (scrapedData.metadata.markdownKey) {
      console.log('使用已處理內容進入AI處理階段，markdownKey:', scrapedData.metadata.markdownKey);
      
      // 檢查是否已經完成處理了
      if (scrapedData.metadata.processingComplete) {
        console.log('內容已完成全部處理，直接返回結果');
        return NextResponse.json({
          success: true,
          urlId,
          markdownKey: scrapedData.metadata.markdownKey,
          publicUrl: scrapedData.metadata.publicUrl,
          status: 'processed-by-ai',
          metadata: {
            title: scrapedData.title,
            language: scrapedData.metadata.language,
            wordCount: scrapedData.metadata.wordCount,
            imageCount: 0,
            processingComplete: true
          }
        });
      }
      
      try {
        // 調用AI處理API
        const aiResponse = await fetch(getApiUrl('/api/process-openai'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            markdownKey: scrapedData.metadata.markdownKey,
            fileId: urlId
          }),
        });
        
        if (!aiResponse.ok) {
          console.error('AI處理失敗:', await aiResponse.text());
          throw new Error('AI處理失敗');
        }
        
        const aiResult = await aiResponse.json();
        console.log('AI處理成功:', aiResult);
        
        // 返回結果，包含AI處理的信息
        return NextResponse.json({
          success: true,
          urlId,
          markdownKey: aiResult.markdownKey || scrapedData.metadata.markdownKey,
          publicUrl: aiResult.publicUrl || scrapedData.metadata.publicUrl,
          status: 'processed-by-ai',
          metadata: {
            title: scrapedData.title,
            language: scrapedData.metadata.language,
            wordCount: scrapedData.metadata.wordCount,
            imageCount: 0,
            processingComplete: true
          }
        });
      } catch (aiError) {
        console.error('AI處理階段出錯:', aiError);
        
        // 如果有標記某些處理已完成，返回相應的狀態
        const processingStatus = scrapedData.metadata.processingStatus || 'content-extracted';
        
        // 即使AI處理失敗，仍返回基本處理結果
        return NextResponse.json({
          success: true,
          urlId,
          markdownKey: scrapedData.metadata.markdownKey,
          publicUrl: scrapedData.metadata.publicUrl,
          status: processingStatus, // 使用processingStatus
          error: 'AI處理失敗，但基本內容已提取',
          metadata: {
            title: scrapedData.title,
            language: scrapedData.metadata.language,
            wordCount: scrapedData.metadata.wordCount,
            imageCount: 0,
            processingComplete: false
          }
        });
      }
    }
    
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
    
    // 使用R2公共URL
    const baseUrl = process.env.R2_PUBLIC_URL || '';
    const publicUrl = baseUrl ? `${baseUrl}/${markdownKey}` : markdownKey;
    
    try {
      // 調用AI處理API
      const aiResponse = await fetch(getApiUrl('/api/process-openai'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          markdownKey: markdownKey,
          fileId: urlId
        }),
      });
      
      if (!aiResponse.ok) {
        console.error('AI處理失敗:', await aiResponse.text());
        throw new Error('AI處理失敗');
      }
      
      const aiResult = await aiResponse.json();
      console.log('AI處理成功:', aiResult);
      
      // 返回結果，包含AI處理的信息
      return NextResponse.json({
        success: true,
        urlId,
        markdownKey: aiResult.markdownKey || markdownKey,
        publicUrl: aiResult.publicUrl || publicUrl,
        status: 'processed-by-ai',
        metadata: {
          title: scrapedData.title,
          language: scrapedData.metadata.language,
          wordCount: scrapedData.metadata.wordCount,
          imageCount: processedImages.length
        }
      });
    } catch (aiError) {
      console.error('AI處理階段出錯:', aiError);
      
      // 即使AI處理失敗，仍返回基本處理結果
      return NextResponse.json({
        success: true,
        urlId,
        markdownKey: markdownKey,
        publicUrl: publicUrl,
        status: 'content-extracted', // 只完成了提取，未完成AI處理
        error: 'AI處理失敗，但基本內容已提取',
        metadata: {
          title: scrapedData.title,
          language: scrapedData.metadata.language,
          wordCount: scrapedData.metadata.wordCount,
          imageCount: processedImages.length
        }
      });
    }
  } catch (error) {
    console.error('URL處理錯誤:', error);
    return NextResponse.json(
      { error: '爬取URL內容失敗' },
      { status: 500 }
    );
  }
} 