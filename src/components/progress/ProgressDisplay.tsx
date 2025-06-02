'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import { Progress } from '@heroui/progress';
import { ArticleClassification } from '@/types/article-formatting';

export interface ProcessStage {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  message?: string;
  resultKey?: string;
  viewUrl?: string;
}

export interface ProcessState {
  id: string;
  type: 'file' | 'url';
  stages: ProcessStage[];
  currentStage: string;
  overall: {
    progress: number;
    status: 'idle' | 'processing' | 'completed' | 'error';
  };
  metadata?: {
    fileName?: string;
    fileType?: string;
    fileSize?: number;
    url?: string;
    urlType?: string;
    title?: string;
    language?: string;
    wordCount?: number;
    imageCount?: number;
  };
  stageResults?: Record<string, unknown>;
  article_classification?: ArticleClassification;
  formatting_applied?: boolean;
  template_version?: string;
  related_articles_found?: number;
  content_analysis_completed?: boolean;
}

export interface ProgressDisplayProps {
  state: ProcessState;
  stageGroups?: Record<string, { title: string, stages: string[] }>;
  displayGroups?: string[];
  onViewStage?: (stageId: string, result?: Record<string, unknown>) => void;
  stageSlots?: Record<string, ReactNode>;
}

export default function ProgressDisplay({ 
  state, 
  stageGroups, 
  displayGroups, 
  onViewStage,
  stageSlots 
}: ProgressDisplayProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  
  useEffect(() => {
    // 進度條動畫效果
    const targetProgress = state.overall.progress;
    const start = animatedProgress;
    const duration = 500; // 動畫持續時間(ms)
    const startTime = Date.now();
    
    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const value = start + (targetProgress - start) * progress;
      
      setAnimatedProgress(value);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.overall.progress]);
  
  // 獲取處理狀態的顏色和文本
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'idle':
        return { color: 'default', text: '等待開始' };
      case 'processing':
        return { color: 'primary', text: '處理中' };
      case 'completed':
        return { color: 'success', text: '已完成' };
      case 'error':
        return { color: 'danger', text: '錯誤' };
      case 'pending':
        return { color: 'secondary', text: '等待處理' };
      default:
        return { color: 'default', text: '未知狀態' };
    }
  };
  
  const statusInfo = getStatusInfo(state.overall.status);
  
  // 定義合法的Progress顏色類型
  type ProgressColorType = 'primary' | 'success' | 'danger' | 'warning' | 'default' | 'secondary';
  
  // 根據stageGroups渲染階段組
  const renderStageGroups = () => {
    if (!stageGroups) {
      // 如果沒有提供stageGroups，則使用傳統模式直接顯示所有階段
      return (
        <div className="space-y-4">
          {state.stages.map((stage) => (
            <React.Fragment key={stage.id}>
              {renderStage(stage)}
              {/* 在階段後插入自定義內容 */}
              {stageSlots && stageSlots[stage.id]}
            </React.Fragment>
          ))}
        </div>
      );
    }
    
    // 使用stageGroups按組渲染
    return (
      <div className="space-y-6">
        {Object.entries(stageGroups)
          // 如果提供了displayGroups，則過濾顯示的群組
          .filter(([groupId]) => !displayGroups || displayGroups.includes(groupId))
          .map(([groupId, group]) => (
            <div key={groupId} className="space-y-4">
              <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 border-b pb-2 border-gray-200 dark:border-gray-700">
                {group.title}
              </h4>
              
              <div className="relative">
                {/* 階段連接線 */}
                <div className="absolute left-2 top-0 h-full w-0.5 bg-gray-200 dark:bg-gray-700"></div>
                
                {/* 組內階段 */}
                <div className="space-y-4">
                  {group.stages.map(stageId => {
                    const stage = state.stages.find(s => s.id === stageId);
                    if (!stage) return null;
                    return (
                      <React.Fragment key={stage.id}>
                        {renderStage(stage)}
                        {/* 在階段後插入自定義內容 */}
                        {stageSlots && stageSlots[stage.id]}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
      </div>
    );
  };
  
  // 渲染單個階段
  const renderStage = (stage: ProcessStage) => {
    const stageStatus = getStatusInfo(stage.status);
    const isActive = stage.id === state.currentStage;
    const stageResult = state.stageResults?.[stage.id] as Record<string, unknown> | undefined;
    const canView = stage.status === 'completed' && 
                   onViewStage && 
                   (stage.viewUrl || stage.resultKey || stageResult) &&
                   !['upload', 'prep-publish'].includes(stage.id);
    
    return (
      <div className="relative flex items-start gap-3 pl-9" data-stage-id={stage.id}>
        {/* 圓形指示器 */}
        <div className={`absolute left-2 top-1 -translate-x-1/2 h-5 w-5 rounded-full border-2 ${
          isActive 
            ? 'border-primary-500 bg-primary-100 dark:bg-primary-900/40' 
            : stage.status === 'completed'
              ? 'border-success-500 bg-success-100 dark:bg-success-900/40'
              : stage.status === 'error'
                ? 'border-danger-500 bg-danger-100 dark:bg-danger-900/40'
                : 'border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800'
        } flex items-center justify-center`}>
          {stage.status === 'completed' && (
            <svg className="h-3 w-3 text-success-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
          {stage.status === 'error' && (
            <svg className="h-3 w-3 text-danger-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          )}
          {stage.status === 'processing' && (
            <svg className="animate-spin h-3 w-3 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
        </div>
        
        <div className={`flex-1 ${
          isActive ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'
        }`}>
          <div className="flex justify-between items-center">
            <h5 className={`text-sm font-medium ${
              isActive || stage.status === 'processing' ? 'text-primary-600 dark:text-primary-400' : ''
            }`}>
              {stage.name}
            </h5>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium text-${stageStatus.color === 'default' ? 'gray' : stageStatus.color}-600 dark:text-${stageStatus.color === 'default' ? 'gray' : stageStatus.color}-400`}>
                {stageStatus.text}
              </span>
              
              {canView && (
                <button
                  onClick={() => onViewStage && onViewStage(stage.id, stageResult)}
                  className="text-xs font-medium text-primary-600 dark:text-primary-400 flex items-center gap-1 hover:underline"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  查看
                </button>
              )}
            </div>
          </div>
          
          {stage.message && (
            <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
              {stage.message}
            </p>
          )}
          
          {isActive && stage.status === 'processing' && (
            <div className="mt-2">
              <Progress 
                value={stage.progress} 
                color="primary"
                size="sm"
                className="h-1.5 bg-gray-200 dark:bg-gray-700"
                showValueLabel={false}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full py-4 space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            處理進度
          </h3>
          <div className={`text-sm font-medium text-${statusInfo.color === 'default' ? 'gray' : statusInfo.color}-600 dark:text-${statusInfo.color === 'default' ? 'gray' : statusInfo.color}-400 flex items-center gap-2`}>
            {state.overall.status === 'processing' && (
              <svg className="animate-spin h-4 w-4 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {statusInfo.text}
          </div>
        </div>
        
        <Progress 
          value={animatedProgress} 
          color={statusInfo.color as ProgressColorType}
          className="h-2 bg-gray-200 dark:bg-gray-700"
          showValueLabel={false}
        />

        <div className="flex justify-between items-center">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {state.metadata && (
              <>
                {state.type === 'file' && state.metadata.fileName && (
                  <span>檔案：{state.metadata.fileName}</span>
                )}
                {state.type === 'url' && state.metadata.url && (
                  <span>連結：{state.metadata.url}</span>
                )}
              </>
            )}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {Math.round(animatedProgress)}% 完成
          </div>
        </div>
      </div>
      
      {/* 處理階段顯示 - 更新為支持階段群組 */}
      <div className="space-y-4 pt-2">
        <div className="relative">
          {renderStageGroups()}
        </div>
      </div>
      
      {/* 其他處理元數據（除了文件名/URL之外的信息） */}
      {state.metadata && (state.metadata.title || state.metadata.language || state.metadata.wordCount !== undefined || state.metadata.imageCount !== undefined) && (
        <div className="mt-6 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-sm">
          <h4 className="font-medium mb-2 text-gray-800 dark:text-gray-200">其他信息</h4>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
            {state.metadata.title && (
              <>
                <dt className="text-gray-500 dark:text-gray-400">標題:</dt>
                <dd className="text-gray-800 dark:text-gray-200">{state.metadata.title}</dd>
              </>
            )}
            {state.metadata.language && (
              <>
                <dt className="text-gray-500 dark:text-gray-400">語言:</dt>
                <dd className="text-gray-800 dark:text-gray-200">
                  {state.metadata.language === 'zh-TW' ? '繁體中文' : 
                   state.metadata.language === 'zh-CN' ? '簡體中文' :
                   state.metadata.language === 'en' ? '英文' :
                   state.metadata.language === 'ja' ? '日文' : 
                   state.metadata.language === 'ko' ? '韓文' : '未知'}
                </dd>
              </>
            )}
            {state.metadata.wordCount !== undefined && (
              <>
                <dt className="text-gray-500 dark:text-gray-400">字數:</dt>
                <dd className="text-gray-800 dark:text-gray-200">{state.metadata.wordCount.toLocaleString()}</dd>
              </>
            )}
            {state.metadata.imageCount !== undefined && (
              <>
                <dt className="text-gray-500 dark:text-gray-400">圖片數:</dt>
                <dd className="text-gray-800 dark:text-gray-200">{state.metadata.imageCount}</dd>
              </>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}
