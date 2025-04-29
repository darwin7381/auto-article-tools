'use client';

import React, { createContext, useContext, useState } from 'react';
import { ProcessState, ProcessStage } from '@/components/progress/ProgressDisplay';

interface ProcessingContextType {
  processState: ProcessState | null;
  updateProcessState: (newState: Partial<ProcessState>) => void;
  resetProcessState: () => void;
  startFileProcessing: (fileId: string, fileName: string, fileType: string, fileSize: number) => void;
  startUrlProcessing: (url: string, urlType: string) => void;
  updateStageProgress: (stageId: string, progress: number, message?: string) => void;
  completeStage: (stageId: string, message?: string) => void;
  setStageError: (stageId: string, message: string) => void;
  moveToNextStage: () => void;
}

// 簡化為實際流程的階段
const defaultStages: ProcessStage[] = [
  { id: 'upload', name: '上傳文件', status: 'pending', progress: 0 },
  { id: 'extract', name: '提取內容', status: 'pending', progress: 0 },
  { id: 'process', name: 'AI 初步內容處理', status: 'pending', progress: 0 },
  { id: 'complete', name: '處理完成', status: 'pending', progress: 0 },
];

const initialState: ProcessState = {
  id: '',
  type: 'file',
  stages: defaultStages,
  currentStage: 'upload',
  overall: {
    progress: 0,
    status: 'idle',
  },
  metadata: {},
};

const ProcessingContext = createContext<ProcessingContextType | undefined>(undefined);

export function ProcessingProvider({ children }: { children: React.ReactNode }) {
  const [processState, setProcessState] = useState<ProcessState | null>(null);

  // 更新進度狀態
  const updateProcessState = (newState: Partial<ProcessState>) => {
    setProcessState(prev => {
      if (!prev) return null;
      return { ...prev, ...newState };
    });
  };

  // 重置狀態
  const resetProcessState = () => {
    setProcessState(null);
  };

  // 開始文件處理
  const startFileProcessing = (fileId: string, fileName: string, fileType: string, fileSize: number) => {
    const newState: ProcessState = {
      ...JSON.parse(JSON.stringify(initialState)), // 深拷貝避免引用問題
      id: fileId,
      type: 'file',
      currentStage: 'upload',
      overall: {
        progress: 0,
        status: 'processing',
      },
      metadata: {
        fileName,
        fileType,
        fileSize,
      },
    };

    // 更新第一個階段狀態
    newState.stages[0] = {
      ...newState.stages[0],
      status: 'processing'
    };
    setProcessState(newState);
  };

  // 開始URL處理
  const startUrlProcessing = (url: string, urlType: string) => {
    const newState: ProcessState = {
      ...JSON.parse(JSON.stringify(initialState)), // 深拷貝避免引用問題
      id: `url-${Date.now()}`,
      type: 'url',
      currentStage: 'upload',
      overall: {
        progress: 0,
        status: 'processing',
      },
      metadata: {
        url,
        urlType,
      },
    };
    
    // 更新第一個階段狀態
    newState.stages[0] = {
      ...newState.stages[0],
      status: 'processing'
    };
    setProcessState(newState);
  };

  // 更新階段進度
  const updateStageProgress = (stageId: string, progress: number, message?: string) => {
    setProcessState(prev => {
      if (!prev) return null;
      
      const newStages = prev.stages.map(stage => 
        stage.id === stageId 
          ? { ...stage, progress, message, status: 'processing' as const } 
          : stage
      );
      
      // 重新計算總體進度 - 與 moveToNextStage 保持一致
      const completedStages = newStages.filter(s => s.status === 'completed').length;
      const totalStages = newStages.length;
      
      // 已完成階段的進度
      const baseProgress = (completedStages / totalStages) * 100;
      
      // 加上當前階段的進度比例
      const currentStageIndex = newStages.findIndex(s => s.id === stageId);
      if (currentStageIndex === -1) return prev;
      
      const currentStageProgress = (progress / 100) * (1 / totalStages) * 100;
      const overallProgress = baseProgress + currentStageProgress;
      
      return {
        ...prev,
        stages: newStages,
        overall: {
          ...prev.overall,
          progress: Math.min(overallProgress, 99), // 最多99%，保留完成階段設置100%
        }
      };
    });
  };

  // 完成階段
  const completeStage = (stageId: string, message?: string) => {
    setProcessState(prev => {
      if (!prev) return null;
      
      const newStages = prev.stages.map(stage => 
        stage.id === stageId 
          ? { ...stage, progress: 100, status: 'completed' as const, message } 
          : stage
      );
      
      // 檢查是否是最後一個階段，如果是則設置整體狀態為完成
      if (stageId === 'complete') {
        return {
          ...prev,
          stages: newStages,
          overall: {
            ...prev.overall,
            progress: 100,
            status: 'completed'
          }
        };
      }
      
      return {
        ...prev,
        stages: newStages,
      };
    });
  };

  // 設置階段錯誤
  const setStageError = (stageId: string, message: string) => {
    setProcessState(prev => {
      if (!prev) return null;
      
      const newStages = prev.stages.map(stage => 
        stage.id === stageId 
          ? { ...stage, status: 'error' as const, message } 
          : stage
      );
      
      return {
        ...prev,
        stages: newStages,
        overall: {
          ...prev.overall,
          status: 'error',
        }
      };
    });
  };

  // 移動到下一個階段
  const moveToNextStage = () => {
    setProcessState(prev => {
      if (!prev) return null;
      
      const currentIndex = prev.stages.findIndex(stage => stage.id === prev.currentStage);
      if (currentIndex === -1 || currentIndex >= prev.stages.length - 1) {
        // 已是最後階段，標記為完成
        if (currentIndex === prev.stages.length - 1) {
          const finalStages = prev.stages.map((stage, idx) => 
            idx === currentIndex 
              ? { ...stage, status: 'completed' as const, progress: 100 } 
              : stage
          );
          
          return {
            ...prev,
            stages: finalStages,
            overall: {
              progress: 100,
              status: 'completed',
            }
          };
        }
        return prev;
      }
      
      // 當前階段標記為完成
      const newStages = [...prev.stages];
      newStages[currentIndex] = { 
        ...newStages[currentIndex], 
        status: 'completed' as const, 
        progress: 100 
      };
      
      // 下一階段標記為處理中
      const nextStage = prev.stages[currentIndex + 1].id;
      newStages[currentIndex + 1] = { 
        ...newStages[currentIndex + 1], 
        status: 'processing' as const, 
        progress: 0 
      };
      
      // 重新計算總體進度 - 確保更準確
      const completedStages = newStages.filter(s => s.status === 'completed').length;
      const totalStages = newStages.length;
      const processingStage = newStages.find(s => s.status === 'processing');
      
      let overallProgress;
      if (completedStages === totalStages) {
        overallProgress = 100;
      } else {
        // 已完成階段的進度
        const baseProgress = (completedStages / totalStages) * 100;
        // 加上當前階段的進度比例
        const currentProgress = processingStage ? (processingStage.progress / 100) * (1 / totalStages) * 100 : 0;
        overallProgress = baseProgress + currentProgress;
      }
      
      return {
        ...prev,
        stages: newStages,
        currentStage: nextStage,
        overall: {
          ...prev.overall,
          progress: overallProgress,
        }
      };
    });
  };

  const value = {
    processState,
    updateProcessState,
    resetProcessState,
    startFileProcessing,
    startUrlProcessing,
    updateStageProgress,
    completeStage,
    setStageError,
    moveToNextStage,
  };

  return (
    <ProcessingContext.Provider value={value}>
      {children}
    </ProcessingContext.Provider>
  );
}

export function useProcessing() {
  const context = useContext(ProcessingContext);
  if (context === undefined) {
    throw new Error('useProcessing must be used within a ProcessingProvider');
  }
  return context;
} 