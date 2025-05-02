import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

/**
 * R2存儲服務 - 提供與Cloudflare R2交互的所有方法
 */

// 單例模式初始化R2客戶端
export const R2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '',
  },
});

// R2存儲桶名稱
export const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'blocktempo-ai';

// R2公開訪問URL
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://files.blocktempo.ai';

/**
 * 從R2獲取文件
 * @param fileKey 文件在R2中的鍵值
 * @returns 文件內容的Buffer
 */
export async function getFileFromR2(fileKey: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
  });
  
  const response = await R2Client.send(command);
  const stream = response.Body as { transformToByteArray(): Promise<Uint8Array> };
  
  return Buffer.from(await stream.transformToByteArray());
}

/**
 * 上傳文件到R2
 * @param buffer 文件內容
 * @param key 文件在R2中的鍵值
 * @param contentType 文件MIME類型
 * @returns 上傳後的文件信息，包含鍵值和公開URL
 */
export async function uploadFileToR2(buffer: Buffer, key: string, contentType: string): Promise<{
  key: string;
  publicUrl: string;
}> {
  // 设置文件的元数据和Headers
  const metadata: Record<string, string> = {
    'Content-Disposition': 'inline'
  };
  
  // 对于特定类型文件，添加额外控制
  if (contentType.includes('markdown') || key.endsWith('.md')) {
    contentType = 'text/markdown; charset=utf-8';
  } else if (contentType.includes('json')) {
    contentType = 'application/json; charset=utf-8';
  } else if (contentType.includes('text')) {
    contentType = `${contentType}; charset=utf-8`;
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ContentEncoding: 'utf-8',
    Metadata: metadata,
    // 添加缓存控制，避免旧版本缓存问题
    CacheControl: 'no-cache, max-age=0'
  });
  
  await R2Client.send(command);
  
  // 返回包含公開URL的對象
  return {
    key,
    publicUrl: `${R2_PUBLIC_URL}/${key}`
  };
}

/**
 * 上傳圖片到R2
 * @param imageBuffer 圖片內容
 * @param fileName 檔案名稱
 * @param contentType 圖片MIME類型
 * @returns 圖片公開訪問URL
 */
export async function uploadImageToR2(imageBuffer: Buffer, fileName: string, contentType: string): Promise<string> {
  const key = `images/${fileName}`;
  
  await uploadFileToR2(imageBuffer, key, contentType);
  
  // 返回公開訪問URL
  return `${R2_PUBLIC_URL}/${key}`;
}

/**
 * 上傳JSON數據到R2
 * @param data 要上傳的JSON數據
 * @param key 文件在R2中的鍵值
 * @param metadata 可選的元數據
 * @returns 上傳後的文件鍵值
 */
export async function uploadJsonToR2(data: object, key: string, metadata?: Record<string, string>): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: JSON.stringify(data),
    ContentType: 'application/json',
    Metadata: metadata,
  });
  
  await R2Client.send(command);
  return key;
}

/**
 * 從R2獲取JSON數據
 * @param key 文件在R2中的鍵值
 * @returns 解析後的JSON對象
 */
export async function getJsonFromR2<T = unknown>(key: string): Promise<T> {
  const buffer = await getFileFromR2(key);
  return JSON.parse(buffer.toString()) as T;
} 