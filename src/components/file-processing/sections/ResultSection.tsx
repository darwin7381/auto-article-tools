'use client';

import React from 'react';
import ProgressDisplay from '@/components/progress/ProgressDisplay';
import { Button } from '@/components/ui/button/Button';
import { ProcessState } from '@/components/progress/ProgressDisplay';
import { ExtendedProcessingResult } from '../hooks/useFileProcessor';

interface ResultSectionProps {
  processState: ProcessState | null;
  result: ExtendedProcessingResult | null;
  onViewStage: (stageId: string, stageResult?: Record<string, unknown>) => void;
  onReset: () => void;
  onBack: () => void;
  renderPrepPublishingComponent: () => React.ReactNode;
  renderWordPressPublishComponent: () => React.ReactNode;
}

export default function ResultSection({
  processState,
  result,
  onViewStage,
  onReset,
  onBack,
  renderPrepPublishingComponent,
  renderWordPressPublishComponent
}: ResultSectionProps) {
  if (!processState || !result) return null;

  // 配置階段插槽
  const stageSlots = {
    'prep-publish': renderPrepPublishingComponent(), 
    'publish-news': renderWordPressPublishComponent()
  };

  return (
    <div className="space-y-6">
      <ProgressDisplay 
        state={processState}
        stageGroups={{
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
        }}
        displayGroups={['final']}
        onViewStage={onViewStage}
        stageSlots={stageSlots}
      />
      
      <div className="flex justify-between pt-2">
        <Button 
          variant="light"
          onClick={onBack}
          startIcon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          }
        >
          返回後期處理
        </Button>
        <Button 
          onClick={onReset}
          color="secondary"
          startIcon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          }
        >
          處理新文件
        </Button>
      </div>
    </div>
  );
} 