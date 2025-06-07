import { NextResponse } from 'next/server';
import { processDOCX } from '@/services/conversion/docxService';
import { getFileFromR2 } from '@/services/storage/r2Service';
import { apiAuth } from '@/middleware/api-auth';

export async function POST(request: Request) {
  // API 認證檢查
  const authResponse = await apiAuth(request);
  if (authResponse) return authResponse; // 未授權，直接返回錯誤響應

  try {
    const { fileUrl, fileId } = await request.json();
    
    if (!fileUrl || !fileId) {
      return NextResponse.json(
        { error: '缺少必要參數' },
        { status: 400 }
      );
    }
    
    console.log(`處理 DOCX 文件: ${fileUrl}`);
    
    try {
      // 從R2獲取文件
      let fileBuffer;
      try {
        fileBuffer = await getFileFromR2(fileUrl);
        console.log('成功從R2獲取文件, 大小:', fileBuffer.length);
      } catch (error) {
        console.error('從R2獲取文件失敗:', error);
        return NextResponse.json(
          { error: '無法從存儲中獲取文件' },
          { 
            status: 500,
            headers: {
              'Content-Type': 'application/json;charset=UTF-8',
              'Content-Encoding': 'identity'
            }
          }
        );
      }
      
      // 處理DOCX文件並轉換為Markdown
      const processResult = await processDOCX(fileBuffer, fileId);
      
      // 明確記錄返回的結果
      console.log('DOCX處理完成，返回結果:', {
        markdownKey: processResult.r2Key,
        publicUrl: processResult.publicUrl
      });
      
      // 返回處理結果，使用R2的公開URL而非本地路徑
      // 明確設置好Content-Type和Content-Encoding，避免壓縮和解碼問題
      return NextResponse.json({
        success: true,
        fileId,
        markdownKey: processResult.r2Key,
        publicUrl: processResult.publicUrl,   // 仅提供一个统一的URL字段
        status: 'content-extracted'
      }, {
        status: 200,
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'Content-Encoding': 'identity'
        }
      });
    } catch (error) {
      throw error;
    }
  } catch (error: unknown) {
    console.error('DOCX 處理錯誤:');
    console.error(error);
    
    const errorMessage = error instanceof Error ? error.message : '未知錯誤';
    
    return NextResponse.json(
      { error: '處理 DOCX 時發生錯誤', details: errorMessage },
      { status: 500 }
    );
  }
} 