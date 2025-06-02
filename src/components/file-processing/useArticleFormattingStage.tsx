import { useCallback, useRef } from 'react';
import { useProcessing } from '@/context/ProcessingContext';
import { CopyEditingResult } from './useCopyEditingStage';
import { AdvancedArticleSettings } from '@/types/article-formatting';

// 定義文章格式化結果類型
export interface ArticleFormattingStageResult {
  formattedContent: string;
  appliedSettings: AdvancedArticleSettings;
  metadata: {
    hasHeaderDisclaimer: boolean;
    hasFooterDisclaimer: boolean;
    authorName?: string;
    appliedRules: string[];
    processingTime: number;
    error?: string;
    templateVersion: string;
  };
  warnings?: string[];
  success?: boolean;
  stage?: string;
  stageComplete?: boolean;
  htmlKey?: string;
  htmlUrl?: string;
  originalWordPressParams?: {
    title?: string;
    content?: string;
    excerpt?: string;
    slug?: string;
    categories?: Array<{ id: number }>;
    tags?: Array<{ id: number }>;
    featured_image?: {
      url: string;
      alt?: string;
    };
  };
  [key: string]: unknown; // 添加索引簽名以匹配 StageResult 類型
}

interface UseArticleFormattingStageProps {
  copyEditingResult: CopyEditingResult;
}

interface UseArticleFormattingStageCallbacks {
  onComplete: (result: ArticleFormattingStageResult) => void;
  onError: (error: string) => void;
}

export default function useArticleFormattingStage(
  props: UseArticleFormattingStageProps,
  callbacks: UseArticleFormattingStageCallbacks
) {
  const { onComplete, onError } = callbacks;
  const { updateStageProgress, completeStage, setStageError, saveStageResult, getArticleClassification } = useProcessing();
  
  // 使用 ref 來避免重複處理
  const isProcessingRef = useRef(false);
  
  const startArticleFormatting = useCallback(async (copyEditingResult: CopyEditingResult): Promise<ArticleFormattingStageResult | undefined> => {
    if (isProcessingRef.current) {
      console.log('進階格式化已在進行中，跳過重複請求');
      return;
    }
    
    isProcessingRef.current = true;
    
    try {
      console.log('開始進階文章格式化處理...');
      updateStageProgress('article-formatting', 10, '準備進階格式化處理...');
      
      // 保存原始的 WordPress 參數
      const originalWordPressParams = copyEditingResult.wordpressParams;
      console.log('保存原始WordPress參數:', originalWordPressParams);
      
      // 在實際執行時檢查文稿分類信息
      const articleClassification = getArticleClassification();
      console.log('獲取到的文稿分類信息:', articleClassification);
      
      if (!articleClassification) {
        throw new Error('缺少文稿分類信息，請確保已正確設置文稿類型');
      }
      
      if (!articleClassification.advancedSettings) {
        console.error('文稿分類缺少進階設定:', articleClassification);
        throw new Error('文稿分類缺少進階設定，無法進行格式化處理');
      }
      
      console.log('進階設定驗證通過:', articleClassification.advancedSettings);
      
      // 準備請求數據
      const requestData = {
        content: copyEditingResult.adaptedContent || '',
        advancedSettings: articleClassification.advancedSettings,
        analysisResult: copyEditingResult.wordpressParams || {}
      };
      
      console.log('發送進階格式化請求，內容長度:', requestData.content.length);
      updateStageProgress('article-formatting', 30, '正在進行進階格式化...');
      
      // 調用進階格式化API
      const response = await fetch('/api/article-formatting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`進階格式化API錯誤: ${response.status} - ${errorText}`);
      }
      
      updateStageProgress('article-formatting', 70, '處理格式化結果...');
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '進階格式化處理失敗');
      }
      
      // 構建結果，包含原始的 WordPress 參數
      const formattingResult: ArticleFormattingStageResult = {
        formattedContent: result.data.formattedContent || requestData.content,
        appliedSettings: result.data.appliedSettings || articleClassification.advancedSettings,
        metadata: {
          hasHeaderDisclaimer: result.data.metadata.hasHeaderDisclaimer,
          hasFooterDisclaimer: result.data.metadata.hasFooterDisclaimer,
          authorName: result.data.metadata.authorName,
          appliedRules: result.data.metadata.appliedRules || [],
          processingTime: result.data.metadata.processingTime || 0,
          templateVersion: result.data.metadata.templateVersion || 'v1.0'
        },
        warnings: result.data.warnings,
        success: true,
        stage: 'article-formatting',
        stageComplete: true,
        htmlKey: result.data.htmlKey,
        htmlUrl: result.data.htmlUrl,
        // 添加原始的 WordPress 參數
        originalWordPressParams: originalWordPressParams
      };
      
      updateStageProgress('article-formatting', 100, '進階格式化完成');
      completeStage('article-formatting', '進階格式化處理完成');
      
      console.log('進階格式化完成:', {
        contentLength: formattingResult.formattedContent.length,
        appliedRules: formattingResult.metadata.appliedRules,
        hasOriginalParams: !!formattingResult.originalWordPressParams
      });
      
      // 保存階段結果
      saveStageResult('article-formatting', formattingResult);
      
      // 調用完成回調
      onComplete(formattingResult);
      
      return formattingResult;
      
    } catch (error) {
      console.error('進階格式化錯誤:', error);
      const errorMessage = error instanceof Error ? error.message : '進階格式化處理失敗';
      
      setStageError('article-formatting', errorMessage);
      onError(errorMessage);
      
      return undefined;
    } finally {
      isProcessingRef.current = false;
    }
  }, [updateStageProgress, completeStage, setStageError, saveStageResult, getArticleClassification, onComplete, onError]);
  
  const cleanup = useCallback(() => {
    isProcessingRef.current = false;
  }, []);
  
  return {
    startArticleFormatting,
    cleanup
  };
} 