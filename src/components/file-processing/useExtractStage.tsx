import { useRef } from 'react';
import { useProcessing } from '@/context/ProcessingContext';

// 定義提取結果類型
export interface ExtractResult {
  markdownKey?: string;
  publicUrl?: string;
  fileId?: string;
  success?: boolean;
  status?: string;
  stage?: string;
  stageComplete?: boolean;
  metadata?: Record<string, unknown>;
}

interface UseExtractStageProps {
  // 文件提取相關
  fileUrl?: string;
  fileType?: string;
  fileId?: string;
  
  // URL提取相關
  urlId?: string;
  
  // 共用屬性
  inputType: 'file' | 'url';
}

interface UseExtractStageCallbacks {
  onExtractComplete?: (result: ExtractResult) => void;
  onError?: (error: string) => void;
}

/**
 * 內容提取階段處理Hook
 * 負責處理文件和URL的內容提取階段邏輯
 */
export default function useExtractStage(
  props: UseExtractStageProps,
  callbacks: UseExtractStageCallbacks
) {
  const {
    fileUrl,
    fileType,
    fileId,
    urlId,
    inputType
  } = props;
  
  const {
    onExtractComplete,
    onError
  } = callbacks;
  
  const { 
    updateStageProgress, 
    completeStage, 
    moveToNextStage,
    setStageError
  } = useProcessing();
  
  // 用於URL處理中的進度顯示定時器
  const extractIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 處理文件內容提取
  const processFileExtraction = async () => {
    if (!fileUrl || !fileType || !fileId) {
      if (onError) onError('缺少必要的文件信息');
      return;
    }
    
    try {
      // 1. 內容提取階段
      updateStageProgress('extract', 10, '開始提取文件內容...');
      
      const extractResponse = await fetch('/api/extract-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileUrl: fileUrl,
          fileType: fileType,
          fileId: fileId
        }),
      });
      
      if (!extractResponse.ok) {
        const errorData = await extractResponse.json();
        throw new Error(errorData.error || '提取內容失敗');
      }
      
      updateStageProgress('extract', 90, '文件內容提取完成...');
      
      const extractResult = await extractResponse.json();
      console.log('內容提取結果:', extractResult);
      
      // 完成提取階段
      completeStage('extract', '文件內容提取完成');
      moveToNextStage();
      
      // 傳遞提取結果給後續階段
      if (onExtractComplete) {
        onExtractComplete(extractResult);
      }
    } catch (error) {
      console.error('內容提取錯誤:', error);
      const errorMessage = error instanceof Error ? error.message : '內容提取失敗';
      if (onError) onError(errorMessage);
      setStageError('extract', errorMessage);
    }
  };

  // 處理URL內容提取
  const processUrlExtraction = async () => {
    if (!urlId) {
      if (onError) onError('缺少URL ID');
      return;
    }
    
    try {
      // 第二階段：內容提取 - 顯示進度動畫
      updateStageProgress('extract', 30, '正在提取網頁內容...');
      
      // 給API調用預估一個合理的時間 (例如8秒)
      const estimatedTime = 8000; // 8秒
      const startTime = Date.now();
      const interval = 200; // 每200ms更新一次
      
      // 初始進度
      updateStageProgress('extract', 30, '正在提取網頁內容...');
      
      // 使用更少次數的更新
      extractIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        // 基於經過時間計算進度，最高到90%
        const progress = 30 + Math.min(60 * (elapsed / estimatedTime), 60);
        updateStageProgress('extract', progress, '正在提取網頁內容...');
      }, interval);
      
      // 調用內容提取API
      const processResponse = await fetch('/api/process-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          urlId: urlId 
        }),
      });
      
      // 清理提取進度interval
      if (extractIntervalRef.current) {
        clearInterval(extractIntervalRef.current);
        extractIntervalRef.current = null;
      }
      
      if (!processResponse.ok) {
        const errorData = await processResponse.json();
        throw new Error(errorData.error || '內容提取失敗');
      }
      
      const extractResult = await processResponse.json();
      console.log('URL內容提取結果:', extractResult);
      
      // 完成提取階段
      updateStageProgress('extract', 100, '網頁內容提取完成');
      completeStage('extract', '網頁內容提取完成');
      moveToNextStage();
      
      // 傳遞提取結果給後續階段
      if (onExtractComplete) {
        onExtractComplete(extractResult);
      }
    } catch (error) {
      // 清理可能存在的進度interval
      if (extractIntervalRef.current) {
        clearInterval(extractIntervalRef.current);
        extractIntervalRef.current = null;
      }
      
      console.error('URL內容提取錯誤:', error);
      const errorMessage = error instanceof Error ? error.message : '內容提取失敗';
      if (onError) onError(errorMessage);
      setStageError('extract', errorMessage);
    }
  };

  // 啟動提取流程
  const startExtraction = async () => {
    if (inputType === 'file') {
      await processFileExtraction();
    } else if (inputType === 'url') {
      await processUrlExtraction();
    }
  };

  // 清理資源
  const cleanup = () => {
    if (extractIntervalRef.current) {
      clearInterval(extractIntervalRef.current);
      extractIntervalRef.current = null;
    }
  };

  return { 
    startExtraction,
    cleanup
  };
} 