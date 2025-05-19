import { useRef, useCallback } from 'react';
import { useProcessing } from '@/context/ProcessingContext';
import { FormatConversionResult } from './useFormatConversionStage';

// 定義文稿編輯結果類型
export interface CopyEditingResult {
  wordpressParams: {
    title: string;
    content: string;
    excerpt?: string;
    slug?: string;
    status?: string;
    date?: string;
    author?: number;
    password?: string;
    featured_media?: number;
    featured_image?: {
      url: string;
      alt: string;
    };
    categories?: Array<{ id: number }>;
    tags?: Array<{ id: number }>;
  };
  adaptedContent: string;
  fileId?: string;
  htmlKey?: string;
  markdownKey?: string;
  success?: boolean;
  stage?: string;
  stageComplete?: boolean;
}

interface UseCopyEditingStageProps {
  // 從格式轉換階段獲取的數據
  formatConversionResult: FormatConversionResult;
}

interface UseCopyEditingStageCallbacks {
  onComplete?: (result: CopyEditingResult) => void;
  onError?: (error: string, formatConversionResult: FormatConversionResult) => void;
}

/**
 * 文稿編輯階段Hook
 * 負責生成WordPress參數和內容適配
 */
export default function useCopyEditingStage(
  props: UseCopyEditingStageProps,
  callbacks: UseCopyEditingStageCallbacks
) {
  const {
    formatConversionResult: initialFormatConversionResult
  } = props;
  
  const {
    onComplete,
    onError
  } = callbacks;
  
  const { 
    updateStageProgress, 
    completeStage,
    setStageError
  } = useProcessing();
  
  // 用於進度顯示的定時器
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 開始文稿編輯處理
  const startCopyEditing = useCallback(async (customFormatConversionResult?: FormatConversionResult) => {
    // 使用傳入的formatConversionResult或初始值
    const formatConversionResult = customFormatConversionResult || initialFormatConversionResult;
    
    if (!formatConversionResult.htmlKey && !formatConversionResult.markdownKey) {
      if (onError) onError('缺少必要的HTML或Markdown數據', formatConversionResult);
      return;
    }
    
    // 開始文稿編輯階段
    updateStageProgress('copy-editing', 10, '開始文稿編輯處理...');
    
    // 給API調用預估一個合理的時間 (例如10秒)
    const estimatedTime = 10000; // 10秒
    const startTime = Date.now();
    const interval = 200; // 每200ms更新一次
    
    // 模擬進度更新
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      // 基於經過時間計算進度，最高到90%
      const progress = 10 + Math.min(80 * (elapsed / estimatedTime), 80);
      updateStageProgress('copy-editing', progress, '分析內容生成WordPress發布參數中...');
    }, interval);
    
    try {
      // 調用文稿編輯API
      const copyEditResponse = await fetch('/api/copy-editing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          htmlKey: formatConversionResult.htmlKey,
          markdownKey: formatConversionResult.markdownKey,
          fileId: formatConversionResult.fileId
        }),
      });
      
      // 清理進度interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      if (!copyEditResponse.ok) {
        const errorData = await copyEditResponse.json();
        throw new Error(errorData.error || '文稿編輯處理失敗');
      }
      
      const copyEditResult = await copyEditResponse.json();
      console.log('文稿編輯處理結果:', copyEditResult);
      
      // 完成文稿編輯階段
      updateStageProgress('copy-editing', 100, '文稿編輯處理完成');
      completeStage('copy-editing', '文稿編輯處理完成');
      
      // 返回處理結果
      if (onComplete) {
        onComplete(copyEditResult);
      }
      
      return copyEditResult;
    } catch (error) {
      // 清理進度interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      console.error('文稿編輯處理錯誤:', error);
      
      // 設置錯誤狀態
      const errorMessage = error instanceof Error ? error.message : '文稿編輯處理失敗';
      setStageError('copy-editing', errorMessage);
      
      // 返回原始處理結果
      if (onError) {
        onError(errorMessage, formatConversionResult);
      }
      
      throw error;
    }
  }, [initialFormatConversionResult, updateStageProgress, completeStage, setStageError, onComplete, onError]);

  // 清理資源
  const cleanup = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  return { 
    startCopyEditing,
    cleanup
  };
} 