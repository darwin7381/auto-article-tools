import { NextResponse } from 'next/server';
import { enhanceToPRRelease } from '@/agents/prWriterAgent';

export async function POST(req: Request) {
  try {
    const { markdownKey, fileId, options } = await req.json();
    
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
      // 使用PR Writer Agent處理
      const enhancedResult = await enhanceToPRRelease(fileId, markdownPath);
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
      console.error(`PR Writer處理內部錯誤:`, processingError);
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