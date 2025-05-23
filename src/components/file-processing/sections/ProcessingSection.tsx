'use client';

import React from 'react';
import ProgressDisplay from '@/components/progress/ProgressDisplay';
import { Button } from '@/components/ui/button/Button';
import { ProcessState } from '@/components/progress/ProgressDisplay';

interface ProcessingSectionProps {
  processState: ProcessState | null;
  onViewStage: (stageId: string, stageResult?: Record<string, unknown>) => void;
  displayGroups: string[];
  onBack: () => void;
  onNext?: () => void;
  showNextButton?: boolean;
  nextButtonText?: string;
  uploadSuccess: boolean;
  processSuccess: boolean;
  uploadError: string | null;
  selectedInputType: 'file' | 'link';
}

export default function ProcessingSection({
  processState,
  onViewStage,
  displayGroups,
  onBack,
  onNext,
  showNextButton,
  nextButtonText = '下一步',
  uploadSuccess,
  processSuccess,
  uploadError,
  selectedInputType
}: ProcessingSectionProps) {
  // 渲染狀態通知欄
  const renderStatusNotification = () => {
    if (uploadError) {
      return (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-800/30 mb-4">
          <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            {uploadError}
          </p>
        </div>
      );
    }

    if (processSuccess) {
      return (
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-800/30 mb-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {selectedInputType === 'file' ? '文件' : '連結'}處理完成，已生成Markdown檔案
            </p>
          </div>
        </div>
      );
    }

    if (uploadSuccess && !processSuccess) {
      return (
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-800/30 mb-4">
          <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {selectedInputType === 'file' ? '文件上傳成功' : '連結處理中'}，正在處理中...
          </p>
        </div>
      );
    }

    return null;
  };

  if (!processState) return null;

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
        displayGroups={displayGroups}
        onViewStage={onViewStage}
      />
      
      {/* 狀態通知 */}
      {renderStatusNotification()}
      
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
          返回
        </Button>
        
        {showNextButton && onNext && (
          <Button 
            onClick={onNext}
            startIcon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            }
          >
            {nextButtonText}
          </Button>
        )}
      </div>
    </div>
  );
} 