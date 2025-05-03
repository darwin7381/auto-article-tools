import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import axios from 'axios';
import { getApiUrl } from '@/services/utils/apiHelpers';

// Google Docs處理請求接口
interface ProcessGDocsRequest {
  documentId: string;
  urlId: string;
  originalUrl: string;
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

// 從Google Docs下載DOCX文件
async function downloadGoogleDocsAsDocx(docId: string): Promise<Buffer> {
  try {
    console.log(`從Google Drive下載文檔(DOCX格式): ${docId}`);
    
    // 導出為DOCX格式
    const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=docx`;
    
    const response = await axios.get(exportUrl, {
      responseType: 'arraybuffer',
      timeout: 30000, // 30秒超時
    });
    
    return Buffer.from(response.data);
  } catch (error) {
    console.error('下載Google Docs文檔失敗:', error);
    throw new Error(`下載Google Docs文檔失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
  }
}

// 將DOCX文件保存到R2
async function saveDocxToR2(docxBuffer: Buffer, urlId: string): Promise<{ fileUrl: string, fileName: string }> {
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'auto-article-tools';
  const fileName = `${urlId}.docx`;
  const key = `temp/${fileName}`;
  
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: docxBuffer,
    ContentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  
  await R2.send(command);
  
  // 構建文件URL
  return {
    fileUrl: key,
    fileName: fileName
  };
}

export async function POST(request: Request) {
  try {
    const { documentId, urlId, originalUrl } = await request.json() as ProcessGDocsRequest;
    
    if (!documentId || !urlId) {
      return NextResponse.json(
        { error: '缺少必要參數' },
        { status: 400 }
      );
    }
    
    console.log(`處理Google Docs文檔: ${documentId}, urlId: ${urlId}`);
    
    // 1. 下載Google Docs為DOCX格式
    const docxBuffer = await downloadGoogleDocsAsDocx(documentId);
    
    if (!docxBuffer || docxBuffer.length === 0) {
      return NextResponse.json(
        { error: '無法下載文檔內容' },
        { status: 500 }
      );
    }
    
    // 2. 保存DOCX到R2
    const { fileUrl, fileName } = await saveDocxToR2(docxBuffer, urlId);
    
    // 3. 調用現有的process-docx處理流程
    const processResponse = await fetch(getApiUrl('/api/processors/process-docx'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileUrl: fileUrl,
        fileName: fileName,
        fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileId: urlId,
        sourceType: 'gdocs',
        originalUrl: originalUrl,
        metadata: {
          documentId: documentId
        }
      }),
    });
    
    if (!processResponse.ok) {
      const errorData = await processResponse.json();
      throw new Error(errorData.error || 'DOCX處理失敗');
    }
    
    // 4. 返回處理結果
    const processResult = await processResponse.json();
    
    console.log('Google Docs處理完成，返回結果:', {
      ...processResult,
      urlId,
      documentId,
      status: processResult.status || 'content-extracted'
    });
    
    return NextResponse.json({
      success: true,
      urlId,
      documentId,
      ...processResult,
      status: processResult.status || 'content-extracted',
      title: `Google Docs: ${documentId}`,
    }, {
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'Content-Encoding': 'identity'
      }
    });
    
  } catch (error) {
    console.error('Google Docs處理錯誤:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Google Docs處理失敗' },
      { status: 500 }
    );
  }
} 