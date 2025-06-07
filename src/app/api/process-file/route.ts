import { NextResponse } from 'next/server';
import { getFileFromR2 } from '@/services/storage/r2Service';
import { processDOCX } from '@/services/conversion/docxService';
import { enhanceMarkdown } from '@/agents/contentAgent';
import { getApiUrl } from '@/services/utils/apiHelpers';
import { apiAuth } from '@/middleware/api-auth';

// 定義請求體的接口類型
interface ProcessFileRequest {
  fileId: string;
  fileUrl: string;
  fileType: string;
  [key: string]: unknown; // 允許其他可能的字段
}

// 自動為PDF文件重定向到process-pdf端點
async function forwardToPdfProcessor(requestBody: ProcessFileRequest): Promise<Response> {
  try {
    // 準備內部 API 調用的認證頭部
    const internalApiHeaders = {
      'Content-Type': 'application/json',
    } as Record<string, string>;
    
    // 如果有 API_SECRET_KEY，使用它進行內部認證
    if (process.env.API_SECRET_KEY) {
      internalApiHeaders['x-api-key'] = process.env.API_SECRET_KEY;
    }
    
    // 轉發請求到處理PDF的API
    const pdfResponse = await fetch(getApiUrl('/api/process-pdf'), {
      method: 'POST',
      headers: internalApiHeaders,
      body: JSON.stringify(requestBody),
    });
    
    // 直接返回轉發後的響應
    return pdfResponse;
  } catch (error) {
    console.error('轉發到PDF處理器失敗:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  // API 認證檢查
  const authResponse = await apiAuth(request);
  if (authResponse) return authResponse; // 未授權，直接返回錯誤響應

  try {
    const requestBody: ProcessFileRequest = await request.json();
    const { fileId, fileUrl, fileType } = requestBody;
    
    console.log('收到文件處理請求:', { fileId, fileType });
    
    // 檢查必要參數
    if (!fileId || !fileUrl || !fileType) {
      return NextResponse.json(
        { error: '缺少必要參數: fileId, fileUrl, fileType' },
        { status: 400 }
      );
    }
    
    // 如果是PDF文件，轉發到專門的PDF處理器
    if (fileType === 'application/pdf') {
      console.log('檢測到PDF文件，轉發到PDF處理器...');
      const pdfResponse = await forwardToPdfProcessor(requestBody);
      
      // 檢查響應狀態
      if (!pdfResponse.ok) {
        console.error('PDF處理器返回錯誤:', pdfResponse.status, pdfResponse.statusText);
        const errorText = await pdfResponse.text();
        return NextResponse.json(
          { 
            error: 'PDF處理失敗',
            details: errorText 
          },
          { status: pdfResponse.status }
        );
      }
      
      // 返回PDF處理器的響應
      const pdfResult = await pdfResponse.json();
      return NextResponse.json(pdfResult);
    }
    
    // 對於DOCX文件，直接在這裡處理
    if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      console.log('處理DOCX文件...');
      
      try {
        // 從R2獲取文件
        const fileBuffer = await getFileFromR2(fileUrl);
        console.log('成功從R2獲取文件, 大小:', fileBuffer.length);
        
        // 處理DOCX文件
        const processResult = await processDOCX(fileBuffer, fileId);
        console.log('DOCX處理完成, 結果:', processResult);
        
        // 使用AI增強內容
        console.log('開始AI內容增強...');
        const enhancedResult = await enhanceMarkdown(fileId, processResult.r2Key);
        console.log('AI增強完成, 結果:', enhancedResult);
        
        return NextResponse.json({
          success: true,
          fileId,
          markdownKey: enhancedResult.markdownKey,
          markdownUrl: enhancedResult.markdownUrl,
          originalKey: processResult.r2Key,
          originalUrl: processResult.localPath
        });
        
      } catch (docxError) {
        console.error('DOCX處理失敗:', docxError);
        return NextResponse.json(
          { 
            error: 'DOCX處理失敗',
            message: docxError instanceof Error ? docxError.message : String(docxError)
          },
          { status: 500 }
        );
      }
    }
    
    // 不支持的文件類型
    return NextResponse.json(
      { error: `不支持的文件類型: ${fileType}` },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('文件處理失敗:', error);
    return NextResponse.json(
      { 
        error: '文件處理失敗',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 