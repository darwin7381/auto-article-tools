import { useRef, useCallback } from 'react';
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

interface UseProcessingFlowProps {
  // 處理結果回調
  onProcessSuccess: (result: ProcessingResult) => void;
  onProcessError: (error: string, stage: string) => void;
  onStageComplete: (stage: string, result: ExtractResult | Record<string, unknown>) => void;
  onFileUploadComplete?: (fileUrl: string, fileId: string) => void;
  
  // 狀態控制
  setIsProcessing: (isProcessing: boolean) => void;
  setUploadSuccess: (success: boolean) => void;
  setUploadError: (error: string | null) => void;
  setIsUploading: (uploading: boolean) => void;
}

/**
 * 統一處理流程管理器Hook
 * 整合所有階段的處理邏輯，優化協調機制
 */
export default function useProcessingFlow(props: UseProcessingFlowProps) {
  const {
    onProcessSuccess,
    onProcessError,
    onStageComplete,
    onFileUploadComplete,
    setIsProcessing,
    setUploadSuccess,
    setUploadError,
    setIsUploading
  } = props;

  // 提取結果暫存
  const extractResultRef = useRef<ExtractResult | null>(null);
  
  // 階段定時器引用
  const extractIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const aiIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const { 
    startFileProcessing, 
    startUrlProcessing,
    updateStageProgress, 
    completeStage, 
    moveToNextStage,
    setStageError
  } = useProcessing();

  // 清理所有資源
  const cleanup = useCallback(() => {
    if (extractIntervalRef.current) {
      clearInterval(extractIntervalRef.current);
      extractIntervalRef.current = null;
    }
    if (aiIntervalRef.current) {
      clearInterval(aiIntervalRef.current);
      aiIntervalRef.current = null;
    }
  }, []);

  // 1. 文件上傳處理階段
  const processFileUpload = useCallback(async (file: File) => {
    if (!file) {
      setUploadError('請選擇要上傳的文件');
      return false;
    }

    setIsUploading(true);
    
    try {
      // 初始化處理進度追蹤
      const fileId = `file-${Date.now()}`;
      startFileProcessing(fileId, file.name, file.type, file.size);
      
      // 更新上傳階段進度
      updateStageProgress('upload', 20, '準備上傳文件...');
      
      // 使用FormData發送文件
      const formData = new FormData();
      formData.append('file', file);
      
      updateStageProgress('upload', 50, '正在上傳文件...');
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '上傳失敗');
      }
      
      const data = await response.json();
      setUploadSuccess(true);
      
      // 完成上傳階段，進入提取階段
      updateStageProgress('upload', 100, '文件上傳完成');
      completeStage('upload', '文件上傳成功');
      moveToNextStage();
      
      // 回調通知上傳完成
      if (onFileUploadComplete) {
        onFileUploadComplete(data.fileUrl, fileId);
      }
      
      onStageComplete('upload', { fileUrl: data.fileUrl, fileType: file.type, fileId });
      
      // 直接返回提取階段所需數據
      return { fileUrl: data.fileUrl, fileType: file.type, fileId };
    } catch (error) {
      console.error('上傳錯誤:', error);
      setUploadError(error instanceof Error ? error.message : '上傳失敗，請稍後重試');
      setUploadSuccess(false);
      setStageError('upload', error instanceof Error ? error.message : '上傳失敗，請稍後重試');
      onProcessError(error instanceof Error ? error.message : '上傳失敗', 'upload');
      return false;
    } finally {
      setIsUploading(false);
    }
  }, [startFileProcessing, updateStageProgress, completeStage, moveToNextStage, setStageError, 
      setUploadSuccess, setUploadError, setIsUploading, onFileUploadComplete, onStageComplete, onProcessError]);

  // URL處理階段
  const processUrlSubmit = useCallback(async (url: string, type: string) => {
    if (!url) {
      setUploadError('請輸入有效的連結');
      return false;
    }

    setIsUploading(true);
    
    try {
      // 初始化URL處理進度
      startUrlProcessing(url, type);
      
      // 第一階段：URL 解析/上傳
      updateStageProgress('upload', 30, '正在處理URL...');
      
      const response = await fetch('/api/parse-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, type }),
      });
      
      updateStageProgress('upload', 70, '正在解析URL內容...');
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '連結處理失敗');
      }
      
      console.log('連結處理成功:', data);
      setUploadSuccess(true);
      
      // 完成第一階段：URL 解析/上傳
      updateStageProgress('upload', 100, 'URL解析完成');
      completeStage('upload', 'URL解析完成');
      moveToNextStage();
      
      onStageComplete('upload', { urlId: data.urlId });
      
      // 直接返回提取階段所需數據
      return { urlId: data.urlId };
    } catch (error) {
      console.error('連結處理錯誤:', error);
      setUploadError(error instanceof Error ? error.message : '連結處理失敗，請稍後再試');
      setUploadSuccess(false);
      
      setStageError('upload', error instanceof Error ? error.message : '處理失敗，請稍後再試');
      onProcessError(error instanceof Error ? error.message : '連結處理失敗', 'upload');
      return false;
    } finally {
      setIsUploading(false);
    }
  }, [startUrlProcessing, updateStageProgress, completeStage, moveToNextStage, setStageError, 
      setUploadSuccess, setUploadError, setIsUploading, onStageComplete, onProcessError]);

  // 2. 文件內容提取階段
  const processFileExtraction = useCallback(async (fileData: { fileUrl: string, fileType: string, fileId: string }) => {
    const { fileUrl, fileType, fileId } = fileData;
    
    if (!fileUrl || !fileType || !fileId) {
      onProcessError('缺少必要的文件信息', 'extract');
      return false;
    }
    
    try {
      // 1. 內容提取階段
      updateStageProgress('extract', 10, '開始提取文件內容...');
      
      const extractResponse = await fetch('/api/extract-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileUrl,
          fileType,
          fileId
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
      
      // 存儲提取結果
      extractResultRef.current = extractResult;
      onStageComplete('extract', extractResult);
      
      return extractResult;
    } catch (error) {
      console.error('內容提取錯誤:', error);
      const errorMessage = error instanceof Error ? error.message : '內容提取失敗';
      onProcessError(errorMessage, 'extract');
      setStageError('extract', errorMessage);
      return false;
    }
  }, [updateStageProgress, completeStage, moveToNextStage, setStageError, onProcessError, onStageComplete]);

  // URL內容提取階段
  const processUrlExtraction = useCallback(async (urlData: { urlId: string }) => {
    const { urlId } = urlData;
    
    if (!urlId) {
      onProcessError('缺少URL ID', 'extract');
      return false;
    }
    
    try {
      // 第二階段：內容提取 - 顯示進度動畫
      updateStageProgress('extract', 30, '正在提取網頁內容...');
      
      // 保留進度動畫，但不再基於預設時間切換階段
      let extractProgress = 30;
      extractIntervalRef.current = setInterval(() => {
        extractProgress = Math.min(extractProgress + 10, 90);
        updateStageProgress('extract', extractProgress, '正在提取網頁內容...');
      }, 800);
      
      // 調用內容提取API
      const processResponse = await fetch('/api/process-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          urlId
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
      
      // 存儲提取結果
      extractResultRef.current = extractResult;
      onStageComplete('extract', extractResult);
      
      return extractResult;
    } catch (error) {
      // 清理可能存在的進度interval
      if (extractIntervalRef.current) {
        clearInterval(extractIntervalRef.current);
        extractIntervalRef.current = null;
      }
      
      console.error('URL內容提取錯誤:', error);
      const errorMessage = error instanceof Error ? error.message : '內容提取失敗';
      onProcessError(errorMessage, 'extract');
      setStageError('extract', errorMessage);
      return false;
    }
  }, [updateStageProgress, completeStage, moveToNextStage, setStageError, onProcessError, onStageComplete]);

  // 3. AI處理階段
  const processAiEnhancement = useCallback(async (extractResult: ExtractResult) => {
    if (!extractResult.markdownKey) {
      onProcessError('缺少必要的Markdown數據', 'process');
      return false;
    }
    
    // 開始AI處理階段
    updateStageProgress('process', 10, '開始AI處理...');
    
    // 顯示AI處理進度
    let aiProgress = 10;
    aiIntervalRef.current = setInterval(() => {
      aiProgress = Math.min(aiProgress + 5, 90);
      updateStageProgress('process', aiProgress, 'AI內容處理中...');
    }, 500);
    
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
      onProcessSuccess(processResult);
      onStageComplete('process', processResult);
      
      return processResult;
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
      onProcessError(errorMessage, 'process');
      return false;
    }
  }, [updateStageProgress, completeStage, moveToNextStage, setStageError, onProcessError, onProcessSuccess, onStageComplete]);
  
  // 統一的文件上傳&處理流程
  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    try {
      // 1. 上傳階段
      const uploadResult = await processFileUpload(file);
      if (!uploadResult) return;
      
      // 2. 提取階段
      const extractResult = await processFileExtraction(uploadResult);
      if (!extractResult) return;
      
      // 3. AI處理階段
      await processAiEnhancement(extractResult);
    } finally {
      setIsProcessing(false);
    }
  }, [processFileUpload, processFileExtraction, processAiEnhancement, setIsProcessing]);
  
  // 統一的URL處理流程
  const processUrl = useCallback(async (url: string, type: string) => {
    setIsProcessing(true);
    try {
      // 1. URL解析階段
      const urlResult = await processUrlSubmit(url, type);
      if (!urlResult) return;
      
      // 2. 提取階段
      const extractResult = await processUrlExtraction(urlResult);
      if (!extractResult) return;
      
      // 3. AI處理階段
      await processAiEnhancement(extractResult);
    } finally {
      setIsProcessing(false);
    }
  }, [processUrlSubmit, processUrlExtraction, processAiEnhancement, setIsProcessing]);

  return {
    processFile,
    processUrl,
    cleanup
  };
} 