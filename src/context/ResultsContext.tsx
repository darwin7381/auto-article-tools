'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

// 定義階段結果的類型
export interface StageResult {
  [key: string]: unknown;
}

interface ResultsContextType {
  saveStageResult: (processId: string, stageId: string, result: StageResult) => void;
  getStageResult: (processId: string, stageId: string) => StageResult | undefined;
  clearResults: (processId?: string) => void;
  getAllResultsForProcess: (processId: string) => Record<string, StageResult>;
}

const ResultsContext = createContext<ResultsContextType | undefined>(undefined);

export function ResultsProvider({ children }: { children: React.ReactNode }) {
  // 階段結果存儲，key是處理ID+階段ID，如 "file-123-process"
  const [stageResults, setStageResults] = useState<Map<string, StageResult>>(new Map());

  // 構建結果鍵名
  const getResultKey = (processId: string, stageId: string) => `${processId}-${stageId}`;

  // 保存階段結果
  const saveStageResult = useCallback((processId: string, stageId: string, result: StageResult) => {
    const resultKey = getResultKey(processId, stageId);
    
    setStageResults(prev => {
      const newMap = new Map(prev);
      newMap.set(resultKey, result);
      return newMap;
    });
  }, []);

  // 獲取階段結果
  const getStageResult = useCallback((processId: string, stageId: string): StageResult | undefined => {
    const resultKey = getResultKey(processId, stageId);
    return stageResults.get(resultKey);
  }, [stageResults]);

  // 清除結果
  const clearResults = useCallback((processId?: string) => {
    if (processId) {
      // 只清除特定處理ID的結果
      setStageResults(prev => {
        const newMap = new Map();
        // 保留不屬於該處理ID的結果
        for (const [key, value] of prev.entries()) {
          if (!key.startsWith(`${processId}-`)) {
            newMap.set(key, value);
          }
        }
        return newMap;
      });
    } else {
      // 清除所有結果
      setStageResults(new Map());
    }
  }, []);

  // 獲取處理的所有階段結果
  const getAllResultsForProcess = useCallback((processId: string): Record<string, StageResult> => {
    const results: Record<string, StageResult> = {};
    
    for (const [key, value] of stageResults.entries()) {
      if (key.startsWith(`${processId}-`)) {
        // 提取階段ID - 從key中去除processId-前綴
        const stageId = key.substring(processId.length + 1);
        results[stageId] = value;
      }
    }
    
    return results;
  }, [stageResults]);

  const value = {
    saveStageResult,
    getStageResult,
    clearResults,
    getAllResultsForProcess
  };

  return (
    <ResultsContext.Provider value={value}>
      {children}
    </ResultsContext.Provider>
  );
}

export function useResults() {
  const context = useContext(ResultsContext);
  if (context === undefined) {
    throw new Error('useResults must be used within a ResultsProvider');
  }
  return context;
} 