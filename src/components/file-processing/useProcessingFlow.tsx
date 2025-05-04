import { useCallback } from 'react';
import { useProcessing } from '@/context/ProcessingContext';
import useUploadStage from './useUploadStage';
import useExtractStage, { ExtractResult } from './useExtractStage';
import useAiProcessingStage, { ProcessingResult } from './useAiProcessingStage';

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

  // 獲取ProcessingContext函數
  const { 
    startFileProcessing,
    startUrlProcessing
  } = useProcessing();

  // 1. 上傳階段Hook
  const uploadStage = useUploadStage(
    { 
      inputType: 'file'
    },
    {
      setUploadSuccess,
      setUploadError,
      setIsUploading,
      onFileUploadComplete: async (fileUrl, fileType, fileId) => {
        console.log('上傳階段完成:', { fileUrl, fileType, fileId });
        
        // 傳遞外部回調
        if (onFileUploadComplete) {
          onFileUploadComplete(fileUrl, fileId);
        }
        
        onStageComplete('upload', { fileUrl, fileType, fileId });
        
        // 直接開始提取階段
        try {
          await extractStage.startExtraction({
            inputType: 'file',
            fileUrl,
            fileType,
            fileId
          });
        } catch (error) {
          console.error('提取階段錯誤:', error);
          const errorMessage = error instanceof Error ? error.message : '提取階段處理失敗';
          onProcessError(errorMessage, 'extract');
        }
      },
      onUrlProcessComplete: async (urlId) => {
        console.log('URL處理階段完成:', { urlId });
        
        onStageComplete('upload', { urlId });
        
        // 直接開始提取階段
        try {
          await extractStage.startExtraction({
            inputType: 'url',
            urlId
          });
        } catch (error) {
          console.error('提取階段錯誤:', error);
          const errorMessage = error instanceof Error ? error.message : '提取階段處理失敗';
          onProcessError(errorMessage, 'extract');
        }
      }
    }
  );

  // 2. 內容提取階段Hook
  const extractStage = useExtractStage(
    { 
      inputType: 'file'
    },
    {
      onExtractComplete: async (result) => {
        console.log('提取階段完成:', result);
        
        onStageComplete('extract', result);
        
        // 直接開始AI處理階段
        if (result.markdownKey) {
          try {
            await aiProcessingStage.startAiProcessing(result);
          } catch (error) {
            console.error('AI處理階段錯誤:', error);
            const errorMessage = error instanceof Error ? error.message : 'AI處理階段失敗';
            onProcessError(errorMessage, 'process');
          }
        }
      },
      onError: (error) => {
        onProcessError(error, 'extract');
      }
    }
  );

  // 3. AI處理階段Hook
  const aiProcessingStage = useAiProcessingStage(
    { 
      extractResult: {} as ExtractResult
    },
    {
      onProcessComplete: (result) => {
        console.log('AI處理階段完成:', result);
        onProcessSuccess(result);
        onStageComplete('process', result);
      },
      onProcessError: (error) => {
        onProcessError(error, 'process');
      }
    }
  );

  // 清理所有資源
  const cleanup = useCallback(() => {
    console.log('清理處理資源');
    extractStage.cleanup();
    aiProcessingStage.cleanup();
  }, [extractStage, aiProcessingStage]);

  // 處理文件上傳和處理流程 - 協調器
  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    
    try {
      // 初始化處理進度追蹤
      const fileId = `file-${Date.now()}`;
      startFileProcessing(fileId, file.name, file.type, file.size);
      
      // 執行文件上傳階段 - 後續階段通過回調串聯
      await uploadStage.startProcessing({
        inputType: 'file',
        selectedFile: file
      });
      
    } catch (error) {
      // 處理未被子hook捕獲的錯誤
      console.error('處理文件整體錯誤:', error);
      const errorMessage = error instanceof Error ? error.message : '文件處理失敗';
      onProcessError(errorMessage, 'general');
    } finally {
      setIsProcessing(false);
    }
  }, [
    startFileProcessing, 
    uploadStage, 
    setIsProcessing,
    onProcessError
  ]);
  
  // 處理URL和處理流程 - 協調器
  const processUrl = useCallback(async (url: string, type: string) => {
    setIsProcessing(true);
    
    try {
      // 初始化URL處理進度
      startUrlProcessing(url, type);
      
      // 執行URL處理階段 - 後續階段通過回調串聯
      await uploadStage.startProcessing({
        inputType: 'url',
        linkUrl: url,
        linkType: type
      });
      
    } catch (error) {
      // 處理未被子hook捕獲的錯誤
      console.error('處理URL整體錯誤:', error);
      const errorMessage = error instanceof Error ? error.message : 'URL處理失敗';
      onProcessError(errorMessage, 'general');
    } finally {
      setIsProcessing(false);
    }
  }, [
    startUrlProcessing, 
    uploadStage, 
    setIsProcessing,
    onProcessError
  ]);

  return {
    processFile,
    processUrl,
    cleanup
  };
} 