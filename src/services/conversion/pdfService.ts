import { createTempDirectory, deleteLocalFile } from '../storage/localService';
import { uploadFileToR2 } from '../storage/r2Service';
import { DocxProcessResult } from './docxService';
import fs from 'fs';

/**
 * PDF 處理服務 - 提供PDF文件的處理與轉換功能
 */

// ConvertAPI Token
const CONVERT_API_TOKEN = process.env.CONVERT_API_TOKEN;
if (!CONVERT_API_TOKEN) {
  throw new Error('CONVERT_API_TOKEN 環境變量未設置');
}

// R2公開URL
const FILES_PUBLIC_URL = process.env.R2_PUBLIC_URL;

/**
 * 將PDF轉換為DOCX
 * @param pdfUrl PDF文件的R2鍵值
 * @returns 轉換後的DOCX文件的Buffer
 */
export async function convertPdfToDocx(pdfUrl: string): Promise<Buffer> {
  // 構建完整的PDF公開URL
  const fullPdfUrl = `${FILES_PUBLIC_URL}/${pdfUrl}`;
  console.log(`開始轉換PDF: ${fullPdfUrl}`);
  
  try {
    // 創建臨時目錄用於保存轉換結果
    const tempDir = createTempDirectory();
    
    // 使用動態導入ConvertAPI
    const convertapiModule = await import('convertapi');
    const convertapi = new convertapiModule.default(CONVERT_API_TOKEN as string);
    
    // 直接使用完整URL進行轉換
    const result = await convertapi.convert('docx', {
      File: fullPdfUrl
    }, 'pdf');
    
    // 保存轉換結果到臨時目錄
    const savedFiles = await result.saveFiles(tempDir);
    console.log(`保存的文件: ${savedFiles}`);
    
    // 檢查轉換結果
    if (!savedFiles) {
      throw new Error('轉換結果為空');
    }
    
    // 讀取轉換後的文件
    let docxFilePath: string;
    
    if (Array.isArray(savedFiles)) {
      if (savedFiles.length <= 0) {
        throw new Error('沒有生成任何文件');
      }
      docxFilePath = savedFiles[0];
    } else {
      // 非陣列情況
      docxFilePath = savedFiles as unknown as string;
    }
    
    console.log(`讀取轉換後的文件: ${docxFilePath}`);
    
    const docxBuffer = fs.readFileSync(docxFilePath);
    console.log(`DOCX文件大小: ${docxBuffer.length}字節`);
    
    // 刪除臨時文件
    try {
      deleteLocalFile(docxFilePath);
    } catch (err) {
      console.warn('刪除臨時文件失敗:', err);
    }
    
    return docxBuffer;
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