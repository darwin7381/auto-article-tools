'use client';

// 這個文件現在只是一個重定向到拆分後的 Context 架構
// 保留它是為了向後兼容

import { StageResult } from './ResultsContext';
import { ProcessingMode, ProcessingParams } from './ProcessingModeContext';
import { useProcessing, ProcessingAdapterProvider } from './ProcessingAdapter';

// 重新導出類型
export type { StageResult, ProcessingMode, ProcessingParams };

// 重新導出適配層的 Provider 和 hook
export { ProcessingAdapterProvider as ProcessingProvider, useProcessing }; 