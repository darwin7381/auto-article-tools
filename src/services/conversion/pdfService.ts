import { uploadFileToR2 } from '../storage/r2Service';
import { DocxProcessResult } from './docxService';

/**
 * PDF 處理服務 - 提供PDF文件的處理與轉換功能
 * 注意：不使用本地文件系統，直接使用R2和內存操作
 */

// ConvertAPI Token
const CONVERT_API_TOKEN = process.env.CONVERT_API_TOKEN;
if (!CONVERT_API_TOKEN) {
  throw new Error('CONVERT_API_TOKEN 環境變量未設置');
}

// R2公開URL
const FILES_PUBLIC_URL = process.env.R2_PUBLIC_URL;

/**
 * 將PDF轉換為DOCX（使用ConvertAPI直接轉換，無需本地文件系統）
 * @param pdfUrl PDF文件的R2鍵值
 * @returns 轉換後的DOCX文件的Buffer
 */
export async function convertPdfToDocx(pdfUrl: string): Promise<Buffer> {
  // 構建完整的PDF公開URL
  const fullPdfUrl = `${FILES_PUBLIC_URL}/${pdfUrl}`;
  console.log(`開始轉換PDF: ${fullPdfUrl}`);
  
  try {
    // 使用動態導入ConvertAPI
    const convertapiModule = await import('convertapi');
    const convertapi = new convertapiModule.default(CONVERT_API_TOKEN as string);
    
    // 直接使用完整URL進行轉換，獲取結果URL而非本地文件
    const result = await convertapi.convert('docx', {
      File: fullPdfUrl
    }, 'pdf');
    
    // 獲取轉換結果的URL
    const files = result.files;
    if (!files || files.length < 1) {
      throw new Error('轉換結果為空');
    }
    
    const fileUrl = files[0].url;
    console.log(`轉換後的文件URL: ${fileUrl}`);
    
    // 直接從URL下載文件內容
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`下載轉換後的文件失敗: ${response.status} ${response.statusText}`);
    }
    
    // 將回應轉換為Buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log(`DOCX文件大小: ${buffer.length}字節`);
    
    return buffer;
  } catch (error) {
    console.error('PDF轉換失敗:', error);
    throw new Error('PDF轉換失敗: ' + (error instanceof Error ? error.message : '未知錯誤'));
  }
}

/**
 * 處理PDF文件
 * @param fileUrl PDF文件在R2中的鍵值
 * @param fileId 文件ID
 * @returns 處理結果
 */
export async function processPdf(fileUrl: string, fileId: string): Promise<DocxProcessResult> {
  try {
    // 使用ConvertAPI將PDF轉換為DOCX
    const docxBuffer = await convertPdfToDocx(fileUrl);
    
    // 上傳DOCX到R2
    const docxKey = `upload/${fileId}.docx`;
    await uploadFileToR2(docxBuffer, docxKey, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    
    // 通過process-file API處理DOCX
    return await processDocxViaApi(fileId, docxKey);
  } catch (error) {
    console.error('PDF處理失敗:', error);
    throw error;
  }
}

/**
 * 通過API處理DOCX文件
 * @param fileId 文件ID
 * @param docxKey DOCX文件在R2中的鍵值
 * @returns 處理結果
 */
async function processDocxViaApi(fileId: string, docxKey: string): Promise<DocxProcessResult> {
  try {
    // 直接導入所需服務
    const { getFileFromR2 } = await import('@/services/storage/r2Service');
    const { processDOCX } = await import('@/services/conversion/docxService');
    const { enhanceMarkdown } = await import('@/agents/contentAgent');
    
    // 從 R2 獲取 DOCX 文件
    const fileBuffer = await getFileFromR2(docxKey);
    
    // 直接處理 DOCX 文件
    const processResult = await processDOCX(fileBuffer, fileId);
    
    try {
      // 嘗試使用 AI Agent 進行處理
      const agentResult = await enhanceMarkdown(fileId, processResult.r2Key);
      
      return {
        success: true,
        fileId,
        markdownKey: agentResult.markdownKey,
        markdownUrl: agentResult.markdownUrl,
        status: 'processed-by-ai-agent',
      };
    } catch (aiError) {
      console.error('AI Agent 處理失敗:', aiError);
      
      // 如果 AI 處理失敗，返回基本處理結果
      return {
        success: true,
        fileId,
        markdownKey: processResult.r2Key,
        markdownUrl: processResult.localPath,
        status: 'processed',
      };
    }
  } catch (error) {
    console.error('直接處理 DOCX 失敗:', error);
    
    // 如果直接處理失敗，返回錯誤
    throw new Error(`處理 DOCX 失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
  }
} 