import { NextRequest, NextResponse } from 'next/server';
import { ArticleFormattingProcessor } from '@/services/document/ArticleFormattingProcessor';
import { AdvancedArticleSettings, EnhancedCopyEditingResult } from '@/types/article-formatting';
import { uploadFileToR2 } from '@/services/storage/r2Service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, advancedSettings, analysisResult } = body;

    // 驗證必要參數
    if (!content) {
      return NextResponse.json({
        success: false,
        error: '缺少必要參數：content'
      }, { status: 400 });
    }

    if (!advancedSettings) {
      return NextResponse.json({
        success: false,
        error: '缺少必要參數：advancedSettings'
      }, { status: 400 });
    }

    console.log('開始進階格式化處理，參數:', {
      headerDisclaimer: advancedSettings.headerDisclaimer,
      footerDisclaimer: advancedSettings.footerDisclaimer,
      authorName: advancedSettings.authorName,
      contentLength: content.length
    });

    // 驗證進階設定參數
    const warnings = ArticleFormattingProcessor.validateSettings(advancedSettings);
    if (warnings.length > 0) {
      console.warn('設定參數警告:', warnings);
    }

    // 創建格式化處理器並執行格式化
    const processor = new ArticleFormattingProcessor();
    const result = await processor.formatArticle(
      content,
      advancedSettings as AdvancedArticleSettings,
      analysisResult as EnhancedCopyEditingResult | undefined
    );

    console.log('格式化處理完成:', {
      hasHeaderDisclaimer: result.metadata.hasHeaderDisclaimer,
      hasFooterDisclaimer: result.metadata.hasFooterDisclaimer,
      appliedRulesCount: result.metadata.appliedRules.length,
      processingTime: Date.now() - result.metadata.processingTime
    });

    // 如果有錯誤，記錄但不阻止返回結果
    if (result.metadata.error) {
      console.error('格式化處理過程中出現錯誤:', result.metadata.error);
    }

    // 生成適合的文件名稱
    const timestamp = Date.now();
    const formattedHtmlKey = `processed/file-${timestamp}-article-formatted-html.html`;
    
    // 將格式化後的內容上傳到R2，以便查看
    try {
      const htmlBuffer = Buffer.from(result.formattedContent, 'utf-8');
      await uploadFileToR2(htmlBuffer, formattedHtmlKey, 'text/html; charset=utf-8');
      console.log(`成功將進階格式化後的HTML上傳到R2: ${formattedHtmlKey}`);
    } catch (uploadError) {
      console.error(`進階格式化HTML上傳到R2失敗: ${uploadError instanceof Error ? uploadError.message : '未知錯誤'}`);
      // 上傳失敗不阻止返回結果，但會記錄錯誤
    }

    return NextResponse.json({
      success: true,
      data: {
        formattedContent: result.formattedContent,
        appliedSettings: result.appliedSettings,
        metadata: result.metadata,
        warnings: warnings,
        htmlKey: formattedHtmlKey, // 添加 htmlKey 以便查看
        htmlUrl: formattedHtmlKey  // 提供URL以供前端使用
      }
    });

  } catch (error) {
    console.error('Article formatting API 錯誤:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '文章格式化處理失敗',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Article Formatting API is running',
    availableEndpoints: {
      POST: {
        description: '執行參數驅動的文章格式化',
        requiredParams: ['content', 'advancedSettings'],
        optionalParams: ['analysisResult']
      }
    }
  });
} 