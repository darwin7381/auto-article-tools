import { NextResponse } from 'next/server';
import { enhanceMarkdown } from '@/agents/contentAgent';

export async function POST(request: Request) {
  try {
    const requestBody = await request.json();
    const { fileId, markdownKey } = requestBody;
    
    if (!fileId || !markdownKey) {
      return NextResponse.json(
        { error: '缺少必要參數' },
        { status: 400 }
      );
    }
    
    console.log('接收到內容處理請求:', { fileId, markdownKey });

    // 使用AI Agent處理內容
    try {
      const result = await enhanceMarkdown(fileId, markdownKey);
      return NextResponse.json(result);
    } catch (error) {
      if (error instanceof Error && error.message.includes('OpenAI客戶端未初始化')) {
        return NextResponse.json(
          { 
            error: 'AI服務未正確初始化，無法進行處理',
            skipAI: true,
            fileId,
            markdownKey,
            status: 'skipped-ai-processing'
          },
          { status: 200 }
        );
      }
      throw error;
    }
    
  } catch (error) {
    console.error('處理錯誤:', error);
    return NextResponse.json(
      { error: '內容處理失敗', details: error instanceof Error ? error.message : '未知錯誤' },
      { status: 500 }
    );
  }
} 