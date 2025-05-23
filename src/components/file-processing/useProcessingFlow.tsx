import { useCallback, useRef, useEffect } from 'react';
import { useProcessing } from '@/context/ProcessingContext';
import useUploadStage from './useUploadStage';
import useExtractStage, { ExtractResult } from './useExtractStage';
import useAiProcessingStage, { ProcessingResult } from './useAiProcessingStage';
import useAdvancedAiStage, { AdvancedAiResult } from './useAdvancedAiStage';
import useFormatConversionStage, { FormatConversionResult } from './useFormatConversionStage';
import useCopyEditingStage, { CopyEditingResult } from './useCopyEditingStage';

// 重新導出類型以保持兼容性
export type { ExtractResult } from './useExtractStage';
export type { ProcessingResult } from './useAiProcessingStage';
export type { AdvancedAiResult } from './useAdvancedAiStage';
export type { FormatConversionResult } from './useFormatConversionStage';
export type { CopyEditingResult } from './useCopyEditingStage';

// 定義最終處理結果類型
export interface FinalProcessingResult extends CopyEditingResult {
  processingComplete?: boolean;
  [key: string]: unknown; // 添加索引簽名
}

interface UseProcessingFlowProps {
  // 處理結果回調
  onProcessSuccess: (result: FinalProcessingResult) => void;
  onProcessError: (error: string, stage: string) => void;
  onStageComplete: (stage: string, result: Record<string, unknown>) => void;
  onFileUploadComplete?: (fileUrl: string, fileId: string) => void;
  
  // 狀態控制
  setIsProcessing: (isProcessing: boolean) => void;
  setUploadSuccess: (success: boolean) => void;
  setUploadError: (error: string | null) => void;
  setIsUploading: (uploading: boolean) => void;
}

// 為階段處理器定義類型
interface AdvancedAiStageHandler {
  startAdvancedAiProcessing: (result: ProcessingResult) => Promise<AdvancedAiResult>;
  cleanup: () => void;
}

interface FormatConversionStageHandler {
  startFormatConversion: (result: AdvancedAiResult) => Promise<FormatConversionResult>;
  cleanup: () => void;
}

interface CopyEditingStageHandler {
  startCopyEditing: (result: FormatConversionResult) => Promise<CopyEditingResult>;
  cleanup: () => void;
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

  // 使用引用存储回调函数，避免不必要的重新渲染
  const callbacksRef = useRef({
    onProcessSuccess,
    onProcessError,
    onStageComplete,
    onFileUploadComplete
  });
  
  // 更新引用中的回调值
  callbacksRef.current = {
    onProcessSuccess,
    onProcessError,
    onStageComplete,
    onFileUploadComplete
  };

  // 獲取ProcessingContext函數
  const { 
    startFileProcessing,
    startUrlProcessing
  } = useProcessing();

  // 建立階段引用
  const advancedAiStageRef = useRef<AdvancedAiStageHandler | null>(null);
  const formatConversionStageRef = useRef<FormatConversionStageHandler | null>(null);
  const copyEditingStageRef = useRef<CopyEditingStageHandler | null>(null);

  // 文稿編輯階段
  const copyEditingStage = useCopyEditingStage(
    { 
      formatConversionResult: {} as FormatConversionResult
    },
    {
      onComplete: (result) => {
        console.log('文稿編輯階段完成:', result);
        
        // 獲取標題和內容
        const title = result.wordpressParams?.title || '';
        const adaptedContent = result.adaptedContent || '';
        
        // 獲取特色圖片
        const featuredImage = result.wordpressParams?.featured_image;
        
        // 關鍵修改：將標題作為H1添加到內容前面，以便用戶可以在編輯器中編輯標題
        const titleHtml = title ? `<h1>${title}</h1>` : '';
        
        // 添加特色圖片HTML（如果有）
        let featureImageHtml = '';
        if (featuredImage && featuredImage.url) {
          featureImageHtml = `<figure class="featured-image"><img src="${featuredImage.url}" alt="${featuredImage.alt || '文章首圖'}" /></figure>`;
          console.log('特色圖片已添加到內容中:', featuredImage.url);
        }
        
        // 組合標題、特色圖片和內容
        const combinedContent = titleHtml + featureImageHtml + adaptedContent;
        
        // 將組合後的內容設置為htmlContent
        const resultWithHtmlContent = {
          ...result,
          htmlContent: combinedContent,
          // 確保wordpressParams正確保存和傳遞
          wordpressParams: result.wordpressParams || {}
        };
        
        // 調試輸出
        console.log('標題和特色圖片已添加到內容中，組合後的字符數:', combinedContent.length);
        console.log('處理後的WordPress參數:', resultWithHtmlContent.wordpressParams);
        
        callbacksRef.current.onStageComplete('copy-editing', resultWithHtmlContent as unknown as Record<string, unknown>);
        
        // 標記整個處理完成
        const finalResult: FinalProcessingResult = {
          ...resultWithHtmlContent,
          processingComplete: true
        };
        
        // 通知處理成功
        callbacksRef.current.onProcessSuccess(finalResult);
        
        // 完成處理
        return finalResult;
      },
      onError: (error) => {
        callbacksRef.current.onProcessError(error, 'copy-editing');
      }
    }
  );

  // 格式轉換階段
  const formatConversionStage = useFormatConversionStage(
    { 
      advancedAiResult: {} as AdvancedAiResult
    },
    {
      onComplete: (result) => {
        console.log('格式轉換階段完成:', result);
        callbacksRef.current.onStageComplete('format-conversion', result as Record<string, unknown>);
        
        // 進入文稿編輯階段
        if (copyEditingStageRef.current) {
          copyEditingStageRef.current.startCopyEditing(result);
        }
        
        return result;
      },
      onError: (error) => {
        callbacksRef.current.onProcessError(error, 'format-conversion');
      }
    }
  );

  // 高級AI處理階段
  const advancedAiStage = useAdvancedAiStage(
    { 
      processingResult: {} as ProcessingResult
    },
    {
      onComplete: (result) => {
        console.log('高級AI處理階段完成:', result);
        callbacksRef.current.onStageComplete('advanced-ai', result as Record<string, unknown>);
        
        // 進入格式轉換階段
        if (formatConversionStageRef.current) {
          formatConversionStageRef.current.startFormatConversion(result);
        }
        
        return result;
      },
      onError: (error) => {
        callbacksRef.current.onProcessError(error, 'advanced-ai');
      }
    }
  );

  // 保存階段引用
  useEffect(() => {
    advancedAiStageRef.current = advancedAiStage;
    formatConversionStageRef.current = formatConversionStage;
    copyEditingStageRef.current = copyEditingStage;
    
    return () => {
      advancedAiStage.cleanup();
      formatConversionStage.cleanup();
      copyEditingStage.cleanup();
    };
  }, [advancedAiStage, formatConversionStage, copyEditingStage]);

  // AI初步處理階段
  const aiProcessingStage = useAiProcessingStage(
    { 
      extractResult: {} as ExtractResult
    },
    {
      onProcessComplete: (result) => {
        console.log('AI初步處理階段完成:', result);
        callbacksRef.current.onStageComplete('process', result as Record<string, unknown>);
        
        // 進入高級AI處理階段
        if (advancedAiStageRef.current) {
          advancedAiStageRef.current.startAdvancedAiProcessing(result);
        }
        
        return result;
      },
      onProcessError: (error) => {
        callbacksRef.current.onProcessError(error, 'process');
      }
    }
  );

  // 提取階段
  const extractStage = useExtractStage(
    { 
      inputType: 'file'
    },
    {
      onExtractComplete: async (result) => {
        console.log('提取階段完成:', result);
        
        callbacksRef.current.onStageComplete('extract', result as Record<string, unknown>);
        
        // 直接開始AI處理階段
        if (result.markdownKey) {
          try {
            await aiProcessingStage.startAiProcessing(result);
          } catch (error) {
            console.error('AI處理階段錯誤:', error);
            const errorMessage = error instanceof Error ? error.message : 'AI處理階段失敗';
            callbacksRef.current.onProcessError(errorMessage, 'process');
          }
        }
      },
      onError: (error) => {
        callbacksRef.current.onProcessError(error, 'extract');
      }
    }
  );

  // 上傳階段
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
        if (callbacksRef.current.onFileUploadComplete) {
          callbacksRef.current.onFileUploadComplete(fileUrl, fileId);
        }
        
        callbacksRef.current.onStageComplete('upload', { fileUrl, fileType, fileId });
        
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
          callbacksRef.current.onProcessError(errorMessage, 'extract');
        }
      },
      onUrlProcessComplete: async (urlId) => {
        console.log('URL處理階段完成:', { urlId });
        
        callbacksRef.current.onStageComplete('upload', { urlId });
        
        // 直接開始提取階段
        try {
          await extractStage.startExtraction({
            inputType: 'url',
            urlId
          });
        } catch (error) {
          console.error('提取階段錯誤:', error);
          const errorMessage = error instanceof Error ? error.message : '提取階段處理失敗';
          callbacksRef.current.onProcessError(errorMessage, 'extract');
        }
      }
    }
  );

  // 清理所有資源
  const cleanup = useCallback(() => {
    console.log('清理處理資源');
    extractStage.cleanup();
    aiProcessingStage.cleanup();
    advancedAiStage.cleanup();
    formatConversionStage.cleanup();
    copyEditingStage.cleanup();
  }, [extractStage, aiProcessingStage, advancedAiStage, formatConversionStage, copyEditingStage]);

  // 處理文件上傳和處理流程 - 協調器
  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    
    try {
      // 初始化處理進度追蹤
      const fileId = `file-${Date.now()}`;
      startFileProcessing(fileId, file.name, file.type, file.size);
      
      // 延时处理，减轻UI卡顿
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // 執行文件上傳階段 - 後續階段通過回調串聯
      await uploadStage.startProcessing({
        inputType: 'file',
        selectedFile: file
      });
      
    } catch (error) {
      // 處理未被子hook捕獲的錯誤
      console.error('處理文件整體錯誤:', error);
      const errorMessage = error instanceof Error ? error.message : '文件處理失敗';
      callbacksRef.current.onProcessError(errorMessage, 'general');
      setIsProcessing(false);
    }
  }, [
    startFileProcessing, 
    uploadStage, 
    setIsProcessing,
  ]);
  
  // 處理URL和處理流程 - 協調器
  const processUrl = useCallback(async (url: string, type: string) => {
    setIsProcessing(true);
    
    try {
      // 初始化URL處理進度
      startUrlProcessing(url, type);
      
      // 延时处理，减轻UI卡顿
      await new Promise(resolve => setTimeout(resolve, 0));
      
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
      callbacksRef.current.onProcessError(errorMessage, 'general');
      setIsProcessing(false);
    }
  }, [
    startUrlProcessing, 
    uploadStage, 
    setIsProcessing,
  ]);

  return {
    processFile,
    processUrl,
    cleanup
  };
} 