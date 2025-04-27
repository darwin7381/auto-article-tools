import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from 'fs';
import path from 'path';
import axios from 'axios';

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
const PDF_CO_API_KEY = process.env.PDF_CO_API_KEY || '';

// 打印環境變數狀態 (不包含敏感值)
console.log('環境變數狀態:', {
  hasR2Endpoint: !!process.env.CLOUDFLARE_R2_ENDPOINT,
  hasR2AccessKeyId: !!process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
  hasR2SecretAccessKey: !!process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  bucketName,
  hasPdfCoApiKey: !!PDF_CO_API_KEY,
  pdfCoApiKeyLength: PDF_CO_API_KEY.length
});

// 為 R2 生成預簽 URL
async function getR2PresignedUrl(key: string): Promise<string> {
  console.log(`為 R2 文件生成預簽 URL: ${key}`);
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  console.log(`生成預簽 URL 成功: ${url}`);
  return url;
}

// 保存 HTML 到本地文件系統
async function saveHtmlToLocal(html: string, fileId: string): Promise<string> {
  console.log(`保存 HTML 到本地, 文件ID: ${fileId}`);
  
  const localDir = path.resolve(process.cwd(), 'public/processed-markdown');
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }
  
  const localPath = path.join(localDir, `${fileId}.html`);
  fs.writeFileSync(localPath, html);
  
  const publicPath = `/processed-markdown/${fileId}.html`;
  return publicPath;
}

// 直接使用 PDF.co API 轉換 PDF
async function convertPdfWithPdfCo(pdfUrl: string): Promise<string> {
  console.log(`使用 PDF.co 轉換 PDF: ${pdfUrl}`);
  
  // 調用 PDF.co API
  const response = await axios.post('https://api.pdf.co/v1/pdf/convert/to/html', {
    url: pdfUrl,
    async: false
  }, {
    headers: {
      'x-api-key': PDF_CO_API_KEY,
      'Content-Type': 'application/json'
    }
  });
  
  if (response.data.error) {
    throw new Error(`PDF.co API 錯誤: ${response.data.message}`);
  }
  
  // 下載轉換後的 HTML
  const htmlUrl = response.data.url;
  console.log(`PDF.co 生成的 HTML URL: ${htmlUrl}`);
  
  const htmlResponse = await axios.get(htmlUrl);
  return htmlResponse.data;
}

export async function POST(request: Request) {
  try {
    const { fileUrl } = await request.json();
    
    if (!fileUrl) {
      return NextResponse.json(
        { error: '未提供文件 URL' },
        { status: 400 }
      );
    }
    
    console.log(`處理 PDF 文件: ${fileUrl}`);
    
    // 為 R2 上的 PDF 文件生成預簽 URL
    const presignedUrl = await getR2PresignedUrl(fileUrl);
    
    // 使用 PDF.co 處理 PDF
    const htmlContent = await convertPdfWithPdfCo(presignedUrl);
    
    // 生成文件 ID 並保存 HTML
    const fileId = `pdf-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const localPath = await saveHtmlToLocal(htmlContent, fileId);
    
    return NextResponse.json({
      success: true,
      message: 'PDF 處理成功',
      markdownUrl: localPath,
    });
    
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