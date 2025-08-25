import { NextResponse } from 'next/server';
import { uploadFileToR2 } from '@/services/storage/r2Service';
import { apiAuth } from '@/middleware/api-auth';

export async function POST(request: Request) {
  // API 認證檢查
  const authResponse = await apiAuth(request);
  if (authResponse) return authResponse; // 未授權，直接返回錯誤響應

  try {
    console.log('收到文件上傳請求');
    
    // 檢查請求頭中的 content-length
    const contentLength = request.headers.get('content-length');
    if (contentLength) {
      const sizeInMB = parseInt(contentLength) / (1024 * 1024);
      console.log(`請求體大小: ${sizeInMB.toFixed(2)} MB`);
      
      // Vercel 的實際限制約為 4.5MB，我們設置更保守的限制
      if (sizeInMB > 4) {
        return NextResponse.json({ 
          error: '文件過大', 
          message: `文件大小 ${sizeInMB.toFixed(2)} MB 超過 Vercel 的 4MB 限制。\n\n建議解決方案：\n1. 使用較小的文件\n2. 將內容複製到 Google Docs 後使用連結上傳\n3. 壓縮文件或移除不必要的圖片`,
          maxSize: '4MB',
          currentSize: `${sizeInMB.toFixed(2)}MB`,
          suggestions: [
            '使用較小的文件',
            '將內容複製到 Google Docs 後使用連結上傳',
            '壓縮文件或移除不必要的圖片'
          ]
        }, { status: 413 });
      }
    }
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: '沒有上傳文件' }, { status: 400 });
    }
    
    // 雙重檢查文件大小
    const fileSizeInMB = file.size / (1024 * 1024);
    console.log(`收到文件: ${file.name} Type: ${file.type} Size: ${fileSizeInMB.toFixed(2)} MB`);
    
    if (fileSizeInMB > 4) {
      return NextResponse.json({ 
        error: '文件過大', 
        message: `文件 "${file.name}" 大小 ${fileSizeInMB.toFixed(2)} MB 超過 Vercel 的 4MB 限制。\n\n建議解決方案：\n1. 使用較小的文件\n2. 將內容複製到 Google Docs 後使用連結上傳\n3. 壓縮文件或移除不必要的圖片`,
        maxSize: '4MB',
        currentSize: `${fileSizeInMB.toFixed(2)}MB`,
        fileName: file.name,
        suggestions: [
          '使用較小的文件',
          '將內容複製到 Google Docs 後使用連結上傳',
          '壓縮文件或移除不必要的圖片'
        ]
      }, { status: 413 });
    }
    
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