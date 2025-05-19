'use client';

import React from 'react';
import { ProcessStateProvider } from './ProcessStateContext';
import { ResultsProvider } from './ResultsContext';
import { ProcessingModeProvider } from './ProcessingModeContext';
import { ProcessingAdapterProvider } from './ProcessingAdapter';

interface ProcessingProvidersProps {
  children: React.ReactNode;
}

/**
 * 組合所有處理相關的 Context Providers
 * 這使得原來的 ProcessingContext 被拆分為三個更專注的 Context
 * 同時提供向後兼容層以支持現有代碼
 */
export function ProcessingProviders({ children }: ProcessingProvidersProps) {
  return (
    <ProcessStateProvider>
      <ResultsProvider>
        <ProcessingModeProvider>
          <ProcessingAdapterProvider>
            {children}
          </ProcessingAdapterProvider>
        </ProcessingModeProvider>
      </ResultsProvider>
    </ProcessStateProvider>
  );
}

/**
 * 為了向後兼容原來的 ProcessingContext，
 * 我們可以創建一個適配層在這裡
 */ 