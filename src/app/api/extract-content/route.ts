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
    
    try {
      // 根據文件類型選擇處理器
      if (fileType === 'application/pdf') {
        // 先由PDF處理器處理
        console.log('使用PDF處理器...');
        const pdfResponse = await fetch(getApiUrl('/api/processors/process-pdf'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fileUrl, fileId }),
        });
        
        if (!pdfResponse.ok) {
          const errorText = await pdfResponse.text();
          console.error('PDF處理器返回錯誤:', pdfResponse.status, pdfResponse.statusText, errorText);
          try {
            const errorData = JSON.parse(errorText);
            throw new Error(errorData.error || 'PDF處理失敗');
          } 
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          catch (error) {
            throw new Error(`PDF處理失敗 (${pdfResponse.status}): ${errorText.substring(0, 200)}`);
          }
        }
        
        // 獲取PDF轉換結果（DOCX文件）
        let pdfResult;
        try {
          const responseText = await pdfResponse.text();
          console.log('PDF處理器返回原始內容:', responseText.substring(0, 500) + '...');
          pdfResult = JSON.parse(responseText);
          console.log('PDF處理結果:', pdfResult);
        } 
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        catch (error) {
          console.error('解析PDF處理結果失敗');
          throw new Error('無法解析PDF處理結果');
        }
        
        // 繼續處理轉換後的DOCX
        console.log('PDF轉換完成，繼續處理DOCX...', { docxKey: pdfResult.docxKey });
        const docxResponse = await fetch(getApiUrl('/api/processors/process-docx'), {
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
          const errorText = await docxResponse.text();
          console.error('DOCX處理器返回錯誤:', docxResponse.status, docxResponse.statusText, errorText);
          try {
            const errorData = JSON.parse(errorText);
            throw new Error(errorData.error || 'DOCX處理失敗');
          } 
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          catch (error) {
            throw new Error(`DOCX處理失敗 (${docxResponse.status}): ${errorText.substring(0, 200)}`);
          }
        }
        
        // 解析docxResponse，創建新的響應
        let docxResult;
        try {
          const responseText = await docxResponse.text();
          console.log('DOCX處理器返回原始內容:', responseText.substring(0, 500) + '...');
          docxResult = JSON.parse(responseText);
          console.log('DOCX處理結果:', docxResult);
        } 
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        catch (error) {
          console.error('解析DOCX處理結果失敗');
          throw new Error('無法解析DOCX處理結果');
        }
        
        // 確保docxResult包含所有必要的字段
        if (!docxResult.markdownKey && !docxResult.publicUrl) {
          console.error('DOCX處理結果缺少必要字段:', docxResult);
          throw new Error('處理結果缺少必要字段');
        }
        
        // 返回一個統一的響應結構
        return NextResponse.json({
          success: true,
          fileId,
          markdownKey: docxResult.markdownKey,
          publicUrl: docxResult.publicUrl,
          status: 'content-extracted'
        }, {
          status: 200,
          headers: {
            'Content-Type': 'application/json;charset=UTF-8',
            'Content-Encoding': 'identity'
          }
        });
      } 
      else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // 直接使用DOCX處理器
        console.log('使用DOCX處理器...');
        const docxResponse = await fetch(getApiUrl('/api/processors/process-docx'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fileUrl, fileId }),
        });
        
        if (!docxResponse.ok) {
          const errorText = await docxResponse.text();
          console.error('DOCX處理器返回錯誤:', docxResponse.status, docxResponse.statusText, errorText);
          try {
            const errorData = JSON.parse(errorText);
            throw new Error(errorData.error || 'DOCX處理失敗');
          } 
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          catch (error) {
            throw new Error(`DOCX處理失敗 (${docxResponse.status}): ${errorText.substring(0, 200)}`);
          }
        }
        
        // 解析docxResponse，創建新的響應
        let docxResult;
        try {
          const responseText = await docxResponse.text();
          console.log('DOCX處理器返回原始內容:', responseText.substring(0, 500) + '...');
          docxResult = JSON.parse(responseText);
          console.log('DOCX處理結果:', docxResult);
        } 
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        catch (error) {
          console.error('解析DOCX處理結果失敗');
          throw new Error('無法解析DOCX處理結果');
        }
        
        // 確保docxResult包含所有必要的字段
        if (!docxResult.markdownKey && !docxResult.publicUrl) {
          console.error('DOCX處理結果缺少必要字段:', docxResult);
          throw new Error('處理結果缺少必要字段');
        }
        
        // 返回一個統一的響應結構
        return NextResponse.json({
          success: true,
          fileId,
          markdownKey: docxResult.markdownKey,
          publicUrl: docxResult.publicUrl,
          status: 'content-extracted'
        }, {
          status: 200,
          headers: {
            'Content-Type': 'application/json;charset=UTF-8',
            'Content-Encoding': 'identity'
          }
        });
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
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'Content-Encoding': 'identity'
        }
      }
    );
  }
} 