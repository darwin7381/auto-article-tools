import { NextResponse } from 'next/server';
import { getApiUrl } from '@/services/utils/apiHelpers';
import { apiAuth } from '@/middleware/api-auth';

export async function POST(request: Request) {
  // API 認證檢查
  const authResponse = await apiAuth(request);
  if (authResponse) return authResponse; // 未授權，直接返回錯誤響應

  try {
    const { fileUrl, fileId, fileType } = await request.json();
    
    if (!fileUrl || !fileId || !fileType) {
      return NextResponse.json(
        { error: '缺少必要參數：fileUrl, fileId, fileType' },
        { status: 400 }
      );
    }
    
    console.log('收到內容提取請求:', { fileId, fileType });
    
    // 準備內部 API 調用的認證頭部
    const internalApiHeaders = {
      'Content-Type': 'application/json',
    } as Record<string, string>;
    
    // 如果有 API_SECRET_KEY，使用它進行內部認證
    if (process.env.API_SECRET_KEY) {
      internalApiHeaders['x-api-key'] = process.env.API_SECRET_KEY;
    }
    
    try {
      // 根據文件類型選擇處理器
      if (fileType === 'application/pdf') {
        // 先由PDF處理器處理
        console.log('使用PDF處理器...');
        const pdfResponse = await fetch(getApiUrl('/api/processors/process-pdf'), {
          method: 'POST',
          headers: internalApiHeaders,
          body: JSON.stringify({ fileUrl, fileId }),
        });
        
        if (!pdfResponse.ok) {
          console.error('PDF處理器調用失敗:', pdfResponse.status, pdfResponse.statusText);
          const errorText = await pdfResponse.text();
          console.error('PDF處理器錯誤響應:', errorText);
          throw new Error(`PDF處理失敗: ${pdfResponse.status} ${pdfResponse.statusText}`);
        }
        
        const pdfResult = await pdfResponse.json();
        console.log('PDF處理器響應:', pdfResult);
        
        if (!pdfResult.success) {
          throw new Error(pdfResult.error || 'PDF轉換失敗');
        }
        
        // 使用轉換後的DOCX URL
        const docxFileUrl = pdfResult.docxUrl;
        
        // 調用DOCX處理器
        console.log('使用DOCX處理器處理轉換後的文件...');
        const docxResponse = await fetch(getApiUrl('/api/processors/process-docx'), {
          method: 'POST',
          headers: internalApiHeaders,
          body: JSON.stringify({ fileUrl: docxFileUrl, fileId }),
        });
        
        if (!docxResponse.ok) {
          console.error('DOCX處理器調用失敗:', docxResponse.status, docxResponse.statusText);
          const errorText = await docxResponse.text();
          console.error('DOCX處理器錯誤響應:', errorText);
          throw new Error(`DOCX處理失敗: ${docxResponse.status} ${docxResponse.statusText}`);
        }
        
        const docxResult = await docxResponse.json();
        console.log('DOCX處理器響應:', docxResult);
        
        return NextResponse.json({
          success: true,
          fileId,
          markdownKey: docxResult.markdownKey,
          publicUrl: docxResult.publicUrl,
          fileType: 'pdf-converted-to-docx',
          status: 'content-extracted'
        });
        
      } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // 直接使用DOCX處理器
        console.log('使用DOCX處理器...');
        const docxResponse = await fetch(getApiUrl('/api/processors/process-docx'), {
          method: 'POST',
          headers: internalApiHeaders,
          body: JSON.stringify({ fileUrl, fileId }),
        });
        
        if (!docxResponse.ok) {
          console.error('DOCX處理器調用失敗:', docxResponse.status, docxResponse.statusText);
          const errorText = await docxResponse.text();
          console.error('DOCX處理器錯誤響應:', errorText);
          throw new Error(`DOCX處理失敗: ${docxResponse.status} ${docxResponse.statusText}`);
        }
        
        const docxResult = await docxResponse.json();
        console.log('DOCX處理器響應:', docxResult);
        
        return NextResponse.json({
          success: true,
          fileId,
          markdownKey: docxResult.markdownKey,
          publicUrl: docxResult.publicUrl,
          fileType: 'docx',
          status: 'content-extracted'
        });
        
      } else if (fileType === 'gdocs') {
        // 使用Google Docs處理器
        console.log('使用Google Docs處理器...');
        
        // 從fileId中提取documentId (fileId格式通常是 gdocs-timestamp-random)
        // 這裡需要從原始URL中提取documentId，由於fileUrl實際上是原始的Google Docs URL
        let documentId = '';
        try {
          const urlObj = new URL(fileUrl);
          if (fileUrl.includes('/document/d/')) {
            const pathParts = urlObj.pathname.split('/');
            for (let i = 0; i < pathParts.length; i++) {
              if (pathParts[i] === 'd' && i + 1 < pathParts.length) {
                documentId = pathParts[i + 1];
                break;
              }
            }
          }
        } catch (error) {
          console.error('解析Google Docs URL錯誤:', error);
        }
        
        if (!documentId) {
          throw new Error('無法從Google Docs URL中提取文檔ID');
        }
        
        const gdocsResponse = await fetch(getApiUrl('/api/processors/process-gdocs'), {
          method: 'POST',
          headers: internalApiHeaders,
          body: JSON.stringify({ 
            documentId,
            urlId: fileId,
            originalUrl: fileUrl
          }),
        });
        
        if (!gdocsResponse.ok) {
          console.error('Google Docs處理器調用失敗:', gdocsResponse.status, gdocsResponse.statusText);
          const errorText = await gdocsResponse.text();
          console.error('Google Docs處理器錯誤響應:', errorText);
          throw new Error(`Google Docs處理失敗: ${gdocsResponse.status} ${gdocsResponse.statusText}`);
        }
        
        const gdocsResult = await gdocsResponse.json();
        console.log('Google Docs處理器響應:', gdocsResult);
        
        return NextResponse.json({
          success: true,
          fileId,
          markdownKey: gdocsResult.markdownKey,
          publicUrl: gdocsResult.publicUrl,
          fileType: 'gdocs-converted-to-docx',
          status: 'content-extracted'
        });
        
      } else {
        throw new Error(`不支持的文件類型: ${fileType}`);
      }
      
    } catch (processingError) {
      console.error('文件處理錯誤:', processingError);
      throw processingError;
    }
    
  } catch (error) {
    console.error('內容提取失敗:', error);
    return NextResponse.json(
      { 
        error: '內容提取失敗',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 