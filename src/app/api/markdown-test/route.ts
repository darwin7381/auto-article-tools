import { NextResponse } from 'next/server';
import axios from 'axios';
import { convertMarkdownToHtml } from '@/services/conversion/markdownToHtmlService';

// 從URL獲取Markdown內容
async function fetchMarkdownFromUrl(url: string): Promise<string> {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('獲取Markdown內容失敗:', error);
    throw new Error(`無法從URL獲取內容: ${error instanceof Error ? error.message : '未知錯誤'}`);
  }
}

export async function POST(req: Request) {
  try {
    const { markdownUrl } = await req.json();
    
    if (!markdownUrl) {
      return NextResponse.json(
        { success: false, error: '缺少必要的markdownUrl參數' },
        { status: 400 }
      );
    }
    
    console.log(`處理Markdown URL: ${markdownUrl}`);
    
    // 從URL獲取Markdown內容
    const markdownContent = await fetchMarkdownFromUrl(markdownUrl);
    
    // 使用Tiptap轉換Markdown為HTML
    const htmlContent = await convertMarkdownToHtml(markdownContent);
    
    console.log(`Markdown轉換完成，HTML長度: ${htmlContent.length}`);
    
    // 返回結果
    return NextResponse.json({
      success: true,
      markdownUrl,
      markdownContent,
      htmlContent
    });
  } catch (error) {
    console.error('轉換失敗:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '轉換失敗'
      },
      { status: 500 }
    );
  }
} 