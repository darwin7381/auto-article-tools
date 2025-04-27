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
  console.log('接收到文件上傳請求');
  
  try {
    // 檢查環境變數
    if (!process.env.CLOUDFLARE_R2_ENDPOINT || !process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || !process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY) {
      console.error('缺少必要的R2配置環境變數');
      return NextResponse.json(
        { error: '伺服器配置錯誤，請聯絡管理員' },
        { status: 500 }
      );
    }
    
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.error('上傳請求中沒有文件');
      return NextResponse.json(
        { error: '未提供文件' },
        { status: 400 }
      );
    }

    console.log('收到文件:', file.name, 'Type:', file.type, 'Size:', file.size);

    // 檢查文件格式
    if (!Object.keys(ALLOWED_FILE_TYPES).includes(file.type)) {
      console.error('不支持的文件類型:', file.type);
      return NextResponse.json(
        { error: '不支持的文件格式，請上傳PDF或DOCX文件' },
        { status: 400 }
      );
    }

    // 檢查文件大小
    if (file.size > MAX_FILE_SIZE) {
      console.error('文件太大:', file.size);
      return NextResponse.json(
        { error: '文件太大，請上傳小於10MB的文件' },
        { status: 400 }
      );
    }

    // 生成唯一文件名
    const fileName = generateUniqueFileName(file.name, file.type);
    console.log('生成的文件名:', fileName);
    
    // 文件緩衝區
    console.log('正在讀取文件內容...');
    const buffer = await file.arrayBuffer();
    console.log('文件內容讀取完成, 大小:', buffer.byteLength);

    // 文件元數據
    const metadata = {
      'Content-Type': file.type,
      'upload-timestamp': Date.now().toString(),
    };

    // 上傳到R2的input文件夾
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'auto-article-tools';
    const key = `input/${fileName}`;
    console.log('準備上傳到R2, Bucket:', bucketName, 'Key:', key);

    try {
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: Buffer.from(buffer),
        Metadata: metadata,
        ContentType: file.type,
      });

      await R2.send(command);
      console.log('文件成功上傳到R2');
      
      // 生成預簽名URL用於後續處理
      const getCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      const presignedUrl = await getSignedUrl(R2, getCommand, { expiresIn: 3600 });
      console.log('生成預簽URL成功');

      const fileId = fileName.replace(`.${ALLOWED_FILE_TYPES[file.type]}`, '');
      const response = {
        success: true,
        fileId: fileId,
        fileUrl: key,
        presignedUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        uploadTime: new Date().toISOString(),
      };
      
      console.log('上傳成功，返回結果:', response);
      return NextResponse.json(response);
    } catch (r2Error) {
      console.error('R2上傳錯誤:', r2Error);
      return NextResponse.json(
        { error: '文件存儲失敗，請稍後再試' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('文件上傳處理過程中發生錯誤:', error);
    return NextResponse.json(
      { error: '文件上傳失敗，請稍後再試' },
      { status: 500 }
    );
  }
} 