import { NextResponse } from 'next/server';
import { processContent } from '@/agents/contentAgent';

export async function POST(request: Request) {
  try {
    // 只接受原始Markdown內容，不處理任何文件讀取
    const { markdown } = await request.json();
    
    if (!markdown) {
      return NextResponse.json({ error: '缺少必要參數: markdown' }, { status: 400 });
    }
    
    // 僅負責OpenAI處理，不包含任何存儲邏輯
    try {
      const enhancedContent = await processContent(markdown);
      
      return NextResponse.json({
        success: true,
        content: enhancedContent
      });
    } catch (aiError) {
      console.error("OpenAI處理失敗:", aiError);
      return NextResponse.json({
        success: false,
        error: 'OpenAI處理失敗',
        message: aiError instanceof Error ? aiError.message : '未知錯誤'
      }, { status: 500 });
    }
  } catch (error) {
    console.error("請求處理錯誤:", error);
    return NextResponse.json({ 
      success: false, 
      error: '請求處理錯誤',
      message: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 });
  }
} 