'use client';

import React, { useState, useEffect } from 'react';
import useFileProcessor from './hooks/useFileProcessor';
import useProcessingMode from './hooks/useProcessingMode';
import { useProcessing } from '@/context/ProcessingContext';
import UploadSection from './sections/UploadSection';
import ProcessingSection from './sections/ProcessingSection';
import ResultSection from './sections/ResultSection';
import StageViewDialog, { StageView } from './dialogs/StageViewDialog';

// 定義PrepPublishingComponent組件
const PrepPublishingComponent = ({ 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fileId, 
  htmlContent, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  markdownUrl, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onContentChange, 
  onContinue 
}: { 
  fileId: string, 
  htmlContent?: string, 
  markdownUrl?: string, 
  onContentChange?: (content: string) => void,
  onContinue?: () => void
}) => {
  return (
    <div className="mt-2 pl-8 pr-0">
      {/* 使用EditorIntegration組件 */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
        <p>編輯內容組件</p>
        {htmlContent && (
          <div 
            className="mt-2 p-4 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        )}
        {onContinue && (
          <button 
            onClick={onContinue}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            繼續
          </button>
        )}
      </div>
    </div>
  );
};

// 定義WordPressPublishComponent組件
const WordPressPublishComponent = ({ 
  htmlContent, 
  wordpressParams,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  processingParams
}: { 
  htmlContent?: string, 
  wordpressParams?: {
    title?: string;
    content?: string;
    excerpt?: string;
    slug?: string;
    categories?: Array<{ id: number }>;
    tags?: Array<{ id: number }>;
  },
  processingParams?: {
    mode: 'auto' | 'manual'
  }
}) => {
  return (
    <div className="mt-2 pl-8 pr-0">
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
        <p>WordPress發布設置</p>
        {wordpressParams?.title && (
          <p className="mt-2">標題: {wordpressParams.title}</p>
        )}
        {htmlContent && (
          <div 
            className="mt-2 p-4 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 max-h-40 overflow-y-auto"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        )}
        <button 
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          發布到WordPress
        </button>
      </div>
    </div>
  );
};

export default function FileProcessor() {
  const [activeTab, setActiveTab] = useState<'upload' | 'initial-process' | 'advanced-process' | 'result'>('upload');
  const [viewingStage, setViewingStage] = useState<StageView | null>(null);

  // 使用處理模式Hook
  const { isAutoMode, handleModeChange } = useProcessingMode();
  
  // 從處理上下文獲取重要的值
  const { 
    processState, 
    saveStageResult,
    updateStageProgress, 
    updateProcessState,
    moveToNextStage,
    completeStage
  } = useProcessing();

  // 使用文件處理器Hook
  const fileProcessor = useFileProcessor({
    onActiveTabChange: setActiveTab
  });

  // 組件卸載時清理資源
  useEffect(() => {
    return () => {
      fileProcessor.cleanup();
    };
  }, [fileProcessor]);

  // 用於初始化上稿準備階段狀態的Effect
  useEffect(() => {
    if (processState && 
        activeTab === 'result' && 
        processState.stages.find(s => s.id === 'prep-publish')?.status === 'pending') {
      // 將上稿準備階段狀態設置為processing
      setTimeout(() => {
        // 先設置當前階段為上稿準備
        const prepPublishStage = processState.stages.find(s => s.id === 'prep-publish');
        if (prepPublishStage) {
          // 更新整體進度狀態為處理中
          updateProcessState({
            currentStage: 'prep-publish',
            overall: {
              ...processState.overall,
              status: 'processing'
            }
          });
          // 然後更新階段進度
          updateStageProgress('prep-publish', 60, '上稿準備中，請編輯內容...');
        }
      }, 0);
    }
  }, [processState, activeTab, updateStageProgress, updateProcessState]);

  // 上稿準備階段的自動確認邏輯
  useEffect(() => {
    // 僅在自動模式下執行
    if (isAutoMode && 
        processState?.currentStage === 'prep-publish' && 
        processState.stages.find(s => s.id === 'prep-publish')?.status === 'processing') {
      
      // 自動點擊確認按鈕，進入下一階段
      setTimeout(() => {
        console.log("自動模式：上稿準備階段自動確認");
        // 先完成上稿準備階段
        completeStage('prep-publish', '自動模式：上稿準備已完成');
        
        // 移動到下一階段
        moveToNextStage();
        
        // 更新狀態
        updateProcessState({
          currentStage: 'publish-news',
          stages: processState.stages.map(s => 
            s.id === 'prep-publish'
              ? { ...s, status: 'completed', progress: 100, message: '自動模式：上稿準備已完成' }
              : s.id === 'publish-news' 
                ? { ...s, status: 'processing', progress: 10, message: '準備WordPress發布設定...' }
              : s
          )
        });
      }, 1000); // 短暫延遲，讓用戶看到階段完成
    }
  }, [isAutoMode, processState?.currentStage, processState?.stages, moveToNextStage, updateProcessState, completeStage]);

  // 監聽 WordPress 發布完成事件
  useEffect(() => {
    // 只在客戶端執行
    if (typeof window === 'undefined') return;

    const handleWordPressPublishCompleted = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.success && processState) {
        console.log("WordPress 發布成功事件接收到:", detail);
        
        // 完成發布階段
        completeStage('publish-news', '文章已成功發布到 WordPress');
        
        // 更新整體處理狀態為已完成
        updateProcessState({
          overall: {
            progress: 100,
            status: 'completed'
          },
          stages: processState.stages.map(s => 
            s.id === 'publish-news' 
              ? { ...s, status: 'completed', progress: 100, message: '文章已成功發布到 WordPress' }
              : s
          )
        });
      }
    };

    window.addEventListener('wordpress-publish-completed', handleWordPressPublishCompleted);
    
    return () => {
      window.removeEventListener('wordpress-publish-completed', handleWordPressPublishCompleted);
    };
  }, [processState, completeStage, updateProcessState]);

  // 處理階段查看
  const handleViewStage = (stageId: string, stageResult?: Record<string, unknown>) => {
    if (!stageResult) return;
    
    // 獲取階段查看URL
    const viewerUrl = getStageViewerUrl(stageId, stageResult);
    if (viewerUrl) {
      // 直接在新窗口中打開，不再設置 viewingStage
      window.open(viewerUrl, '_blank', 'noopener,noreferrer');
    } else {
      // 如果沒有查看URL，則顯示對話框
      setViewingStage({
        id: stageId,
        result: stageResult
      });
    }
  };
  
  // 獲取階段查看URL
  const getStageViewerUrl = (stageId: string, result: Record<string, unknown>): string | undefined => {
    if (stageId === 'extract' && result.markdownKey) {
      const key = String(result.markdownKey).split('/').pop() || '';
      return `/viewer/processed/${key}?view=markdown`;
    }
    
    if (stageId === 'process' && result.markdownKey) {
      const key = String(result.markdownKey).split('/').pop() || '';
      return `/viewer/processed/${key}?view=markdown`;
    }
    
    if (stageId === 'advanced-ai' && result.markdownKey) {
      const key = String(result.markdownKey).split('/').pop() || '';
      return `/viewer/processed/${key}?view=markdown`;
    }
    
    if (stageId === 'format-conversion' || stageId === 'copy-editing') {
      // 如果有 HTML 文件鍵，直接使用 viewer 查看
      if (result.htmlKey) {
        const key = String(result.htmlKey).split('/').pop() || '';
        return `/viewer/processed/${key}?view=html`;
      }
      
      // 向後兼容舊版 API，通過 API 端點查看
      if (result.htmlUrl) {
        return `/api/processors/view-html?key=${encodeURIComponent(String(result.htmlUrl))}`;
      }
    }
    
    return undefined;
  };

  // 渲染上稿準備組件
  const renderPrepPublishingComponent = () => (
    <PrepPublishingComponent 
      fileId={fileProcessor.result?.fileId?.toString() || processState?.id || ''}
      htmlContent={fileProcessor.result?.htmlContent?.toString()}
      markdownUrl={fileProcessor.markdownUrl || undefined}
      onContentChange={(content) => {
        if (fileProcessor.result) {
          saveStageResult('prep-publish', {
            ...fileProcessor.result,
            htmlContent: content
          });
        }
      }}
      onContinue={() => {
        // 標記上稿準備階段為完成
        if (processState) {
          // 使用setTimeout避免渲染過程中的setState
          setTimeout(() => {
            // 完成上稿準備階段
            saveStageResult('prep-publish', { 
              ...fileProcessor.result, 
              status: 'completed' 
            });
            
            // 完成後更新當前階段為上架新聞
            updateProcessState({
              currentStage: 'publish-news',
              stages: processState.stages.map(s => 
                s.id === 'prep-publish' 
                  ? { ...s, status: 'completed', progress: 100, message: '上稿準備完成，編輯內容就緒' }
                  : s.id === 'publish-news'
                    ? { ...s, status: 'processing', progress: 10, message: '準備WordPress發布設定...' }
                    : s
              )
            });
            
            // 滾動到WordPress階段
            const publishNewsStage = document.querySelector('[data-stage-id="publish-news"]');
            if (publishNewsStage) {
              publishNewsStage.scrollIntoView({ behavior: 'smooth' });
            }
          }, 0);
        }
      }}
    />
  );

  // 渲染WordPress發布組件
  const renderWordPressPublishComponent = () => (
    <WordPressPublishComponent 
      htmlContent={fileProcessor.result?.htmlContent ? String(fileProcessor.result.htmlContent) : ''}
      wordpressParams={fileProcessor.result?.wordpressParams as {
        title?: string;
        content?: string;
        excerpt?: string;
        slug?: string;
        categories?: Array<{ id: number }>;
        tags?: Array<{ id: number }>;
      }}
      processingParams={{
        mode: isAutoMode ? 'auto' : 'manual'
      }}
    />
  );

  return (
    <div className="w-full rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm">
      {/* 標籤式導航 */}
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex-1 py-3 px-4 text-sm font-medium ${
            activeTab === 'upload'
              ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          1. 文件上傳
        </button>
        <button
          onClick={() => processState && setActiveTab('initial-process')}
          className={`flex-1 py-3 px-4 text-sm font-medium ${
            activeTab === 'initial-process'
              ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          } ${!processState ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={!processState}
        >
          2. 初步處理
        </button>
        <button
          onClick={() => processState && setActiveTab('advanced-process')}
          className={`flex-1 py-3 px-4 text-sm font-medium ${
            activeTab === 'advanced-process'
              ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          } ${!processState ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={!processState}
        >
          3. 後期處理
        </button>
        <button
          onClick={() => fileProcessor.result && setActiveTab('result')}
          className={`flex-1 py-3 px-4 text-sm font-medium ${
            activeTab === 'result'
              ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          } ${!fileProcessor.result ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={!fileProcessor.result}
        >
          4. 上稿
        </button>
      </div>

      <div className="p-6">
        {/* 上傳頁面 */}
        {activeTab === 'upload' && (
          <UploadSection 
            selectedFile={fileProcessor.selectedFile}
            onFileChange={fileProcessor.handleFileChange}
            selectedInputType={fileProcessor.selectedInputType}
            setSelectedInputType={fileProcessor.setSelectedInputType}
            linkUrl={fileProcessor.linkUrl}
            onLinkChange={fileProcessor.handleLinkChange}
            linkType={fileProcessor.linkType}
            setLinkType={fileProcessor.setLinkType}
            urlError={fileProcessor.urlError}
            uploadError={fileProcessor.uploadError}
            uploadSuccess={fileProcessor.uploadSuccess}
            processSuccess={fileProcessor.processSuccess}
            isProcessing={fileProcessor.isProcessing}
            onProcess={fileProcessor.handleProcess}
            isAutoMode={isAutoMode}
            onModeChange={handleModeChange}
          />
        )}

        {/* 初步處理進度 */}
        {activeTab === 'initial-process' && processState && (
          <ProcessingSection 
            processState={processState}
            onViewStage={handleViewStage}
            displayGroups={['initial']}
            onBack={() => setActiveTab('upload')}
            onNext={() => setActiveTab('advanced-process')}
            showNextButton={processState.stages.find(s => s.id === 'process')?.status === 'completed'}
            nextButtonText='前往後期處理'
            uploadSuccess={fileProcessor.uploadSuccess}
            processSuccess={fileProcessor.processSuccess}
            uploadError={fileProcessor.uploadError}
            selectedInputType={fileProcessor.selectedInputType}
          />
        )}

        {/* 後期處理進度 */}
        {activeTab === 'advanced-process' && processState && (
          <ProcessingSection 
            processState={processState}
            onViewStage={handleViewStage}
            displayGroups={['advanced']}
            onBack={() => setActiveTab('initial-process')}
            onNext={() => setActiveTab('result')}
            showNextButton={!!fileProcessor.result}
            nextButtonText='查看結果'
            uploadSuccess={fileProcessor.uploadSuccess}
            processSuccess={fileProcessor.processSuccess}
            uploadError={fileProcessor.uploadError}
            selectedInputType={fileProcessor.selectedInputType}
          />
        )}

        {/* 結果顯示（上稿階段）*/}
        {activeTab === 'result' && fileProcessor.result && (
          <ResultSection 
            processState={processState}
            result={fileProcessor.result}
            onViewStage={handleViewStage}
            onReset={fileProcessor.handleReset}
            onBack={() => setActiveTab('advanced-process')}
            renderPrepPublishingComponent={renderPrepPublishingComponent}
            renderWordPressPublishComponent={renderWordPressPublishComponent}
          />
        )}
      </div>
      
      {/* 階段結果查看對話框 */}
      <StageViewDialog 
        viewingStage={viewingStage}
        onClose={() => setViewingStage(null)}
        getStageViewerUrl={getStageViewerUrl}
      />
    </div>
  );
} 