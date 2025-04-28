import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

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

// 從 R2 獲取圖片
async function getImageFromR2(key: string): Promise<{ buffer: Buffer; contentType: string }> {
  console.log(`從 R2 獲取圖片: ${key}`);
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  const response = await s3Client.send(command);
  const stream = response.Body as Readable;
  const contentType = response.ContentType || 'image/png';
  
  return new Promise<{ buffer: Buffer; contentType: string }>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('end', () => {
      const buffer = Buffer.concat(chunks);
      resolve({ buffer, contentType });
    });
    stream.on('error', reject);
  });
}

// 處理 GET 請求
export async function GET(
  request: Request,
  { params }: { params: Promise<{ imageName: string }> }
) {
  try {
    const { imageName } = await params;
    
    if (!imageName) {
      return NextResponse.json(
        { error: '未提供圖片名稱' },
        { status: 400 }
      );
    }
    
    console.log(`處理圖片請求: ${imageName}`);
    
    // 圖片在 R2 中的鍵名
    const imageKey = `images/${imageName}`;
    
    try {
      // 從 R2 獲取圖片
      const { buffer, contentType } = await getImageFromR2(imageKey);
      
      // 返回圖片
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000', // 緩存一年
        },
      });
    } catch (error) {
      console.error(`獲取圖片時出錯: ${imageKey}`, error);
      return NextResponse.json(
        { error: '找不到圖片' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('處理圖片請求時出錯:', error);
    return NextResponse.json(
      { error: '處理圖片請求時出錯' },
      { status: 500 }
    );
  }
} 