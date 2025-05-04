import { NextResponse } from 'next/server';
import { processContent } from '@/agents/contentAgent';
import { getFileFromR2 } from '@/services/storage/r2Service';
import { saveMarkdown } from '@/services/document/markdownService';

export async function POST(request: Request) {
  try {
    // 支持直接接收markdown內容或markdown URL
    const reqBody = await request.json();
    const { markdown, markdownUrl, markdownKey } = reqBody;
    
    let markdownContent = '';
    let fileId = '';
    
    // 確定使用哪種方式獲取Markdown
    if (markdown) {
      // 直接使用提供的Markdown內容
      markdownContent = markdown;
      fileId = reqBody.fileId || `file-${Date.now()}`;
    } else if (markdownUrl) {
      // 從R2獲取Markdown內容
      try {
        console.log('從URL獲取Markdown內容:', markdownUrl);
        const markdownBuffer = await getFileFromR2(markdownUrl);
        markdownContent = markdownBuffer.toString('utf-8');
        fileId = markdownUrl.split('/').pop()?.split('.')[0] || `file-${Date.now()}`;
      } catch (fetchError) {
        return NextResponse.json({ error: '無法獲取Markdown內容', details: fetchError instanceof Error ? fetchError.message : '未知錯誤' }, { status: 400 });
      }
    } else if (markdownKey) {
      // 從R2使用key獲取Markdown內容
      try {
        console.log('從R2 Key獲取Markdown內容:', markdownKey);
        const markdownBuffer = await getFileFromR2(markdownKey);
        markdownContent = markdownBuffer.toString('utf-8');
        fileId = reqBody.fileId || markdownKey.split('/').pop()?.split('.')[0] || `file-${Date.now()}`;
      } catch (fetchError) {
        return NextResponse.json({ error: '無法從R2獲取Markdown內容', details: fetchError instanceof Error ? fetchError.message : '未知錯誤' }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: '缺少必要參數: markdown, markdownUrl 或 markdownKey' }, { status: 400 });
    }
    
    // 處理OpenAI處理
    try {
      console.log('開始使用OpenAI處理內容...');
      const enhancedContent = await processContent(markdownContent);
      
      // 保存處理後的結果
      const { r2Key, localPath, publicUrl } = await saveMarkdown(enhancedContent, fileId, '-ai-enhanced');
      
      return NextResponse.json({
        success: true,
        content: enhancedContent.substring(0, 200) + '...', // 僅返回部分內容預覽
        markdownKey: r2Key,
        markdownUrl: localPath,
        publicUrl: publicUrl,
        fileId,
        stage: 'process',      // 添加：當前完成的階段
        stageComplete: true,   // 添加：標記階段完成
        processingComplete: true // 添加：標記整體處理已完成
      });
    } catch (aiError) {
      console.error("OpenAI處理失敗:", aiError);
      return NextResponse.json({
        success: false,
        error: 'OpenAI處理失敗',
        message: aiError instanceof Error ? aiError.message : '未知錯誤',
        stage: 'process',      // 添加：當前階段
        stageComplete: false   // 添加：標記階段未完成
      }, { status: 500 });
    }
  } catch (error) {
    console.error("請求處理錯誤:", error);
    return NextResponse.json({ 
      success: false, 
      error: '請求處理錯誤',
      message: error instanceof Error ? error.message : '未知錯誤',
      stage: 'process',       // 添加：當前階段
      stageComplete: false    // 添加：標記階段未完成
    }, { status: 500 });
  }
} 