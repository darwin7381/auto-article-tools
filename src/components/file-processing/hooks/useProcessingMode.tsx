'use client';

import { useState, useEffect } from 'react';
import { useProcessing } from '@/context/ProcessingContext';

export default function useProcessingMode() {
  // 獲取處理上下文
  const { 
    processingParams,
    updateProcessingParams,
  } = useProcessing();

  // 處理模式狀態 - 從上下文中獲取初始值
  const [isAutoMode, setIsAutoMode] = useState(processingParams.mode === 'auto');

  // 同步處理模式狀態與上下文
  useEffect(() => {
    setIsAutoMode(processingParams.mode === 'auto');
  }, [processingParams.mode]);
  
  // 更新處理模式
  const handleModeChange = (isAuto: boolean) => {
    setIsAutoMode(isAuto);
    updateProcessingParams({ 
      mode: isAuto ? 'auto' : 'manual' 
    });
  };

  return {
    isAutoMode,
    handleModeChange
  };
} 