import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { fileUrl, fileId, fileType } = await request.json();
    
    if (!fileUrl || !fileId || !fileType) {
      return NextResponse.json(
        { error: '缺少必要參數：fileUrl, fileId, fileType' },
        { status: 400 }
      );
    }
    
    console.log('收到內容提取請求:', { fileId, fileType });
    
    try {
      // 根據文件類型選擇處理器
      if (fileType === 'application/pdf') {
        // 先由PDF處理器處理
        console.log('使用PDF處理器...');
        const pdfResponse = await fetch(new URL('/api/processors/process-pdf', process.env.NEXTAUTH_URL || 'http://localhost:3000'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fileUrl, fileId }),
        });
        
        if (!pdfResponse.ok) {
          const errorData = await pdfResponse.json();
          throw new Error(errorData.error || 'PDF處理失敗');
        }
        
        // 獲取PDF轉換結果（DOCX文件）
        const pdfResult = await pdfResponse.json();
        
        // 繼續處理轉換後的DOCX
        console.log('PDF轉換完成，繼續處理DOCX...');
        const docxResponse = await fetch(new URL('/api/processors/process-docx', process.env.NEXTAUTH_URL || 'http://localhost:3000'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            fileUrl: pdfResult.docxKey, 
            fileId
          }),
        });
        
        if (!docxResponse.ok) {
          const errorData = await docxResponse.json();
          throw new Error(errorData.error || 'DOCX處理失敗');
        }
        
        // 返回最終結果
        return docxResponse;
      } 
      else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // 直接使用DOCX處理器
        console.log('使用DOCX處理器...');
        const docxResponse = await fetch(new URL('/api/processors/process-docx', process.env.NEXTAUTH_URL || 'http://localhost:3000'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fileUrl, fileId }),
        });
        
        if (!docxResponse.ok) {
          const errorData = await docxResponse.json();
          throw new Error(errorData.error || 'DOCX處理失敗');
        }
        
        // 返回處理結果
        return docxResponse;
      } 
      else {
        // 不支持的文件類型
        return NextResponse.json(
          { error: '不支持的文件類型，僅支持PDF和DOCX文件' },
          { status: 400 }
        );
      }
    } catch (error) {
      throw error;
    }
  } catch (error: unknown) {
    console.error('內容提取錯誤:');
    console.error(error);
    
    const errorMessage = error instanceof Error ? error.message : '未知錯誤';
    
    return NextResponse.json(
      { error: '內容提取失敗', details: errorMessage },
      { status: 500 }
    );
  }
} 