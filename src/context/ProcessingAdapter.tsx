'use client';

import React, { createContext, useContext } from 'react';
import { useProcessState } from './ProcessStateContext';
import { useResults } from './ResultsContext';
import { useProcessingMode } from './ProcessingModeContext';
import { ProcessState } from '@/components/progress/ProgressDisplay';
import { StageResult } from './ResultsContext';
import { ProcessingParams } from './ProcessingModeContext';

// 向後兼容原來的 ProcessingContextType
interface ProcessingAdapterContextType {
  // 從 ProcessStateContext
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
  
  // 從 ResultsContext 適配
  saveStageResult: (stageId: string, result: StageResult) => void;
  getStageResult: (stageId: string) => StageResult | undefined;
  
  // 從 ProcessingModeContext
  processingParams: ProcessingParams;
  updateProcessingParams: (newParams: Partial<ProcessingParams>) => void;
}

const ProcessingAdapterContext = createContext<ProcessingAdapterContextType | undefined>(undefined);

export function ProcessingAdapterProvider({ children }: { children: React.ReactNode }) {
  // 獲取各個拆分後的 Context
  const processState = useProcessState();
  const results = useResults();
  const processingMode = useProcessingMode();
  
  // 適配 ResultsContext 方法到舊的接口
  const saveStageResult = (stageId: string, result: StageResult) => {
    if (processState.processState) {
      results.saveStageResult(processState.processState.id, stageId, result);
    }
  };
  
  const getStageResult = (stageId: string) => {
    if (!processState.processState) return undefined;
    return results.getStageResult(processState.processState.id, stageId);
  };
  
  // 組合成舊的接口結構
  const value: ProcessingAdapterContextType = {
    // 從 ProcessStateContext
    processState: processState.processState,
    updateProcessState: processState.updateProcessState,
    resetProcessState: processState.resetProcessState,
    startFileProcessing: processState.startFileProcessing,
    startUrlProcessing: processState.startUrlProcessing,
    updateStageProgress: processState.updateStageProgress,
    completeStage: processState.completeStage,
    setStageError: processState.setStageError,
    moveToNextStage: processState.moveToNextStage,
    subscribeToProcessState: processState.subscribeToProcessState,
    stageGroups: processState.stageGroups,
    
    // 從 ResultsContext 適配
    saveStageResult,
    getStageResult,
    
    // 從 ProcessingModeContext
    processingParams: processingMode.processingParams,
    updateProcessingParams: processingMode.updateProcessingParams
  };
  
  return (
    <ProcessingAdapterContext.Provider value={value}>
      {children}
    </ProcessingAdapterContext.Provider>
  );
}

/**
 * 向後兼容原來的 useProcessing hook
 * 這樣現有代碼可以繼續使用 useProcessing 而不需要修改
 */
export function useProcessing() {
  const context = useContext(ProcessingAdapterContext);
  if (context === undefined) {
    throw new Error('useProcessing must be used within a ProcessingAdapterProvider');
  }
  return context;
} 