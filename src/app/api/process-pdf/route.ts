import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
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

// 預處理 1：解碼 HTML 實體編碼 (如 &#xxxxx;) 為 UTF-8 字符
function decodeHtmlEntities(html: string): string {
  console.log('開始解碼 HTML 實體編碼');
  
  // 使用正則表達式替換 HTML 實體編碼
  const decodedHtml = html
    // 處理十進制 HTML 實體編碼 (如 &#12345;)
    .replace(/&#(\d+);/g, (match, dec) => {
      return String.fromCharCode(parseInt(dec, 10));
    })
    // 處理十六進制 HTML 實體編碼 (如 &#x1234;)
    .replace(/&#x([0-9a-f]+);/gi, (match, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    })
    // 處理常見的命名 HTML 實體
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
  
  console.log('HTML 實體解碼完成');
  return decodedHtml;
}

// 預處理 2：上傳 base64 圖片到 R2 並替換 URL
async function processBase64Images(html: string, fileId: string): Promise<string> {
  console.log('開始處理 base64 圖片');
  
  // 分割 HTML 為行數組，便於按行處理
  const lines = html.split('\n');
  const newLines = [];
  
  // 圖片計數器，用於生成唯一的圖片名稱
  let imageCounter = 1;
  
  // 逐行處理 HTML
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 檢查該行是否包含 base64 圖片
    if (line.includes('src="data:image') && line.includes('base64,')) {
      console.log(`檢測到 base64 圖片在第 ${i+1} 行`);
      
      try {
        // 使用正則表達式提取 img 標籤、圖片類型和 base64 數據
        const imgTagMatch = line.match(/<img[^>]*src="data:([^;]+);base64,([^"]+)"[^>]*>/i);
        
        if (imgTagMatch) {
          const fullImgTag = imgTagMatch[0];
          const mimeType = imgTagMatch[1];
          const base64Data = imgTagMatch[2];
          
          // 從 MIME 類型中提取文件擴展名
          const extension = mimeType.split('/')[1] || 'png';
          
          // 創建圖片文件名
          const imageName = `${fileId}-img-${imageCounter}.${extension}`;
          imageCounter++;
          
          // 解碼 base64 數據為 Buffer
          const imageBuffer = Buffer.from(base64Data, 'base64');
          
          // 上傳圖片到 R2
          const imageKey = `images/${imageName}`;
          const uploadCommand = new PutObjectCommand({
            Bucket: bucketName,
            Key: imageKey,
            Body: imageBuffer,
            ContentType: mimeType
          });
          
          await s3Client.send(uploadCommand);
          console.log(`圖片已上傳到 R2: ${imageKey}`);
          
          // 生成圖片的完整 CDN URL
          const imageUrl = `https://files.blocktempo.ai/images/${imageName}`;
          
          // 從原始的 img 標籤中提取寬度和高度
          const widthMatch = fullImgTag.match(/width="([^"]+)"/i);
          const heightMatch = fullImgTag.match(/height="([^"]+)"/i);
          const width = widthMatch ? widthMatch[1] : '';
          const height = heightMatch ? heightMatch[1] : '';
          
          // 創建新的 img 標籤，使用完整 CDN URL 而不是 base64
          let newImgTag = `<img src="${imageUrl}"`;
          if (width) newImgTag += ` width="${width}"`;
          if (height) newImgTag += ` height="${height}"`;
          newImgTag += ' />';
          
          // 替換整行中的 img 標籤
          const newLine = line.replace(fullImgTag, newImgTag);
          newLines.push(newLine);
          
          console.log(`替換了 base64 圖片為 CDN URL: ${imageUrl}`);
        } else {
          // 如果正則表達式沒有匹配，保留原行
          newLines.push(line);
        }
      } catch (error) {
        console.error(`處理第 ${i+1} 行的 base64 圖片時出錯:`, error);
        // 發生錯誤時保留原行
        newLines.push(line);
      }
    } else {
      // 如果不包含 base64 圖片，保留原行
      newLines.push(line);
    }
  }
  
  // 重新組合 HTML
  const processedHtml = newLines.join('\n');
  console.log(`處理 base64 圖片完成，共處理了 ${imageCounter - 1} 張圖片`);
  
  return processedHtml;
}

// 保存 HTML 到本地文件系統
async function saveHtmlToLocal(html: string, fileId: string): Promise<string> {
  console.log(`保存 HTML 到本地, 文件ID: ${fileId}`);
  
  // 預處理 1：解碼 HTML 實體
  const decodedHtml = decodeHtmlEntities(html);
  console.log(`HTML 實體解碼完成，準備處理圖片`);
  
  // 預處理 2：處理 base64 圖片
  const processedHtml = await processBase64Images(decodedHtml, fileId);
  console.log(`圖片處理完成，準備保存文件`);
  
  const localDir = path.resolve(process.cwd(), 'public/processed-markdown');
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }
  
  const localPath = path.join(localDir, `${fileId}.html`);
  fs.writeFileSync(localPath, processedHtml);
  
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