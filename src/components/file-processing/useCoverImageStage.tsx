import { useCallback, useRef } from 'react';
import { useProcessing } from '@/context/ProcessingContext';
import { CopyEditingResult } from './useCopyEditingStage';
import { generateAndSetCoverImage, ImageGenerationResult } from '@/agents/imageGenerationAgent';

// 定義封面圖階段結果類型
export interface CoverImageStageResult {
  success: boolean;
  wordpressParams: {
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
  adaptedContent: string;
  coverImageGenerated: boolean;
  imageGenerationResult?: ImageGenerationResult;
  stage?: string;
  stageComplete?: boolean;
  warnings?: string[];
  error?: string;
  [key: string]: unknown; // 添加索引簽名以匹配 StageResult 類型
}

interface UseCoverImageStageProps {
  copyEditingResult: CopyEditingResult;
}

interface UseCoverImageStageCallbacks {
  onComplete: (result: CoverImageStageResult) => void;
  onError: (error: string) => void;
}

export default function useCoverImageStage(
  props: UseCoverImageStageProps,
  callbacks: UseCoverImageStageCallbacks
) {
  const { onComplete, onError } = callbacks;
  const { updateStageProgress, completeStage, setStageError, saveStageResult } = useProcessing();
  
  // 使用 ref 來避免重複處理
  const isProcessingRef = useRef(false);
  
  const startCoverImageProcessing = useCallback(async (copyEditingResult: CopyEditingResult): Promise<CoverImageStageResult | undefined> => {
    if (isProcessingRef.current) {
      console.log('封面圖處理已在進行中，跳過重複請求');
      return;
    }
    
    isProcessingRef.current = true;
    
    try {
      console.log('開始封面圖處理階段...');
      updateStageProgress('cover-image', 10, '檢查封面圖需求...');
      
      // 從copy-editing結果中提取WordPress參數和內容
      const { wordpressParams, adaptedContent } = copyEditingResult;
      
      if (!wordpressParams) {
        throw new Error('缺少WordPress參數，無法進行封面圖處理');
      }
      
      console.log('開始檢查是否需要生成封面圖...');
      updateStageProgress('cover-image', 30, '分析封面圖需求...');
      
      // 使用AI Agent處理封面圖
      const result = await generateAndSetCoverImage(wordpressParams, adaptedContent || '');
      
      updateStageProgress('cover-image', 80, '完成封面圖處理...');
      
      if (!result.success) {
        console.warn('封面圖生成失敗，但繼續處理流程:', result.error);
        
        // 即使生成失敗也要繼續流程，只記錄警告
        const warningResult: CoverImageStageResult = {
          success: true, // 階段成功完成，雖然圖片生成可能失敗
          wordpressParams: {
            ...result.updatedParams,
            featured_image: result.updatedParams.featured_image || undefined
          },
          adaptedContent: adaptedContent || '',
          coverImageGenerated: false,
          imageGenerationResult: result.result,
          stage: 'cover-image',
          stageComplete: true,
          warnings: [`封面圖生成失敗: ${result.error}`]
        };
        
        updateStageProgress('cover-image', 100, '封面圖處理完成（已跳過圖片生成）');
        completeStage('cover-image', '封面圖處理完成，但圖片生成失敗');
        
        // 保存階段結果
        saveStageResult('cover-image', warningResult);
        
        // 調用完成回調
        onComplete(warningResult);
        
        return warningResult;
      }
      
      // 成功處理封面圖
      const successResult: CoverImageStageResult = {
        success: true,
        wordpressParams: {
          ...result.updatedParams,
          featured_image: result.updatedParams.featured_image || undefined
        },
        adaptedContent: adaptedContent || '',
        coverImageGenerated: !!result.result?.success,
        imageGenerationResult: result.result,
        stage: 'cover-image',
        stageComplete: true
      };
      
      updateStageProgress('cover-image', 100, '封面圖處理完成');
      completeStage('cover-image', `封面圖處理完成${successResult.coverImageGenerated ? '，已生成新封面圖' : '，使用現有封面圖'}`);
      
      console.log('封面圖處理完成:', {
        generated: successResult.coverImageGenerated,
        hasImageUrl: !!successResult.wordpressParams.featured_image?.url,
        imageUrl: successResult.wordpressParams.featured_image?.url
      });
      
      // 保存階段結果
      saveStageResult('cover-image', successResult);
      
      // 調用完成回調
      onComplete(successResult);
      
      return successResult;
      
    } catch (error) {
      console.error('封面圖處理錯誤:', error);
      const errorMessage = error instanceof Error ? error.message : '封面圖處理失敗';
      
      setStageError('cover-image', errorMessage);
      onError(errorMessage);
      
      return undefined;
    } finally {
      isProcessingRef.current = false;
    }
  }, [updateStageProgress, completeStage, setStageError, saveStageResult, onComplete, onError]);
  
  const cleanup = useCallback(() => {
    isProcessingRef.current = false;
  }, []);
  
  return {
    startCoverImageProcessing,
    cleanup
  };
} 