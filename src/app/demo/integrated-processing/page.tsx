'use client';

import { ProcessingProvider } from '@/context/ProcessingContext';
import IntegratedFileProcessor from '@/components/file-processing/IntegratedFileProcessor';

export default function IntegratedProcessingDemo() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              文件處理一體化解決方案
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              整合上傳、處理進度和結果顯示的流暢體驗
            </p>
          </div>
          
          <ProcessingProvider>
            <IntegratedFileProcessor />
          </ProcessingProvider>
          
          <div className="mt-10 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
              使用說明
            </h2>
            <ol className="space-y-3 text-gray-700 dark:text-gray-300">
              <li className="flex gap-2">
                <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 font-medium text-sm">1</span>
                <span>在第一個標籤頁中<strong>上傳文件</strong>（支持 PDF、DOCX 等格式）</span>
              </li>
              <li className="flex gap-2">
                <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 font-medium text-sm">2</span>
                <span>點擊<strong>開始處理</strong>按鈕啟動處理流程</span>
              </li>
              <li className="flex gap-2">
                <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 font-medium text-sm">3</span>
                <span>在<strong>處理進度</strong>標籤頁中實時查看處理狀態</span>
              </li>
              <li className="flex gap-2">
                <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 font-medium text-sm">4</span>
                <span>處理完成後在<strong>處理結果</strong>標籤頁中查看結果</span>
              </li>
              <li className="flex gap-2">
                <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 font-medium text-sm">5</span>
                <span>您可以<strong>複製內容</strong>或<strong>下載文件</strong></span>
              </li>
            </ol>
          </div>
          
          <div className="bg-gray-100 dark:bg-gray-800/50 rounded-xl p-5 text-center text-gray-500 dark:text-gray-400 text-sm">
            這是一個一體化的文件處理界面示例，整合了文件上傳和處理進度顯示功能
          </div>
        </div>
      </div>
    </div>
  );
} 