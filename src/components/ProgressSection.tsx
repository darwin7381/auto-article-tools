'use client';

import { Card, CardHeader, CardBody } from '@heroui/react';
import { useProcessing } from '@/context/ProcessingContext';
import ProgressDisplay from '@/components/progress/ProgressDisplay';

export default function ProgressSection() {
  const { processState } = useProcessing();

  // 如果沒有進度數據，顯示初始狀態
  if (!processState) {
    return (
      <section id="progress-section">
        <Card className="w-full border-none shadow-none">
          <CardHeader className="flex flex-col gap-1">
            <h2 className="text-2xl font-bold text-primary-600 dark:text-primary-400">處理進度</h2>
            <p className="text-gray-500 dark:text-gray-400">等待開始處理...</p>
          </CardHeader>
          <CardBody>
            <div className="flex items-center justify-center h-56 bg-gray-50 dark:bg-gray-800/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
              <p className="text-gray-500 dark:text-gray-400">
                請上傳文件或輸入連結開始處理
              </p>
            </div>
          </CardBody>
        </Card>
      </section>
    );
  }

  return (
    <section id="progress-section">
      <Card className="w-full border-none shadow-none">
        <CardHeader className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-primary-600 dark:text-primary-400">處理進度</h2>
          <p className="text-gray-500 dark:text-gray-400">檢視文件處理進度</p>
        </CardHeader>
        <CardBody>
          <ProgressDisplay state={processState} />
        </CardBody>
      </Card>
    </section>
  );
} 