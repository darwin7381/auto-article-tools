'use client';

import React from 'react';
import { Button } from '@/components/ui/button/Button';

export interface StageView {
  id: string;
  result: Record<string, unknown>;
}

interface StageViewDialogProps {
  viewingStage: StageView | null;
  onClose: () => void;
  getStageViewerUrl: (stageId: string, result: Record<string, unknown>) => string | undefined;
}

export default function StageViewDialog({ viewingStage, onClose, getStageViewerUrl }: StageViewDialogProps) {
  if (!viewingStage) return null;
  
  const { id, result } = viewingStage;
  
  // 格式化階段結果
  const formatStageResult = (stageId: string, result: Record<string, unknown>) => {
    if (stageId === 'extract' || stageId === 'process' || stageId === 'advanced-ai') {
      // 顯示Markdown內容預覽
      if (result.markdownContent && typeof result.markdownContent === 'string') {
        return (
          <div className="max-h-96 overflow-y-auto bg-gray-50 dark:bg-gray-900 rounded p-4 text-sm font-mono whitespace-pre-wrap">
            {result.markdownContent.slice(0, 1000)}
            {result.markdownContent.length > 1000 && '...'}
          </div>
        );
      }
      
      // 顯示其他資訊
      return (
        <div className="bg-gray-50 dark:bg-gray-900 rounded p-4">
          <pre className="whitespace-pre-wrap text-sm overflow-x-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      );
    }
    
    if (stageId === 'format-conversion' || stageId === 'copy-editing') {
      // 顯示HTML內容預覽
      if (result.htmlContent && typeof result.htmlContent === 'string') {
        return (
          <div className="bg-gray-50 dark:bg-gray-900 rounded p-4">
            <div 
              className="max-h-96 overflow-y-auto" 
              dangerouslySetInnerHTML={{ __html: result.htmlContent.slice(0, 1000) + (result.htmlContent.length > 1000 ? '...' : '') }}
            />
          </div>
        );
      } else if (stageId === 'copy-editing' && result.adaptedContent && typeof result.adaptedContent === 'string') {
        // 如果是文稿編輯階段且有adaptedContent，則顯示adaptedContent
        return (
          <div className="bg-gray-50 dark:bg-gray-900 rounded p-4">
            <div 
              className="max-h-96 overflow-y-auto" 
              dangerouslySetInnerHTML={{ __html: result.adaptedContent.slice(0, 1000) + (result.adaptedContent.length > 1000 ? '...' : '') }}
            />
          </div>
        );
      }
    }
    
    // 默認顯示
    return (
      <div className="bg-gray-50 dark:bg-gray-900 rounded p-4">
        <pre className="whitespace-pre-wrap text-sm overflow-x-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      </div>
    );
  };
  
  // 獲取階段標題
  const getStageTitle = (stageId: string): string => {
    const stageMap: Record<string, string> = {
      'upload': '上傳文件',
      'extract': '提取內容',
      'process': 'AI 初步內容處理',
      'advanced-ai': 'PR writer處理',
      'format-conversion': '格式轉換',
      'complete': '處理完成'
    };
    
    return stageMap[stageId] || stageId;
  };
  
  // 簡單格式化結果，簡化顯示
  const formattedResult = formatStageResult(id, result);
  
  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-800 p-4">
          <h3 className="text-lg font-semibold">
            {getStageTitle(id)} 處理結果
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="關閉視窗"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto flex-1">
          {formattedResult}
        </div>
        
        <div className="border-t border-gray-200 dark:border-gray-800 p-4 flex justify-end">
          <Button
            onClick={onClose}
            variant="light"
          >
            關閉
          </Button>
          {getStageViewerUrl(id, result) && (
            <Button
              onClick={() => {
                const url = getStageViewerUrl(id, result);
                if (url) window.open(url, '_blank', 'noopener,noreferrer');
              }}
              className="ml-2"
              color="primary"
              startIcon={
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            >
              在新窗口中查看
            </Button>
          )}
        </div>
      </div>
    </div>
  );
} 