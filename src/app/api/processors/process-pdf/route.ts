import { NextResponse } from 'next/server';
import { convertPdfToDocx } from '@/services/conversion/pdfService';
import { uploadFileToR2 } from '@/services/storage/r2Service';

export async function POST(request: Request) {
  try {
    const { fileUrl, fileId } = await request.json();
    
    if (!fileUrl || !fileId) {
      return NextResponse.json(
        { error: '缺少必要參數' },
        { status: 400 }
      );
    }
    
    console.log(`處理 PDF 文件: ${fileUrl}`);
    
    try {
      // 使用 ConvertAPI 將 PDF 轉換為 DOCX
      const docxBuffer = await convertPdfToDocx(fileUrl);
      
      // 上傳 DOCX 到 R2
      const docxKey = `upload/${fileId}.docx`;
      await uploadFileToR2(docxBuffer, docxKey, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      
      // 返回處理結果
      return NextResponse.json({
        success: true,
        fileId,
        docxKey,
        status: 'pdf-converted'
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