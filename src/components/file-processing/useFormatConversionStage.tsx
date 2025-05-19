import { useRef, useCallback } from 'react';
import { useProcessing } from '@/context/ProcessingContext';
import { AdvancedAiResult } from './useAdvancedAiStage';

// 定義格式轉換結果類型
export interface FormatConversionResult {
  publicUrl?: string;
  markdownKey?: string;
  htmlContent?: string;
  htmlKey?: string;
  fileId?: string;
  format?: string;
  success?: boolean;
  stage?: string;
  stageComplete?: boolean;
}

interface UseFormatConversionStageProps {
  // 從高級AI處理階段獲取的數據
  advancedAiResult: AdvancedAiResult;
}

interface UseFormatConversionStageCallbacks {
  onComplete?: (result: FormatConversionResult) => void;
  onError?: (error: string, advancedAiResult: AdvancedAiResult) => void;
}

/**
 * 格式轉換階段Hook
 * 負責將Markdown轉換為HTML
 */
export default function useFormatConversionStage(
  props: UseFormatConversionStageProps,
  callbacks: UseFormatConversionStageCallbacks
) {
  const {
    advancedAiResult: initialAdvancedAiResult
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

  // 開始格式轉換處理
  const startFormatConversion = useCallback(async (customAdvancedAiResult?: AdvancedAiResult) => {
    // 使用傳入的advancedAiResult或初始值
    const advancedAiResult = customAdvancedAiResult || initialAdvancedAiResult;
    
    if (!advancedAiResult.markdownKey) {
      if (onError) onError('缺少必要的Markdown數據', advancedAiResult);
      return;
    }
    
    // 開始格式轉換階段
    updateStageProgress('format-conversion', 10, '開始Markdown轉HTML...');
    
    // 給API調用預估一個合理的時間 (例如5秒)
    const estimatedTime = 5000; // 5秒
    const startTime = Date.now();
    const interval = 200; // 每200ms更新一次
    
    // 模擬進度更新
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      // 基於經過時間計算進度，最高到90%
      const progress = 10 + Math.min(80 * (elapsed / estimatedTime), 80);
      updateStageProgress('format-conversion', progress, 'Markdown轉HTML中...');
    }, interval);
    
    try {
      // 調用格式轉換API
      const formatResponse = await fetch('/api/format-conversion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          markdownKey: advancedAiResult.markdownKey,
          fileId: advancedAiResult.fileId,
          format: 'html'
        }),
      });
      
      // 清理進度interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      if (!formatResponse.ok) {
        const errorData = await formatResponse.json();
        throw new Error(errorData.error || '格式轉換失敗');
      }
      
      const formatResult = await formatResponse.json();
      console.log('格式轉換結果:', formatResult);
      
      // 完成格式轉換階段
      updateStageProgress('format-conversion', 100, '格式轉換完成');
      completeStage('format-conversion', '格式轉換完成');
      
      // 返回處理結果
      if (onComplete) {
        onComplete(formatResult);
      }
      
      return formatResult;
    } catch (error) {
      // 清理進度interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      console.error('格式轉換錯誤:', error);
      
      // 設置錯誤狀態
      const errorMessage = error instanceof Error ? error.message : '格式轉換失敗';
      setStageError('format-conversion', errorMessage);
      
      // 返回原始處理結果
      if (onError) {
        onError(errorMessage, advancedAiResult);
      }
      
      throw error;
    }
  }, [initialAdvancedAiResult, updateStageProgress, completeStage, setStageError, onComplete, onError]);

  // 清理資源
  const cleanup = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  return { 
    startFormatConversion,
    cleanup
  };
} 