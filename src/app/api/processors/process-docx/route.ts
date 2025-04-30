import { NextResponse } from 'next/server';
import { processDOCX } from '@/services/conversion/docxService';
import { getFileFromR2 } from '@/services/storage/r2Service';

export async function POST(request: Request) {
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
          { status: 500 }
        );
      }
      
      // 處理DOCX文件並轉換為Markdown
      const processResult = await processDOCX(fileBuffer, fileId);
      
      // 返回處理結果，使用R2的公開URL而非本地路徑
      return NextResponse.json({
        success: true,
        fileId,
        markdownKey: processResult.r2Key,
        markdownUrl: processResult.publicUrl, // 使用R2公開URL
        status: 'content-extracted'
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