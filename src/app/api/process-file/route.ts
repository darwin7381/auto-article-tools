import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';

// R2 存儲客戶端配置
const R2 = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '',
  },
});

// 圖片上傳到R2並返回URL
async function uploadImageToR2(imageBuffer: Buffer, fileName: string, contentType: string): Promise<string> {
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'blocktempo-ai';
  const key = `images/${fileName}`;
  
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: imageBuffer,
    ContentType: contentType,
  });
  
  await R2.send(command);
  
  // 使用我們的 Cloudflare 自訂網域
  const baseUrl = process.env.R2_PUBLIC_URL || 'https://files.blocktempo.ai';
  return `${baseUrl}/${key}`;
}

// 從R2獲取文件
async function getFileFromR2(fileKey: string): Promise<Buffer> {
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'blocktempo-ai';
  
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: fileKey,
  });
  
  const response = await R2.send(command);
  // 修正any類型
  const stream = response.Body as { transformToByteArray(): Promise<Uint8Array> };
  
  // 將流數據轉換為Buffer
  return Buffer.from(await stream.transformToByteArray());
}

// 保存處理結果為Markdown
async function saveMarkdownToR2(content: string, fileId: string): Promise<string> {
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'blocktempo-ai';
  const key = `processed/${fileId}.md`;
  
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: content,
    ContentType: 'text/markdown',
  });
  
  await R2.send(command);
  return key;
}

// 保存Markdown到本地存儲
async function saveMarkdownToLocal(content: string, fileId: string): Promise<string> {
  // 創建目錄（如果不存在）
  const dirPath = path.join(process.cwd(), 'public', 'processed-markdown');
  
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  // 寫入文件
  const filePath = path.join(dirPath, `${fileId}.md`);
  fs.writeFileSync(filePath, content, 'utf-8');
  
  // 返回公開訪問路徑
  return `/processed-markdown/${fileId}.md`;
}

// 處理DOCX文件
async function processDOCX(buffer: Buffer, fileId: string): Promise<{ r2Key: string; localPath: string }> {
  try {
    // 提取文本和圖片
    const result = await mammoth.convertToHtml(
      { buffer },
      {
        convertImage: mammoth.images.imgElement(async (image) => {
          const imageBuffer = await image.read('base64');
          const contentType = image.contentType || 'image/png';
          const imageName = `${fileId}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${contentType.split('/')[1]}`;
          
          // 上傳圖片到R2
          const imageUrl = await uploadImageToR2(
            Buffer.from(imageBuffer, 'base64'),
            imageName,
            contentType
          );
          
          return {
            src: imageUrl
          };
        })
      }
    );
    
    // 將HTML轉換為Markdown格式（簡單實現，實際可能需要更複雜的HTML到Markdown轉換）
    // 修正正則表達式，移除'g'和's'標誌
    const markdown = result.value
      .replace(/<h1>(.*?)<\/h1>/g, '# $1\n\n')
      .replace(/<h2>(.*?)<\/h2>/g, '## $1\n\n')
      .replace(/<h3>(.*?)<\/h3>/g, '### $1\n\n')
      .replace(/<p>(.*?)<\/p>/g, '$1\n\n')
      .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
      .replace(/<em>(.*?)<\/em>/g, '*$1*')
      .replace(/<ul>(.*?)<\/ul>/g, '$1\n')
      .replace(/<li>(.*?)<\/li>/g, '- $1\n')
      .replace(/<ol>(.*?)<\/ol>/g, '$1\n')
      .replace(/<li>(.*?)<\/li>/g, '1. $1\n')
      .replace(/<a href="(.*?)">(.*?)<\/a>/g, '[$2]($1)')
      .replace(/<img src="(.*?)".*?>/g, '![]($1)\n\n');
    
    // 添加元數據
    const finalMarkdown = `---
source: docx
fileId: ${fileId}
processTime: ${new Date().toISOString()}
---

${markdown}`;
    
    // 保存Markdown到R2
    const r2Key = await saveMarkdownToR2(finalMarkdown, fileId);
    
    // 保存Markdown到本地
    const localPath = await saveMarkdownToLocal(finalMarkdown, fileId);
    
    return { r2Key, localPath };
  } catch (error) {
    console.error('DOCX處理錯誤:', error);
    throw error;
  }
}

// 定義請求體的接口類型
interface ProcessFileRequest {
  fileId: string;
  fileUrl: string;
  fileType: string;
  [key: string]: unknown; // 允許其他可能的字段
}

// 自動為PDF文件重定向到process-pdf端點
async function forwardToPdfProcessor(requestBody: ProcessFileRequest): Promise<Response> {
  try {
    // 轉發請求到處理PDF的API
    const pdfResponse = await fetch(new URL('/api/process-pdf', process.env.NEXTAUTH_URL || 'http://localhost:3000'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    // 直接返回轉發後的響應
    return pdfResponse;
  } catch (error) {
    console.error('轉發到PDF處理API失敗:', error);
    return new Response(
      JSON.stringify({ error: 'PDF處理失敗，請稍後重試' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function POST(request: Request) {
  try {
    const requestBody = await request.json();
    const { fileId, fileUrl, fileType } = requestBody;
    
    if (!fileId || !fileUrl) {
      return NextResponse.json(
        { error: '缺少必要參數' },
        { status: 400 }
      );
    }
    
    console.log('接收到處理請求:', { fileId, fileUrl, fileType });
    
    // 自動判斷是否為PDF並相應處理
    if (fileType === 'application/pdf') {
      // 為PDF文件直接轉發到PDF處理API
      console.log('檢測到PDF文件，轉發至PDF處理API');
      return forwardToPdfProcessor(requestBody);
    }
    
    // 從R2獲取文件
    let fileBuffer;
    try {
      fileBuffer = await getFileFromR2(fileUrl);
      console.log('成功從R2獲取文件, 大小:', fileBuffer.length);
    } catch (error) {
      console.error('從R2獲取文件失敗:', error);
      return NextResponse.json(
        { error: '無法從存儲中獲取文件' },
        { status: 500 }
      );
    }
    
    // 處理DOCX文件
    if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const processResult = await processDOCX(fileBuffer, fileId);
      return NextResponse.json({
        success: true,
        fileId,
        markdownKey: processResult.r2Key,
        markdownUrl: processResult.localPath,
        status: 'processed',
      });
    } else {
      // 非PDF或DOCX的情況
      return NextResponse.json(
        { error: '不支持的文件類型，僅支持PDF和DOCX文件' },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('文件處理錯誤:', error);
    return NextResponse.json(
      { error: '文件處理失敗' },
      { status: 500 }
    );
  }
} 