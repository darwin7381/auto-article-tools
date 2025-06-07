import { NextResponse } from 'next/server';
import { saveMarkdown } from '@/services/document/markdownService';
import { apiAuth } from '@/middleware/api-auth';

export async function POST(request: Request) {
  // API 認證檢查
  const authResponse = await apiAuth(request);
  if (authResponse) return authResponse; // 未授權，直接返回錯誤響應

  try {
    const { content, fileId, suffix } = await request.json();
    
    if (!content || !fileId) {
      return NextResponse.json({ 
        error: '缺少必要參數', 
        message: '需要content和fileId' 
      }, { status: 400 });
    }
    
    try {
      const result = await saveMarkdown(content, fileId, suffix || '-processed');
      
      return NextResponse.json({
        success: true,
        markdownUrl: result.localPath,
        markdownKey: result.r2Key
      });
    } catch (saveError) {
      console.error("保存Markdown失敗:", saveError);
      return NextResponse.json({
        success: false,
        error: '保存Markdown失敗',
        message: saveError instanceof Error ? saveError.message : '未知錯誤'
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