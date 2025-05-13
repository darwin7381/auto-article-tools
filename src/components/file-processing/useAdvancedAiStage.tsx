import { useRef, useCallback } from 'react';
import { useProcessing } from '@/context/ProcessingContext';
import { ProcessingResult } from './useAiProcessingStage';

// 定義高級AI處理結果類型
export interface AdvancedAiResult {
  publicUrl?: string;
  markdownKey?: string;
  enhancedContent?: string;
  fileId?: string;
  success?: boolean;
  stage?: string;
  stageComplete?: boolean;
}

interface UseAdvancedAiStageProps {
  // 從初步AI處理階段獲取的數據
  processingResult: ProcessingResult;
}

interface UseAdvancedAiStageCallbacks {
  onComplete?: (result: AdvancedAiResult) => void;
  onError?: (error: string, processingResult: ProcessingResult) => void;
}

/**
 * 高級AI處理階段Hook
 * 負責實現PR writer agent功能
 */
export default function useAdvancedAiStage(
  props: UseAdvancedAiStageProps,
  callbacks: UseAdvancedAiStageCallbacks
) {
  const {
    processingResult: initialProcessingResult
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

  // 開始高級AI處理
  const startAdvancedAiProcessing = useCallback(async (customProcessingResult?: ProcessingResult) => {
    // 使用傳入的processingResult或初始值
    const processingResult = customProcessingResult || initialProcessingResult;
    
    if (!processingResult.markdownKey) {
      if (onError) onError('缺少必要的Markdown數據', processingResult);
      return;
    }
    
    // 開始高級AI處理階段
    updateStageProgress('advanced-ai', 10, '開始PR writer處理...');
    
    // 給API調用預估一個合理的時間 (例如20秒)
    const estimatedTime = 20000; // 20秒
    const startTime = Date.now();
    const interval = 300; // 每300ms更新一次
    
    // 模擬進度更新
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      // 基於經過時間計算進度，最高到90%
      const progress = 10 + Math.min(80 * (elapsed / estimatedTime), 80);
      updateStageProgress('advanced-ai', progress, 'PR writer處理中...');
    }, interval);
    
    try {
      // 調用高級AI處理API
      const advancedAiResponse = await fetch('/api/advanced-ai-processing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          markdownKey: processingResult.markdownKey,
          fileId: processingResult.fileId,
          options: {
            agentType: 'pr-writer' // 指定使用PR writer agent
          }
        }),
      });
      
      // 清理進度interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      if (!advancedAiResponse.ok) {
        const errorData = await advancedAiResponse.json();
        throw new Error(errorData.error || 'PR writer處理失敗');
      }
      
      const advancedResult = await advancedAiResponse.json();
      console.log('PR writer處理結果:', advancedResult);
      
      // 完成高級AI處理階段
      updateStageProgress('advanced-ai', 100, 'PR writer處理完成');
      completeStage('advanced-ai', 'PR writer處理完成');
      
      // 返回處理結果
      if (onComplete) {
        onComplete(advancedResult);
      }
      
      return advancedResult;
    } catch (error) {
      // 清理進度interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      console.error('PR writer處理錯誤:', error);
      
      // 設置錯誤狀態
      const errorMessage = error instanceof Error ? error.message : 'PR writer處理失敗';
      setStageError('advanced-ai', errorMessage);
      
      // 返回原始處理結果
      if (onError) {
        onError(errorMessage, processingResult);
      }
      
      throw error;
    }
  }, [initialProcessingResult, updateStageProgress, completeStage, setStageError, onComplete, onError]);

  // 清理資源
  const cleanup = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  return { 
    startAdvancedAiProcessing,
    cleanup
  };
} 