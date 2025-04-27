/* eslint-disable @typescript-eslint/no-var-requires */
import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// 配置 S3 客戶端
const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '',
  },
});

const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'blocktempo-ai';
const filesPublicUrl = 'https://files.blocktempo.ai';

// 上傳文件到 R2
async function uploadFileToR2(buffer: Buffer, key: string, contentType: string): Promise<string> {
  console.log(`上傳文件到 R2: ${key}, 類型: ${contentType}, 大小: ${buffer.length} 字節`);
  
  const uploadCommand = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType
  });
  
  await s3Client.send(uploadCommand);
  console.log(`文件成功上傳到 R2: ${key}`);
  
  return key;
}

// 使用 ConvertAPI 將 PDF 轉換為 DOCX
async function convertPdfToDocx(pdfUrl: string): Promise<Buffer> {
  // 構建完整的 PDF 公開 URL
  const fullPdfUrl = `${filesPublicUrl}/${pdfUrl}`;
  console.log(`開始轉換 PDF: ${fullPdfUrl}`);
  
  try {
    // 創建臨時目錄用於保存轉換結果
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // 使用官方範例的方式初始化 ConvertAPI
    var convertapi = require('convertapi')('token_ZXIdJcO7');
    
    // 直接使用完整 URL 進行轉換
    const result = await convertapi.convert('docx', {
      File: fullPdfUrl
    }, 'pdf');
    
    // 保存轉換結果到臨時目錄
    const savedFiles = await result.saveFiles(tempDir);
    console.log(`保存的文件: ${savedFiles}`);
    
    if (!savedFiles || savedFiles.length === 0) {
      throw new Error('沒有生成任何文件');
    }
    
    // 讀取第一個轉換後的文件
    const docxFilePath = savedFiles[0];
    console.log(`讀取轉換後的文件: ${docxFilePath}`);
    
    const docxBuffer = fs.readFileSync(docxFilePath);
    console.log(`DOCX 文件大小: ${docxBuffer.length} 字節`);
    
    // 刪除臨時文件
    try {
      fs.unlinkSync(docxFilePath);
    } catch (err) {
      console.warn('刪除臨時文件失敗:', err);
    }
    
    return docxBuffer;
  } catch (error) {
    console.error('PDF 轉換失敗:', error);
    throw new Error('PDF 轉換失敗: ' + (error instanceof Error ? error.message : '未知錯誤'));
  }
}

// 定義處理結果的介面
interface ProcessResult {
  success: boolean;
  fileId: string;
  markdownKey: string;
  markdownUrl: string;
  status: string;
  [key: string]: unknown;
}

// 通過現有的 process-file API 處理 DOCX 文件
async function processDocxViaApi(docxBuffer: Buffer, documentId: string): Promise<ProcessResult> {
  console.log('使用 process-file API 處理轉換後的 DOCX 文件...');
  
  // 上傳 DOCX 到 R2
  const docxKey = `upload/${documentId}.docx`;
  await uploadFileToR2(docxBuffer, docxKey, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  
  // 設置要調用 process-file API 的伺服器 URL (根據環境而定)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const apiUrl = `${baseUrl}/api/process-file`;
  
  // 發送請求到 process-file API
  const response = await fetch(apiUrl, {
    method: 'POST',
    body: JSON.stringify({
      fileUrl: docxKey,
      fileId: documentId,
      fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }),
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`處理 DOCX 失敗: ${response.status} ${response.statusText} - ${errorText}`);
  }
  
  return await response.json();
}

export async function POST(request: Request) {
  try {
    const { fileUrl, fileId } = await request.json();
    
    if (!fileUrl) {
      return NextResponse.json(
        { error: '未提供文件 URL' },
        { status: 400 }
      );
    }
    
    console.log(`處理 PDF 文件: ${fileUrl}`);
    
    try {
      // 使用提供的 fileId 或生成新的 ID
      const documentId = fileId || uuidv4();
      
      // 使用 ConvertAPI 將 PDF URL 直接轉換為 DOCX
      const docxBuffer = await convertPdfToDocx(fileUrl);
      
      // 使用 process-file API 處理 DOCX
      const processResult = await processDocxViaApi(docxBuffer, documentId);
      
      // 返回處理結果
      return NextResponse.json({
        success: true,
        fileId: documentId,
        markdownKey: processResult.markdownKey,
        markdownUrl: processResult.markdownUrl,
        status: 'processed'
      });
      
    } catch (error) {
      throw error;
    }
    
  } catch (error: unknown) {
    console.error('PDF 處理錯誤:');
    console.error(error);
    
    const errorMessage = error instanceof Error ? error.message : '未知錯誤';
    
    return NextResponse.json(
      { error: '處理 PDF 時發生錯誤', details: errorMessage },
      { status: 500 }
    );
  }
} 