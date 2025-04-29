import { NextResponse } from 'next/server';
import { getFileFromR2 } from '@/services/storage/r2Service';
import { processDOCX } from '@/services/conversion/docxService';
import { enhanceMarkdown } from '@/agents/contentAgent';
import { getApiUrl } from '@/services/utils/apiHelpers';

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
    // 轉發請求到處理PDF的API
    const pdfResponse = await fetch(getApiUrl('/api/process-pdf'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    // 直接返回轉發後的響應
    return pdfResponse;
  } catch (error) {
    console.error('轉發到PDF處理API失敗:', error);
    return new Response(
      JSON.stringify({ error: 'PDF處理失敗，請稍後重試' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function POST(request: Request) {
  try {
    const requestBody = await request.json() as ProcessFileRequest;
    const { fileId, fileUrl, fileType } = requestBody;
    
    if (!fileId || !fileUrl) {
      return NextResponse.json(
        { error: '缺少必要參數' },
        { status: 400 }
      );
    }
    
    console.log('接收到處理請求:', { fileId, fileUrl, fileType });
    
    // 自動判斷是否為PDF並相應處理
    if (fileType === 'application/pdf') {
      // 為PDF文件直接轉發到PDF處理API
      console.log('檢測到PDF文件，轉發至PDF處理API');
      return forwardToPdfProcessor(requestBody);
    }
    
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
    
    // 處理DOCX文件
    if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // 先完成基本處理並保存為markdown
      const processResult = await processDOCX(fileBuffer, fileId);
      
      try {
        // 然後再調用AI Agent進行處理
        console.log('基礎處理完成，開始使用 AI Agent 進行進一步處理...');
        const agentResult = await enhanceMarkdown(fileId, processResult.r2Key);
        
        // 返回AI處理結果
        return NextResponse.json({
          success: true,
          fileId,
          markdownKey: agentResult.markdownKey,
          markdownUrl: agentResult.markdownUrl,
          status: 'processed-by-ai-agent',
        });
      } catch (error) {
        // 如果AI處理失敗，返回基本處理結果
        console.error('AI Agent處理失敗:', error);
        return NextResponse.json({
          success: true,
          fileId,
          markdownKey: processResult.r2Key,
          markdownUrl: processResult.localPath,
          status: 'processed',
        });
      }
    } else {
      // 非PDF或DOCX的情況
      return NextResponse.json(
        { error: '不支持的文件類型，僅支持PDF和DOCX文件' },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('文件處理錯誤:', error);
    return NextResponse.json(
      { error: '文件處理失敗' },
      { status: 500 }
    );
  }
} 