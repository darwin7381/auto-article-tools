import { useRef } from 'react';
import { useProcessing } from '@/context/ProcessingContext';
import { ExtractResult } from './useExtractStage';

// 定義處理結果類型
export interface ProcessingResult {
  publicUrl?: string;
  markdownKey?: string;
  markdownUrl?: string;
  fileId?: string;
  success?: boolean;
  stage?: string;
  stageComplete?: boolean;
  processingComplete?: boolean;
}

interface UseAiProcessingStageProps {
  // 從提取階段獲取的數據
  extractResult: ExtractResult;
}

interface UseAiProcessingStageCallbacks {
  onProcessComplete?: (result: ProcessingResult) => void;
  onProcessError?: (error: string, extractResult: ExtractResult) => void;
}

/**
 * AI處理階段處理Hook
 * 負責處理AI內容增強階段邏輯
 */
export default function useAiProcessingStage(
  props: UseAiProcessingStageProps,
  callbacks: UseAiProcessingStageCallbacks
) {
  const {
    extractResult: initialExtractResult
  } = props;
  
  const {
    onProcessComplete,
    onProcessError
  } = callbacks;
  
  const { 
    updateStageProgress, 
    completeStage, 
    moveToNextStage,
    setStageError
  } = useProcessing();
  
  // 用於AI處理進度顯示的定時器
  const aiIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 處理AI內容增強
  const startAiProcessing = async (customExtractResult?: ExtractResult) => {
    // 使用傳入的extractResult或初始值
    const extractResult = customExtractResult || initialExtractResult;
    
    if (!extractResult.markdownKey) {
      if (onProcessError) onProcessError('缺少必要的Markdown數據', extractResult);
      return;
    }
    
    // 開始AI處理階段
    updateStageProgress('process', 10, '開始AI處理...');
    
    // 給API調用預估一個合理的時間 (例如15秒)
    const estimatedTime = 15000; // 15秒
    const startTime = Date.now();
    const interval = 200; // 每200ms更新一次
    
    // 使用更少次數的更新
    aiIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      // 基於經過時間計算進度，最高到90%
      const progress = 10 + Math.min(80 * (elapsed / estimatedTime), 80);
      updateStageProgress('process', progress, 'AI內容處理中...');
    }, interval);
    
    try {
      // 調用AI處理API
      const aiResponse = await fetch('/api/process-openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          markdownKey: extractResult.markdownKey,
          fileId: extractResult.fileId
        }),
      });
      
      // 清理AI進度interval
      if (aiIntervalRef.current) {
        clearInterval(aiIntervalRef.current);
        aiIntervalRef.current = null;
      }
      
      if (!aiResponse.ok) {
        const errorData = await aiResponse.json();
        throw new Error(errorData.error || 'AI處理失敗');
      }
      
      const processResult = await aiResponse.json();
      console.log('AI處理結果:', processResult);
      
      // 完成AI處理階段
      updateStageProgress('process', 100, 'AI處理完成');
      completeStage('process', 'AI處理完成');
      moveToNextStage();
      
      // 完成所有處理
      completeStage('complete', '全部處理完成');
      
      // 返回處理結果
      if (onProcessComplete) {
        onProcessComplete(processResult);
      }
    } catch (error) {
      // 清理AI進度interval
      if (aiIntervalRef.current) {
        clearInterval(aiIntervalRef.current);
        aiIntervalRef.current = null;
      }
      
      console.error('AI處理錯誤:', error);
      
      // 設置錯誤狀態但仍然返回提取結果
      const errorMessage = error instanceof Error ? error.message : 'AI處理失敗';
      setStageError('process', errorMessage);
      
      // 返回原始提取結果
      if (onProcessError) {
        onProcessError(errorMessage, extractResult);
      }
    }
  };

  // 清理資源
  const cleanup = () => {
    if (aiIntervalRef.current) {
      clearInterval(aiIntervalRef.current);
      aiIntervalRef.current = null;
    }
  };

  return { 
    startAiProcessing,
    cleanup
  };
} 