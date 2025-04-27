import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';

// 改用直接導入pdf-parse的具體處理模塊，避免初始化測試代碼
// import pdfParse from 'pdf-parse';

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
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'auto-article-tools';
  const key = `images/${fileName}`;
  
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: imageBuffer,
    ContentType: contentType,
  });
  
  await R2.send(command);
  
  // 這裡應該返回圖片的公開訪問URL
  // 實際部署時需要配置R2的公開訪問策略或使用Cloudflare Workers
  const baseUrl = process.env.R2_PUBLIC_URL || 'https://yourcdndomain.com';
  return `${baseUrl}/${key}`;
}

// 從R2獲取文件
async function getFileFromR2(fileKey: string): Promise<Buffer> {
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'auto-article-tools';
  
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
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'auto-article-tools';
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

// 處理PDF文件
async function processPDF(buffer: Buffer, fileId: string): Promise<{ r2Key: string; localPath: string }> {
  try {
    console.log('正在處理PDF文件...');
    
    // 直接導入特定處理模塊，避免初始化問題
    const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;
    
    // 使用pdf-parse提取文本
    const data = await pdfParse(buffer);
    
    // 提取文本內容
    const text = data.text;
    console.log('成功提取PDF文本內容');
    
    // 注意：這個基本實現只提取了文本，沒有提取圖片
    // PDF圖片提取需要更複雜的處理，可能需要使用pdf.js或其他庫
    // 這裡只是基本示例，實際項目需要實現完整的PDF圖片提取
    
    // 生成Markdown
    const markdown = `---
source: pdf
fileId: ${fileId}
pageCount: ${data.numpages}
processTime: ${new Date().toISOString()}
---

# ${data.info?.Title || 'Untitled Document'}

${text
  .split('\n')
  .filter((line: string) => line.trim() !== '')
  .join('\n\n')}
`;
    
    // 保存Markdown到R2
    const r2Key = await saveMarkdownToR2(markdown, fileId);
    
    // 保存Markdown到本地
    const localPath = await saveMarkdownToLocal(markdown, fileId);
    
    return { r2Key, localPath };
  } catch (error) {
    console.error('PDF處理錯誤:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const { fileId, fileUrl, fileType } = await request.json();
    
    if (!fileId || !fileUrl) {
      return NextResponse.json(
        { error: '缺少必要參數' },
        { status: 400 }
      );
    }
    
    console.log('接收到處理請求:', { fileId, fileUrl, fileType });
    
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
    
    let processResult;
    
    // 根據文件類型處理
    if (fileType === 'application/pdf') {
      processResult = await processPDF(fileBuffer, fileId);
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      processResult = await processDOCX(fileBuffer, fileId);
    } else {
      return NextResponse.json(
        { error: '不支持的文件類型' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      fileId,
      markdownKey: processResult.r2Key,
      markdownUrl: processResult.localPath,
      status: 'processed',
    });
    
  } catch (error) {
    console.error('文件處理錯誤:', error);
    return NextResponse.json(
      { error: '文件處理失敗' },
      { status: 500 }
    );
  }
} 