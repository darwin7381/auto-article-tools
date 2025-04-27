import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// 檔案類型配置
const ALLOWED_FILE_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB 限制

// R2 存儲客戶端配置
const R2 = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '',
  },
});

// 生成唯一文件名
function generateUniqueFileName(originalName: string, fileType: string): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const fileExtension = ALLOWED_FILE_TYPES[fileType];
  
  // 從原始檔名中提取檔名（不含副檔名）並移除特殊字符
  const cleanOriginalName = originalName
    .replace(new RegExp(`\\.${fileExtension}$`, 'i'), '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 30); // 限制長度
  
  return `${cleanOriginalName}-${timestamp}-${randomStr}.${fileExtension}`;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: '未提供文件' },
        { status: 400 }
      );
    }

    // 檢查文件格式
    if (!Object.keys(ALLOWED_FILE_TYPES).includes(file.type)) {
      return NextResponse.json(
        { error: '不支持的文件格式，請上傳PDF或DOCX文件' },
        { status: 400 }
      );
    }

    // 檢查文件大小
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: '文件太大，請上傳小於10MB的文件' },
        { status: 400 }
      );
    }

    // 生成唯一文件名
    const fileName = generateUniqueFileName(file.name, file.type);
    
    // 文件緩衝區
    const buffer = await file.arrayBuffer();

    // 文件元數據
    const metadata = {
      'Content-Type': file.type,
      'original-filename': file.name,
      'upload-timestamp': Date.now().toString(),
    };

    // 上傳到R2的input文件夾
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'auto-article-tools';
    const key = `input/${fileName}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: Buffer.from(buffer),
      Metadata: metadata,
      ContentType: file.type,
    });

    await R2.send(command);

    // 生成預簽名URL用於後續處理
    const getCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const presignedUrl = await getSignedUrl(R2, getCommand, { expiresIn: 3600 });

    return NextResponse.json({
      success: true,
      fileId: fileName.replace(`.${ALLOWED_FILE_TYPES[file.type]}`, ''), // 返回不帶副檔名的唯一ID
      fileUrl: key,
      presignedUrl,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      uploadTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error('文件上傳失敗:', error);
    return NextResponse.json(
      { error: '文件上傳失敗，請稍後再試' },
      { status: 500 }
    );
  }
} 