import { NextResponse } from 'next/server';
import { enhanceToPRRelease } from '@/agents/prWriterAgent';
import { withRetry } from '@/agents/common/agentUtils';

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
    
    const { markdownKey, fileId, options } = requestData;
    
    if (!markdownKey) {
      return NextResponse.json(
        { success: false, error: '缺少必要的markdownKey參數' },
        { status: 400 }
      );
    }
    
    console.log(`開始高級AI處理: ${markdownKey}, 選項:`, options);
    
    // 修正：直接使用markdownKey作為完整路徑，無需添加額外路徑
    const markdownPath = markdownKey;
    console.log(`使用的markdownPath: ${markdownPath}`);
    
    try {
      // 使用PR Writer Agent處理，並添加重試機制
      const enhancedResult = await withRetry(
        () => enhanceToPRRelease(fileId, markdownPath),
        {
          maxRetries: 3,
          retryDelay: 3000,
          onRetry: (error, count) => {
            console.warn(`高級AI處理重試 #${count}：`, error.message);
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
      
      console.log(`PR Writer處理成功，結果: markdownKey=${enhancedResult.markdownKey}`);
      
      // 返回結果
      return NextResponse.json({
        success: enhancedResult.success,
        markdownKey: enhancedResult.markdownKey,
        markdownUrl: enhancedResult.markdownUrl,
        fileId,
        stage: 'advanced-ai',
        stageComplete: true
      });
    } catch (processingError) {
      console.error(`PR Writer處理內部錯誤(已重試)：`, processingError);
      throw processingError; // 向外層拋出錯誤以便統一處理
    }
  } catch (error) {
    console.error('高級AI處理錯誤:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '高級AI處理失敗',
        stage: 'advanced-ai',
        stageComplete: false
      },
      { status: 500 }
    );
  }
} 