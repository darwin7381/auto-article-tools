import { useCallback } from 'react';
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
 * 作為統一對外接口，協調各處理階段
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

  // 獲取所有ProcessingContext函數
  const { 
    updateStageProgress, 
    completeStage, 
    moveToNextStage, 
    setStageError,
    startFileProcessing,
    startUrlProcessing
  } = useProcessing();

  // 清理資源的函數
  const cleanup = useCallback(() => {
    // 清理可能存在的interval
    const intervalIds: NodeJS.Timeout[] = [];
    intervalIds.forEach(id => clearInterval(id));
  }, []);

  // 統一的文件上傳&處理流程
  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    
    try {
      // 1. 文件上傳階段
      // 初始化處理進度追蹤
      const fileId = `file-${Date.now()}`;
      // 使用ProcessingContext初始化文件處理狀態
      startFileProcessing(fileId, file.name, file.type, file.size);
      
      try {
        // 更新上傳階段進度
        updateStageProgress('upload', 20, '準備上傳文件...');
        
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
        
        // 2. 提取階段
        try {
          updateStageProgress('extract', 10, '開始提取文件內容...');
          
          const extractResponse = await fetch('/api/extract-content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileUrl: data.fileUrl,
              fileType: file.type,
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
          
          onStageComplete('extract', extractResult);
          
          // 3. AI處理階段
          try {
            if (!extractResult.markdownKey) {
              throw new Error('缺少必要的Markdown數據');
            }
            
            // 開始AI處理階段
            updateStageProgress('process', 10, '開始AI處理...');
            
            // 給API調用預估一個合理的時間 (例如15秒)
            const estimatedTime = 15000; // 15秒
            const startTime = Date.now();
            const interval = 200; // 每200ms更新一次
            let progressInterval: NodeJS.Timeout | null = null;
            
            // 使用更少次數的更新
            progressInterval = setInterval(() => {
              const elapsed = Date.now() - startTime;
              // 基於經過時間計算進度，最高到90%
              const progress = 10 + Math.min(80 * (elapsed / estimatedTime), 80);
              updateStageProgress('process', progress, 'AI內容處理中...');
            }, interval);
            
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
            if (progressInterval) {
              clearInterval(progressInterval);
              progressInterval = null;
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
            
          } catch (error) {
            console.error('AI處理錯誤:', error);
            const errorMessage = error instanceof Error ? error.message : 'AI處理失敗';
            setStageError('process', errorMessage);
            onProcessError(errorMessage, 'process');
          }
          
        } catch (error) {
          console.error('內容提取錯誤:', error);
          const errorMessage = error instanceof Error ? error.message : '內容提取失敗';
          setStageError('extract', errorMessage);
          onProcessError(errorMessage, 'extract');
        }
      } catch (error) {
        console.error('上傳錯誤:', error);
        setUploadError(error instanceof Error ? error.message : '上傳失敗，請稍後重試');
        setUploadSuccess(false);
        setStageError('upload', error instanceof Error ? error.message : '上傳失敗，請稍後重試');
        onProcessError(error instanceof Error ? error.message : '上傳失敗', 'upload');
      } finally {
        setIsUploading(false);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [
    startFileProcessing, updateStageProgress, completeStage, moveToNextStage, 
    setStageError, setUploadSuccess, setUploadError, setIsUploading, 
    onFileUploadComplete, onStageComplete, onProcessSuccess, onProcessError, 
    setIsProcessing
  ]);
  
  // 統一的URL處理流程
  const processUrl = useCallback(async (url: string, type: string) => {
    setIsProcessing(true);
    
    try {
      // 1. URL解析階段 - 使用ProcessingContext初始化URL處理狀態
      startUrlProcessing(url, type);
      
      try {
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
        
        // 2. 提取階段 - URL內容提取
        try {
          // 給API調用預估一個合理的時間 (例如8秒)
          const estimatedTime = 8000; // 8秒
          const startTime = Date.now();
          const interval = 200; // 每200ms更新一次
          let progressInterval: NodeJS.Timeout | null = null;
          
          // 第二階段：內容提取 - 顯示進度動畫
          updateStageProgress('extract', 30, '正在提取網頁內容...');
          
          // 使用更少次數的更新
          progressInterval = setInterval(() => {
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
              urlId: data.urlId 
            }),
          });
          
          // 清理提取進度interval
          if (progressInterval) {
            clearInterval(progressInterval);
            progressInterval = null;
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
          
          onStageComplete('extract', extractResult);
          
          // 3. AI處理階段
          try {
            if (!extractResult.markdownKey) {
              throw new Error('缺少必要的Markdown數據');
            }
            
            // 開始AI處理階段
            updateStageProgress('process', 10, '開始AI處理...');
            
            // 給API調用預估一個合理的時間 (例如15秒)
            const aiEstimatedTime = 15000; // 15秒
            const aiStartTime = Date.now();
            let aiProgressInterval: NodeJS.Timeout | null = null;
            
            // 使用更少次數的更新
            aiProgressInterval = setInterval(() => {
              const elapsed = Date.now() - aiStartTime;
              // 基於經過時間計算進度，最高到90%
              const progress = 10 + Math.min(80 * (elapsed / aiEstimatedTime), 80);
              updateStageProgress('process', progress, 'AI內容處理中...');
            }, interval);
            
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
            if (aiProgressInterval) {
              clearInterval(aiProgressInterval);
              aiProgressInterval = null;
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
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'AI處理失敗';
            setStageError('process', errorMessage);
            onProcessError(errorMessage, 'process');
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '內容提取失敗';
          setStageError('extract', errorMessage);
          onProcessError(errorMessage, 'extract');
        }
      } catch (error) {
        console.error('連結處理錯誤:', error);
        setUploadError(error instanceof Error ? error.message : '連結處理失敗，請稍後再試');
        setUploadSuccess(false);
        setStageError('upload', error instanceof Error ? error.message : '處理失敗，請稍後再試');
        onProcessError(error instanceof Error ? error.message : '連結處理失敗', 'upload');
      } finally {
        setIsUploading(false);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [
    startUrlProcessing, updateStageProgress, completeStage, moveToNextStage, 
    setStageError, setUploadSuccess, setUploadError, setIsUploading, 
    onStageComplete, onProcessSuccess, onProcessError, setIsProcessing
  ]);

  return {
    processFile,
    processUrl,
    cleanup
  };
} 