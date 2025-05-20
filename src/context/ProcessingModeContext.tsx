'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

// 處理模式類型
export type ProcessingMode = 'auto' | 'manual';

// 處理參數類型，用於未來擴展
export interface ProcessingParams {
  mode: ProcessingMode;
  useWatermark?: boolean;        // 使用浮水印
  autoGenerateFeaturedImage?: boolean; // 自動生成首圖
  editorLabel?: string;          // 廣編標示
  autoSEO?: boolean;             // 自動SEO優化
  imageSources?: string[];       // 圖像來源
  pdfOptions?: {                 // PDF處理選項
    extractTables?: boolean;     // 提取表格
    extractImages?: boolean;     // 提取圖片
  };
  // 未來可添加更多參數
}

interface ProcessingModeContextType {
  processingParams: ProcessingParams;
  updateProcessingParams: (newParams: Partial<ProcessingParams>) => void;
  resetParams: () => void;
  setAutoMode: (isAuto: boolean) => void;
  isAutoMode: boolean;
}

// 默認處理參數
const defaultProcessingParams: ProcessingParams = {
  mode: 'auto',               // 默認為自動模式
  useWatermark: false,
  autoGenerateFeaturedImage: false,
  autoSEO: false
};

const ProcessingModeContext = createContext<ProcessingModeContextType | undefined>(undefined);

export function ProcessingModeProvider({ children }: { children: React.ReactNode }) {
  // 處理參數狀態
  const [processingParams, setProcessingParams] = useState<ProcessingParams>(defaultProcessingParams);

  // 更新處理參數的方法
  const updateProcessingParams = useCallback((newParams: Partial<ProcessingParams>) => {
    setProcessingParams(prev => ({
      ...prev,
      ...newParams
    }));
  }, []);

  // 重置處理參數
  const resetParams = useCallback(() => {
    setProcessingParams(defaultProcessingParams);
  }, []);

  // 設置自動模式
  const setAutoMode = useCallback((isAuto: boolean) => {
    setProcessingParams(prev => ({
      ...prev,
      mode: isAuto ? 'auto' : 'manual'
    }));
  }, []);

  // 檢查是否為自動模式
  const isAutoMode = processingParams.mode === 'auto';

  const value = {
    processingParams,
    updateProcessingParams,
    resetParams,
    setAutoMode,
    isAutoMode
  };

  return (
    <ProcessingModeContext.Provider value={value}>
      {children}
    </ProcessingModeContext.Provider>
  );
}

export function useProcessingMode() {
  const context = useContext(ProcessingModeContext);
  if (context === undefined) {
    throw new Error('useProcessingMode must be used within a ProcessingModeProvider');
  }
  return context;
} 