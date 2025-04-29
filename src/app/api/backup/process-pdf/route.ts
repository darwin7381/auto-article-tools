import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { processPdf } from '@/services/conversion/pdfService';

export async function POST(request: Request) {
  try {
    const { fileUrl, fileId } = await request.json();
    
    if (!fileUrl) {
      return NextResponse.json(
        { error: '未提供文件 URL' },
        { status: 400 }
      );
    }
    
    console.log(`處理 PDF 文件: ${fileUrl}`);
    
    try {
      // 使用提供的 fileId 或生成新的 ID
      const documentId = fileId || uuidv4();
      
      // 使用PDF處理服務
      const processResult = await processPdf(fileUrl, documentId);
      
      // 返回處理結果
      return NextResponse.json({
        success: true,
        fileId: documentId,
        markdownKey: processResult.markdownKey,
        markdownUrl: processResult.markdownUrl,
        status: 'processed'
      });
      
    } catch (error) {
      throw error;
    }
    
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