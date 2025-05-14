'use client';

import { useState, useEffect } from 'react';
import { Progress } from './Progress';

export interface ProcessStage {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  message?: string;
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
}

export interface ProgressDisplayProps {
  state: ProcessState;
  className?: string;
  stageGroups?: Record<string, { title: string, stages: string[] }>;
  displayGroups?: string[];
}

export function ProgressDisplay({ state, className = '', stageGroups, displayGroups }: ProgressDisplayProps) {
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
  
  // 修改渲染階段的部分，添加對stageGroups和displayGroups的支持
  const renderStages = () => {
    if (!stageGroups) {
      // 傳統模式：顯示所有階段
  return (
          <div className="space-y-4">
            {state.stages.map((stage) => {
              const stageStatus = getStatusInfo(stage.status);
              const isActive = stage.id === state.currentStage;
              
              return (
                <div key={stage.id} className="relative flex items-start gap-3 pl-9">
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
                      <div className="h-2 w-2 rounded-full bg-primary-500 animate-pulse"></div>
                    )}
                  </div>
                  
                  <div className={`flex-1 ${
                    isActive ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    <div className="flex justify-between items-center">
                      <h5 className={`text-sm font-medium ${
                        isActive ? 'text-primary-600 dark:text-primary-400' : ''
                      }`}>
                        {stage.name}
                      </h5>
                      <span className={`text-xs font-medium text-${stageStatus.color === 'default' ? 'gray' : stageStatus.color}-600 dark:text-${stageStatus.color === 'default' ? 'gray' : stageStatus.color}-400`}>
                        {stageStatus.text}
                      </span>
                    </div>
                    
                    {stage.message && (
                      <p className="text-xs mt-1">
                        {stage.message}
                      </p>
                    )}
                    
                    {isActive && stage.status === 'processing' && (
                      <div className="mt-2">
                        <Progress 
                          value={stage.progress} 
                          color="primary"
                          size="sm"
                          className="h-1.5"
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
      );
    }
    
    // 使用階段群組模式
    return (
      <div className="space-y-6">
        {Object.entries(stageGroups)
          // 過濾顯示的群組
          .filter(([groupId]) => !displayGroups || displayGroups.includes(groupId))
          .map(([groupId, group]) => (
            <div key={groupId} className="space-y-4">
              <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 border-b pb-2 border-gray-200 dark:border-gray-700">
                {group.title}
              </h4>
              
              <div className="relative">
                {/* 階段連接線 */}
                <div className="absolute left-4 top-0 h-full w-0.5 bg-gray-200 dark:bg-gray-700"></div>
                
                {/* 組內階段 */}
                <div className="space-y-4">
                  {group.stages.map(stageId => {
                    const stage = state.stages.find(s => s.id === stageId);
                    if (!stage) return null;
                    
                    const stageStatus = getStatusInfo(stage.status);
                    const isActive = stage.id === state.currentStage;
                    
                    return (
                      <div key={stage.id} className="relative flex items-start gap-3 pl-9">
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
                            <div className="h-2 w-2 rounded-full bg-primary-500 animate-pulse"></div>
                          )}
                        </div>
                        
                        <div className={`flex-1 ${
                          isActive ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          <div className="flex justify-between items-center">
                            <h5 className={`text-sm font-medium ${
                              isActive ? 'text-primary-600 dark:text-primary-400' : ''
                            }`}>
                              {stage.name}
                            </h5>
                            <span className={`text-xs font-medium text-${stageStatus.color === 'default' ? 'gray' : stageStatus.color}-600 dark:text-${stageStatus.color === 'default' ? 'gray' : stageStatus.color}-400`}>
                              {stageStatus.text}
                            </span>
                          </div>
                          
                          {stage.message && (
                            <p className="text-xs mt-1">
                              {stage.message}
                            </p>
                          )}
                          
                          {isActive && stage.status === 'processing' && (
                            <div className="mt-2">
                              <Progress 
                                value={stage.progress} 
                                color="primary"
                                size="sm"
                                className="h-1.5"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
      </div>
    );
  };
  
  return (
    <div className={`w-full py-4 space-y-6 ${className}`}>
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
          className="h-2"
        />

        <div className="text-right text-xs text-gray-500 dark:text-gray-400">
          {Math.round(animatedProgress)}% 完成
        </div>
      </div>
      
      {/* 處理階段顯示 */}
      <div className="space-y-4 pt-2">
        <h4 className="text-md font-medium text-gray-800 dark:text-gray-200">
          處理階段
        </h4>
        
        <div className="relative">
          {/* 階段連接線 */}
          <div className="absolute left-4 top-0 h-full w-0.5 bg-gray-200 dark:bg-gray-700"></div>
          
          {/* 各處理階段 - 使用渲染函數 */}
          {renderStages()}
        </div>
      </div>
      
      {/* 處理元數據 */}
      {state.metadata && Object.keys(state.metadata).length > 0 && (
        <div className="mt-6 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-sm">
          <h4 className="font-medium mb-2 text-gray-800 dark:text-gray-200">處理信息</h4>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
            {state.type === 'file' && state.metadata.fileName && (
              <>
                <dt className="text-gray-500 dark:text-gray-400">文件名稱:</dt>
                <dd className="text-gray-800 dark:text-gray-200">{state.metadata.fileName}</dd>
              </>
            )}
            {state.type === 'url' && state.metadata.url && (
              <>
                <dt className="text-gray-500 dark:text-gray-400">URL:</dt>
                <dd className="text-gray-800 dark:text-gray-200 truncate">{state.metadata.url}</dd>
              </>
            )}
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