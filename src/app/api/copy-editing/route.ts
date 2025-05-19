import { NextResponse } from 'next/server';
import { getFileFromR2 } from '@/services/storage/r2Service';
import { extractWordPressParams, CopyEditResult } from '@/agents/copyEditorAgent';
import { withRetry } from '@/agents/common/agentUtils';

/**
 * 文稿編輯API - 實現WordPress自動參數生成與內容適配方案
 * 
 * 此API負責：
 * 1. 接收已經過格式轉換的內容
 * 2. 分析內容生成WordPress發布參數
 * 3. 根據品牌要求適配內容格式
 * 4. 返回準備好的內容與自動生成的WordPress參數
 */
export async function POST(req: Request) {
  try {
    // 解析請求數據
    let requestData;
    try {
      requestData = await req.json();
    } catch (parseError) {
      console.error('請求數據解析錯誤:', parseError);
      return NextResponse.json(
        { success: false, error: '無效的JSON請求格式' },
        { status: 400 }
      );
    }
    
    const { htmlKey, fileId, markdownKey } = requestData;
    
    if (!htmlKey && !markdownKey) {
      return NextResponse.json(
        { success: false, error: '缺少必要的htmlKey或markdownKey參數' },
        { status: 400 }
      );
    }
    
    console.log(`開始文稿編輯處理: htmlKey=${htmlKey || '未提供'}, markdownKey=${markdownKey || '未提供'}`);
    
    // 確定使用哪個鍵值來獲取內容
    const contentKey = htmlKey || markdownKey;
    
    // 從R2中讀取內容
    let content;
    try {
      const buffer = await getFileFromR2(contentKey);
      content = buffer.toString('utf-8');
      console.log(`成功從R2讀取文件: ${contentKey}`);
    } catch (error) {
      console.error(`從R2讀取失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
      throw new Error(`無法讀取內容文件: ${contentKey}`);
    }
    
    try {
      // 使用CopyEditorAgent處理內容，並添加重試機制
      const copyEditResult: CopyEditResult = await withRetry(
        () => extractWordPressParams(content, htmlKey ? 'html' : 'markdown'),
        {
          maxRetries: 3,
          retryDelay: 3000,
          onRetry: (error, count) => {
            console.warn(`文稿編輯處理重試 #${count}：`, error.message);
          },
          retryCondition: (error) => {
            // 根據錯誤類型決定是否重試
            const errorMessage = error instanceof Error ? error.message : String(error);
            const retryableErrors = [
              'timeout', 
              'exceeded maximum time', 
              'rate limit', 
              'server error',
              'network error',
              'Gateway Timeout',
              'timed out',
              'not valid JSON'
            ];
            
            return retryableErrors.some(errText => 
              errorMessage.toLowerCase().includes(errText.toLowerCase())
            );
          }
        }
      );
      
      console.log(`文稿編輯處理成功，生成了WordPress參數`);
      
      // 在返回結果前做一次日誌輸出
      console.log('copy-editing API即將返回的結果:', {
        wordpressParams: copyEditResult.wordpressParams,
        adaptedContentLength: copyEditResult.adaptedContent.length
      });
      
      // 返回結果
      return NextResponse.json({
        success: true,
        wordpressParams: copyEditResult.wordpressParams,
        adaptedContent: copyEditResult.adaptedContent,
        htmlContent: copyEditResult.adaptedContent, // 同時設置htmlContent以確保兼容性
        fileId,
        htmlKey,
        markdownKey,
        stage: 'copy-editing',
        stageComplete: true
      });
    } catch (processingError) {
      console.error(`文稿編輯處理內部錯誤(已重試)：`, processingError);
      throw processingError; // 向外層拋出錯誤以便統一處理
    }
  } catch (error) {
    console.error('文稿編輯處理錯誤:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '文稿編輯處理失敗',
        stage: 'copy-editing',
        stageComplete: false
      },
      { status: 500 }
    );
  }
} 