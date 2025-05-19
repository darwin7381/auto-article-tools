'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { ProcessState, ProcessStage } from '@/components/progress/ProgressDisplay';

// 階段群組定義
export const stageGroups = {
  initial: { 
    title: "初步處理階段",
    stages: ['upload', 'extract', 'process']
  },
  advanced: { 
    title: "後期處理階段",
    stages: ['advanced-ai', 'format-conversion', 'copy-editing']
  },
  final: {
    title: "上稿階段", 
    stages: ['prep-publish', 'publish-news']
  }
};

// 擴展後的階段定義
export const defaultStages: ProcessStage[] = [
  { id: 'upload', name: '上傳文件', status: 'pending', progress: 0 },
  { id: 'extract', name: '提取內容', status: 'pending', progress: 0 },
  { id: 'process', name: 'AI 初步內容處理', status: 'pending', progress: 0 },
  { id: 'advanced-ai', name: 'PR writer處理', status: 'pending', progress: 0 },
  { id: 'format-conversion', name: '格式轉換', status: 'pending', progress: 0 },
  { id: 'copy-editing', name: 'AI上稿編修', status: 'pending', progress: 0 },
  { id: 'prep-publish', name: '上稿準備', status: 'pending', progress: 0 },
  { id: 'publish-news', name: '上架新聞', status: 'pending', progress: 0 },
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

type ProcessStatusType = 'idle' | 'processing' | 'completed' | 'error';

interface ProcessStateContextType {
  processState: ProcessState | null;
  updateProcessState: (newState: Partial<ProcessState>) => void;
  resetProcessState: () => void;
  startFileProcessing: (fileId: string, fileName: string, fileType: string, fileSize: number) => void;
  startUrlProcessing: (url: string, urlType: string) => void;
  updateStageProgress: (stageId: string, progress: number, message?: string) => void;
  completeStage: (stageId: string, message?: string) => void;
  setStageError: (stageId: string, message: string) => void;
  moveToNextStage: () => void;
  subscribeToProcessState: (callback: (state: ProcessState | null) => void) => () => void;
  stageGroups: Record<string, { title: string, stages: string[] }>;
}

const ProcessStateContext = createContext<ProcessStateContextType | undefined>(undefined);

export function ProcessStateProvider({ children }: { children: React.ReactNode }) {
  const [processState, setProcessState] = useState<ProcessState | null>(null);
  const [subscribers, setSubscribers] = useState<Map<string, (state: ProcessState | null) => void>>(new Map());

  // 通知所有訂閱者
  const notifySubscribers = useCallback((state: ProcessState | null) => {
    subscribers.forEach(callback => {
      callback(state);
    });
  }, [subscribers]);

  // 訂閱處理狀態變化
  const subscribeToProcessState = useCallback((callback: (state: ProcessState | null) => void) => {
    const id = Math.random().toString(36).substring(2, 15);
    setSubscribers(prev => {
      const newMap = new Map(prev);
      newMap.set(id, callback);
      return newMap;
    });
    
    // 立即執行一次回調，獲取當前狀態
    if (processState) {
      callback(processState);
    }
    
    // 返回取消訂閱的函數
    return () => {
      setSubscribers(prev => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
    };
  }, [processState]);

  // 更新進度狀態
  const updateProcessState = useCallback((newState: Partial<ProcessState>) => {
    setProcessState(prevState => {
      if (!prevState) return null;
      const updated = { ...prevState, ...newState };
      
      // 確保在後台通知後再返回
      setTimeout(() => {
        notifySubscribers(updated);
      }, 0);
      
      return updated;
    });
  }, [notifySubscribers]);

  // 重置狀態
  const resetProcessState = useCallback(() => {
    setProcessState(null);
    
    // 通知所有訂閱者狀態已重置
    setTimeout(() => {
      notifySubscribers(null);
    }, 0);
  }, [notifySubscribers]);

  // 開始文件處理
  const startFileProcessing = useCallback((fileId: string, fileName: string, fileType: string, fileSize: number) => {
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
    
    // 通知所有訂閱者
    setTimeout(() => {
      notifySubscribers(newState);
    }, 0);
  }, [notifySubscribers]);

  // 開始URL處理
  const startUrlProcessing = useCallback((url: string, urlType: string) => {
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
    
    // 通知所有訂閱者
    setTimeout(() => {
      notifySubscribers(newState);
    }, 0);
  }, [notifySubscribers]);

  // 更新階段進度
  const updateStageProgress = useCallback((stageId: string, progress: number, message?: string) => {
    setProcessState(prevState => {
      if (!prevState) return null;
      
      const newStages = prevState.stages.map(stage => 
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
      if (currentStageIndex === -1) return prevState;
      
      const currentStageProgress = (progress / 100) * (1 / totalStages) * 100;
      const overallProgress = baseProgress + currentStageProgress;
      
      const updated = {
        ...prevState,
        stages: newStages,
        overall: {
          ...prevState.overall,
          progress: Math.min(overallProgress, 99), // 最多99%，保留完成階段設置100%
        }
      };
      
      // 通知所有訂閱者
      setTimeout(() => {
        notifySubscribers(updated);
      }, 0);
      
      return updated;
    });
  }, [notifySubscribers]);

  // 完成階段
  const completeStage = useCallback((stageId: string, message?: string) => {
    setProcessState(prevState => {
      if (!prevState) return null;
      
      const newStages = prevState.stages.map(stage => 
        stage.id === stageId 
          ? { ...stage, progress: 100, status: 'completed' as const, message } 
          : stage
      );
      
      // 檢查是否是最後一個階段，如果是則設置整體狀態為完成
      let updated;
      if (stageId === 'publish-news') {
        updated = {
          ...prevState,
          stages: newStages,
          overall: {
            ...prevState.overall,
            progress: 100,
            status: 'completed' as ProcessStatusType,
          }
        };
      } else {
        updated = {
          ...prevState,
          stages: newStages,
        };
      }
      
      // 通知所有訂閱者
      setTimeout(() => {
        notifySubscribers(updated);
      }, 0);
      
      return updated;
    });
  }, [notifySubscribers]);

  // 設置階段錯誤
  const setStageError = useCallback((stageId: string, message: string) => {
    setProcessState(prevState => {
      if (!prevState) return null;
      
      const newStages = prevState.stages.map(stage => 
        stage.id === stageId 
          ? { ...stage, status: 'error' as const, message } 
          : stage
      );
      
      const updated = {
        ...prevState,
        stages: newStages,
        overall: {
          ...prevState.overall,
          status: 'error' as ProcessStatusType,
        }
      };
      
      // 通知所有訂閱者
      setTimeout(() => {
        notifySubscribers(updated);
      }, 0);
      
      return updated;
    });
  }, [notifySubscribers]);

  // 移動到下一個階段
  const moveToNextStage = useCallback(() => {
    setProcessState(prevState => {
      if (!prevState) return null;
      
      const currentIndex = prevState.stages.findIndex(stage => stage.id === prevState.currentStage);
      if (currentIndex === -1 || currentIndex >= prevState.stages.length - 1) {
        // 已是最後階段，標記為完成
        if (currentIndex === prevState.stages.length - 1) {
          const finalStages = prevState.stages.map((stage, idx) => 
            idx === currentIndex 
              ? { ...stage, status: 'completed' as const, progress: 100 } 
              : stage
          );
          
          const updated = {
            ...prevState,
            stages: finalStages,
            overall: {
              progress: 100,
              status: 'completed' as ProcessStatusType,
            }
          };
          
          // 通知所有訂閱者
          setTimeout(() => {
            notifySubscribers(updated);
          }, 0);
          
          return updated;
        }
        return prevState;
      }
      
      // 當前階段標記為完成
      const newStages = [...prevState.stages];
      newStages[currentIndex] = { 
        ...newStages[currentIndex], 
        status: 'completed' as const, 
        progress: 100 
      };
      
      // 下一階段標記為處理中
      const nextStage = prevState.stages[currentIndex + 1].id;
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
      
      const updated = {
        ...prevState,
        stages: newStages,
        currentStage: nextStage,
        overall: {
          ...prevState.overall,
          progress: (completedStages === totalStages || prevState.currentStage === 'publish-news') ? 100 : Math.min(overallProgress, 99), // 完成阶段或所有阶段完成时显示100%
        }
      };
      
      // 通知所有訂閱者
      setTimeout(() => {
        notifySubscribers(updated);
      }, 0);
      
      return updated;
    });
  }, [notifySubscribers]);

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
    subscribeToProcessState,
    stageGroups
  };

  return (
    <ProcessStateContext.Provider value={value}>
      {children}
    </ProcessStateContext.Provider>
  );
}

export function useProcessState() {
  const context = useContext(ProcessStateContext);
  if (context === undefined) {
    throw new Error('useProcessState must be used within a ProcessStateProvider');
  }
  return context;
} 