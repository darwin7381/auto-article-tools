import { NextResponse } from 'next/server';
import { uploadFileToR2 } from '@/services/storage/r2Service';
import { apiAuth } from '@/middleware/api-auth';

export async function POST(request: Request) {
  // API 認證檢查
  const authResponse = await apiAuth(request);
  if (authResponse) return authResponse; // 未授權，直接返回錯誤響應

  try {
    console.log('收到文件上傳請求');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: '沒有上傳文件' }, { status: 400 });
    }
    
    console.log(`收到文件: ${file.name} Type: ${file.type} Size: ${file.size}`);
    
    // 安全處理文件名
    const fileNameParts = file.name.split('.');
    const fileExt = fileNameParts.pop()?.toLowerCase() || '';
    const sanitizedName = fileNameParts.join('-').replace(/[^a-zA-Z0-9-]/g, '-');
    
    // 生成唯一的文件名
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const fileId = `${sanitizedName}-${timestamp}-${randomStr}`;
    const fileName = `${fileId}.${fileExt}`;
    
    console.log(`生成的文件名: ${fileName}`);
    
    // 讀取文件內容
    console.log('正在讀取文件內容...');
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    console.log(`文件內容讀取完成, 大小: ${buffer.length}`);
    
    try {
      // 上傳到 R2
      const key = `input/${fileName}`;
      console.log(`準備上傳到R2, Key: ${key}`);
      
      // 使用服務層上傳文件
      await uploadFileToR2(buffer, key, file.type);
      console.log(`文件成功上傳到R2`);
      
      // 返回成功結果
      return NextResponse.json({
        success: true,
        fileId: fileId,  // 返回不帶擴展名的文件ID
        fileUrl: key,    // 文件在 R2 中的完整路徑
        fileName: file.name,  // 原始文件名
        fileSize: file.size,
        fileType: file.type,
        uploadTime: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('上傳到R2失敗:', error);
      return NextResponse.json(
        { error: '上傳到R2失敗', details: error instanceof Error ? error.message : '未知錯誤' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('處理上傳文件請求失敗:', error);
    return NextResponse.json(
      { error: '處理上傳請求失敗', details: error instanceof Error ? error.message : '未知錯誤' },
      { status: 500 }
    );
  }
} 