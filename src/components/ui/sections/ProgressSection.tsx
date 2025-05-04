'use client';

import { Section } from './Section';
import { useProcessing } from '@/context/ProcessingContext';
import { ProgressDisplay } from '../progress/ProgressDisplay';

export interface ProgressSectionProps {
  className?: string;
}

export function ProgressSection({ className = '' }: ProgressSectionProps) {
  const { processState } = useProcessing();

  // 如果沒有進度數據，顯示初始狀態
  if (!processState) {
    return (
      <Section
        id="progress-section"
        title="處理進度"
        description="等待開始處理..."
        className={className}
      >
        <div className="flex items-center justify-center h-56 bg-gray-50 dark:bg-gray-800/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">
            請上傳文件或輸入連結開始處理
          </p>
        </div>
      </Section>
    );
  }

  return (
    <Section
      id="progress-section"
      title="處理進度"
      description="檢視文件處理進度"
      className={className}
    >
      <ProgressDisplay state={processState} />
    </Section>
  );
} 