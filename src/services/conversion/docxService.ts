import mammoth from 'mammoth';
import { uploadImageToR2 } from '../storage/r2Service';
import { createDocxMarkdown, saveMarkdown } from '../document/markdownService';

/**
 * DOCX文件處理服務 - 提供DOCX文件的處理與轉換功能
 */

// 定義處理結果類型
export interface DocxProcessResult {
  success: boolean;
  fileId: string;
  markdownKey: string;
  markdownUrl: string;
  status: string;
  detectedLanguage?: string;
  [key: string]: unknown;
}

/**
 * 處理DOCX文件並轉換為Markdown
 * @param buffer DOCX文件內容
 * @param fileId 文件ID
 * @returns 處理結果，包含R2鍵值和公開訪問URL
 */
export async function processDOCX(buffer: Buffer, fileId: string): Promise<{ 
  r2Key: string; 
  localPath: string;
  publicUrl: string;
}> {
  try {
    // 提取文本和圖片
    const result = await convertDocxToHtml(buffer, fileId);
    
    // 將HTML轉換為Markdown格式，只傳遞HTML內容參數
    const markdown = createDocxMarkdown(result.value);
    
    // 保存Markdown到R2和本地
    return await saveMarkdown(markdown, fileId);
  } catch (error) {
    console.error('DOCX處理錯誤:', error);
    throw error;
  }
}

/**
 * 將DOCX轉換為HTML
 * @param buffer DOCX文件內容
 * @param fileId 文件ID（用於生成圖片檔名）
 * @returns 轉換結果，包含HTML內容和消息
 */
export async function convertDocxToHtml(buffer: Buffer, fileId: string): Promise<{value: string; messages: unknown[]}> {
  try {
    console.log(`[DOCX Debug] 開始轉換文件 ${fileId}, Buffer 大小: ${buffer.length}`);
    
    // 檢查文件頭部
    const header = buffer.slice(0, 10);
    console.log(`[DOCX Debug] 文件頭部 (hex): ${header.toString('hex')}`);
    
    // 使用mammoth將DOCX轉換為HTML
    const result = await mammoth.convertToHtml(
      { buffer },
      {
        convertImage: mammoth.images.imgElement(async (image) => {
          const imageBuffer = await image.read('base64');
          const contentType = image.contentType || 'image/png';
          const imageName = `${fileId}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${contentType.split('/')[1]}`;
          
          // 上傳圖片到R2
          const imageUrl = await uploadImageToR2(
            Buffer.from(imageBuffer, 'base64'),
            imageName,
            contentType
          );
          
          return {
            src: imageUrl
          };
        })
      }
    );
    
    console.log(`[DOCX Debug] 轉換成功, HTML 長度: ${result.value.length}, 消息數量: ${result.messages.length}`);
    
    // 檢查是否有可疑內容
    if (result.value.includes('Request En') || result.value.includes('```json')) {
      console.error(`[DOCX Debug] 發現可疑內容!`);
      console.error(`[DOCX Debug] HTML 前 500 字符:`, result.value.substring(0, 500));
    }
    
    // 以安全的方式返回結果
    return {
      value: result.value,
      messages: result.messages as unknown[]
    };
  } catch (error) {
    console.error(`[DOCX Debug] DOCX轉換失敗 for ${fileId}:`, error);
    
    // 檢查錯誤信息是否包含 "Request En"
    if (error instanceof Error && error.message.includes('Request En')) {
      console.error(`[DOCX Debug] !!! 發現 "Request En" 錯誤 !!!`);
      console.error(`[DOCX Debug] 完整錯誤:`, error.message);
    }
    
    throw error;
  }
}

/**
 * 透過API調用處理DOCX文件
 * @param fileId 文件ID
 * @param fileUrl 檔案在R2中的位置
 * @returns 處理結果
 */
export async function processDocxViaApi(fileId: string, fileUrl: string): Promise<DocxProcessResult> {
  try {
    // 設置處理API的URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const apiUrl = `${baseUrl}/api/process-file`;
    
    // 發送請求
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileUrl,
        fileId,
        fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`處理DOCX失敗: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API處理DOCX失敗:', error);
    throw error;
  }
} 