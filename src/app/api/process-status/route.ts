import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

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
async function getUrlInfoFromR2(urlInfoKey: string) {
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'auto-article-tools';
  
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: urlInfoKey,
  });
  
  try {
    const response = await R2.send(command);
    const stream = response.Body as { transformToByteArray(): Promise<Uint8Array> };
    const buffer = Buffer.from(await stream.transformToByteArray());
    return JSON.parse(buffer.toString());
  } catch (error) {
    console.error('獲取URL信息失敗:', error);
    throw error;
  }
}

// 檢查增強版Markdown是否存在
async function checkEnhancedMarkdownExists(fileId: string): Promise<boolean> {
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'auto-article-tools';
  const enhancedKey = `processed/${fileId}-ai-enhanced.md`;
  
  try {
    const command = new HeadObjectCommand({
      Bucket: bucketName,
      Key: enhancedKey,
    });
    
    await R2.send(command);
    return true;
  } catch {
    // 忽略錯誤，只關心文件是否存在
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const { urlId, markdownKey } = await request.json();
    
    if (!urlId) {
      return NextResponse.json(
        { error: '缺少必要參數' },
        { status: 400 }
      );
    }
    
    console.log(`查詢處理狀態: urlId=${urlId}, markdownKey=${markdownKey}`);
    
    // 從R2獲取URL信息
    const urlInfoKey = `input/url-${urlId}.json`;
    const urlInfo = await getUrlInfoFromR2(urlInfoKey);
    
    if (!urlInfo) {
      return NextResponse.json(
        { error: '未找到URL信息' },
        { status: 404 }
      );
    }
    
    // 判斷處理階段
    let stage = 'unknown';
    let stageComplete = false;
    let publicUrl = '';
    let status = '';
    
    // 首先檢查AI增強版Markdown是否存在 - 這是最準確的完成標誌
    const aiEnhancedExists = await checkEnhancedMarkdownExists(urlId);
    
    if (aiEnhancedExists) {
      stage = 'process';
      stageComplete = true;
      status = 'processed-by-ai';
      publicUrl = `${process.env.R2_PUBLIC_URL || ''}/processed/${urlId}-ai-enhanced.md`;
    }
    // 檢查結果，如果AI增強版不存在
    else if (urlInfo.aiProcessed) {
      stage = 'process';
      stageComplete = true;
      status = 'processed-by-ai';
      publicUrl = urlInfo.publicUrl || '';
    } 
    // 特別處理Google Docs流程
    else if (urlInfo.type === 'gdocs' && markdownKey) {
      // 已有markdownKey表示內容提取已完成
      stage = 'extract';
      stageComplete = true;
      status = 'content-extracted';
      publicUrl = urlInfo.publicUrl || '';
      
      // 檢查是否在AI處理中（有markdownKey但沒有AI增強版）
      if (!aiEnhancedExists && (Date.now() - (urlInfo.timestamp || 0) < 60000)) {
        // 推測可能AI處理中
        stage = 'process';
        stageComplete = false;
        status = 'processing-ai';
      }
    }
    else if (urlInfo.extracted) {
      stage = 'extract';
      stageComplete = true;
      status = 'content-extracted';
    } 
    else if (urlInfo.uploaded) {
      stage = 'upload';
      stageComplete = true;
      status = 'uploaded';
    }
    
    // 更完整的狀態響應
    const processingComplete = stage === 'process' && stageComplete;
    
    // 返回處理狀態
    return NextResponse.json({
      urlId,
      stage,
      stageComplete,
      publicUrl,
      markdownKey,
      status,
      processingComplete,
      // 添加一個時間戳，用於前端判斷響應新鮮度
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('檢查處理狀態錯誤:', error);
    return NextResponse.json(
      { error: '檢查處理狀態失敗' },
      { status: 500 }
    );
  }
} 