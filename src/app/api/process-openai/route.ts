import { NextResponse } from 'next/server';
import { enhanceMarkdownWithOpenAI } from '@/services/utils/openaiService';

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

    // 使用OpenAI處理服務增強內容
    try {
      const result = await enhanceMarkdownWithOpenAI(fileId, markdownKey);
      return NextResponse.json(result);
    } catch (error) {
      if (error instanceof Error && error.message.includes('OpenAI客戶端未初始化')) {
        return NextResponse.json(
          { 
            error: 'OpenAI API密鑰無效或未設置，無法進行AI處理',
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