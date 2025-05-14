import { useState, useCallback } from 'react';
import { useProcessing } from '@/context/ProcessingContext';
import { StageResult } from '@/context/ProcessingContext';
import { saveEditorContent, getEditorContent } from '@/services/storage/localService';
import { publishToWordPress, WordPressCredentials, WordPressPostData } from '@/services/wordpress/wordpressService';

// 定義上稿準備結果類型
export interface PrepPublishResult extends StageResult {
  fileId?: string;
  contentSaved: boolean;
  editorOpened: boolean;
  editorContent?: string;
  success?: boolean;
}

// 定義上架新聞結果類型
export interface PublishNewsResult extends StageResult {
  fileId?: string;
  publishSuccess: boolean;
  postId?: number;
  postUrl?: string;
  error?: string;
}

// 定義發布處理結果類型 (用於兼容 IntegratedFileProcessor 中的 result 類型)
export interface PublishingResult {
  fileId?: string;
  htmlContent?: string; 
  metadata?: {
    title?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// 上稿階段 Hook
export function usePublishingStage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [editorOpened, setEditorOpened] = useState(false);
  const { updateStageProgress, completeStage, setStageError, moveToNextStage, saveStageResult } = useProcessing();

  // 上稿準備階段 - 保存內容到 localStorage 並打開編輯器
  const startPrepPublish = useCallback(async (htmlContent: string, fileId: string) => {
    try {
      setIsProcessing(true);
      updateStageProgress('prep-publish', 10, '開始上稿準備...');
      
      // 保存內容到 localStorage
      updateStageProgress('prep-publish', 40, '保存內容到本地存儲...');
      const saveResult = saveEditorContent(htmlContent, fileId);
      
      if (!saveResult) {
        throw new Error('保存內容到本地存儲失敗');
      }
      
      // 標記編輯器已打開
      updateStageProgress('prep-publish', 80, '準備打開編輯器...');
      setEditorOpened(true);
      
      // 完成上稿準備階段
      updateStageProgress('prep-publish', 100, '上稿準備完成');
      
      // 保存階段結果
      const result: PrepPublishResult = {
        fileId,
        contentSaved: true,
        editorOpened: true,
        success: true
      };
      
      saveStageResult('prep-publish', result);
      completeStage('prep-publish', '上稿準備完成，可進行內容編輯');
      
      // 移動到下一個階段
      moveToNextStage();
      
      return result;
    } catch (error) {
      console.error('上稿準備階段錯誤:', error);
      setStageError('prep-publish', `上稿準備失敗: ${error instanceof Error ? error.message : String(error)}`);
      
      const errorResult: PrepPublishResult = {
        fileId,
        contentSaved: false,
        editorOpened: false
      };
      
      saveStageResult('prep-publish', errorResult);
      
      return errorResult;
    } finally {
      setIsProcessing(false);
    }
  }, [updateStageProgress, completeStage, setStageError, moveToNextStage, saveStageResult]);

  // 上架新聞階段 - 將編輯器的內容發布到 WordPress
  const publishToWordpress = useCallback(async (fileId: string, credentials: WordPressCredentials, postData: WordPressPostData) => {
    try {
      setIsProcessing(true);
      updateStageProgress('publish-news', 10, '開始上架新聞...');
      
      // 從 localStorage 獲取最新編輯器內容
      updateStageProgress('publish-news', 30, '獲取編輯器內容...');
      const editorContent = getEditorContent(fileId);
      
      if (editorContent) {
        // 使用編輯器的最新內容
        postData.content = editorContent;
      }
      
      // 發布到 WordPress
      updateStageProgress('publish-news', 60, '發布到 WordPress...');
      const publishResult = await publishToWordPress(credentials, postData);
      
      if (!publishResult.success) {
        throw new Error(publishResult.error || '發布到 WordPress 失敗');
      }
      
      // 完成上架新聞階段
      updateStageProgress('publish-news', 100, '上架新聞完成');
      
      // 保存階段結果
      const result: PublishNewsResult = {
        fileId,
        publishSuccess: true,
        postId: publishResult.id,
        postUrl: publishResult.link
      };
      
      saveStageResult('publish-news', result);
      completeStage('publish-news', `上架新聞完成，文章ID: ${publishResult.id}`);
      
      return result;
    } catch (error) {
      console.error('上架新聞階段錯誤:', error);
      setStageError('publish-news', `上架新聞失敗: ${error instanceof Error ? error.message : String(error)}`);
      
      const errorResult: PublishNewsResult = {
        fileId,
        publishSuccess: false,
        error: error instanceof Error ? error.message : String(error)
      };
      
      saveStageResult('publish-news', errorResult);
      
      return errorResult;
    } finally {
      setIsProcessing(false);
    }
  }, [updateStageProgress, completeStage, setStageError, saveStageResult]);

  return {
    isProcessing,
    editorOpened,
    startPrepPublish,
    publishToWordpress
  };
} 