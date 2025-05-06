'use client';

import React, { useState, useEffect } from 'react';
import { FileUpload } from '../ui/file-upload/FileUpload';
import ProgressDisplay from '../progress/ProgressDisplay';
import useProcessingFlow from './useProcessingFlow';
import { ProcessingResult as BaseProcessingResult } from './useAiProcessingStage';
import { useProcessing } from '@/context/ProcessingContext';
import { Button } from '../ui/button/Button';

// 擴展ProcessingResult類型以包含markdownContent
interface ExtendedProcessingResult extends BaseProcessingResult {
  markdownContent?: string;
}

export default function IntegratedFileProcessor() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtendedProcessingResult | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'progress' | 'result'>('upload');
  
  // 獲取處理上下文
  const { processState, resetProcessState } = useProcessing();

  // 處理流程hook
  const { processFile, cleanup } = useProcessingFlow({
    onProcessSuccess: (processResult) => {
      // 將處理結果轉換為擴展類型
      setResult(processResult as ExtendedProcessingResult);
      setActiveTab('result');
    },
    onProcessError: (error, stage) => {
      console.error(`處理錯誤 (${stage}):`, error);
      setUploadError(error);
    },
    onStageComplete: (stage, result) => {
      console.log(`階段完成: ${stage}`, result);
      // 當第一個階段完成時，自動切換到進度頁面
      if (stage === 'upload' && activeTab === 'upload') {
        setActiveTab('progress');
      }
    },
    onFileUploadComplete: () => {
      // 使用callback標記完成，但不再需要單獨存儲成功狀態
    },
    setIsProcessing,
    setUploadSuccess: () => {}, // 空實現，因為我們不再需要這個狀態
    setUploadError,
    setIsUploading: () => {} // 空實現，因為我們不再需要這個狀態
  });

  // 組件卸載時清理資源
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // 重置功能
  const handleReset = () => {
    setSelectedFile(null);
    setUploadError(null);
    setResult(null);
    setActiveTab('upload');
    resetProcessState();
  };

  // 處理文件上傳
  const handleFileChange = (file: File) => {
    setSelectedFile(file);
  };

  // 開始處理
  const handleProcess = () => {
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  return (
    <div className="w-full rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm">
      {/* 標籤式導航 */}
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => !isProcessing && setActiveTab('upload')}
          className={`flex-1 py-3 px-4 text-sm font-medium ${
            activeTab === 'upload'
              ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={isProcessing}
        >
          1. 文件上傳
        </button>
        <button
          onClick={() => processState && setActiveTab('progress')}
          className={`flex-1 py-3 px-4 text-sm font-medium ${
            activeTab === 'progress'
              ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          } ${!processState ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={!processState}
        >
          2. 處理進度
        </button>
        <button
          onClick={() => result && setActiveTab('result')}
          className={`flex-1 py-3 px-4 text-sm font-medium ${
            activeTab === 'result'
              ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          } ${!result ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={!result}
        >
          3. 處理結果
        </button>
      </div>

      <div className="p-6">
        {/* 上傳介面 */}
        {activeTab === 'upload' && (
          <div className="space-y-6">
            <FileUpload
              onFileChange={handleFileChange}
              selectedFile={selectedFile}
              onReset={() => setSelectedFile(null)}
              label="上傳文件進行處理"
              supportedFormatsText="支持 PDF、DOCX 和 其他文本格式"
            />
            
            {uploadError && (
              <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm border border-red-100 dark:border-red-800/30">
                錯誤：{uploadError}
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button 
                onClick={handleProcess}
                disabled={!selectedFile || isProcessing}
                isLoading={isProcessing}
                startIcon={
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                  </svg>
                }
              >
                開始處理
              </Button>
            </div>
          </div>
        )}

        {/* 進度顯示 */}
        {activeTab === 'progress' && processState && (
          <div className="space-y-6">
            <ProgressDisplay state={processState} />
            
            <div className="flex justify-between pt-4">
              <Button 
                variant="light"
                onClick={() => setActiveTab('upload')}
                disabled={isProcessing}
                startIcon={
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                  </svg>
                }
              >
                返回上傳
              </Button>
              
              {result && (
                <Button 
                  onClick={() => setActiveTab('result')}
                  startIcon={
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                    </svg>
                  }
                >
                  查看結果
                </Button>
              )}
            </div>
          </div>
        )}

        {/* 結果顯示 */}
        {activeTab === 'result' && result && (
          <div className="space-y-6">
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-800/30 mb-4">
              <div className="flex items-center gap-3 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-green-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                <h3 className="text-lg font-semibold text-green-700 dark:text-green-400">處理完成</h3>
              </div>
              <p className="text-green-600 dark:text-green-400 text-sm">您的文件已成功處理完成，可以查看並使用處理結果。</p>
            </div>
            
            {/* 結果預覽區域 */}
            <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4">
              <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-2">
                處理結果預覽
              </h4>
              
              {/* 這裡根據實際結果類型顯示不同內容 */}
              {result.markdownContent && (
                <div className="max-h-96 overflow-y-auto bg-gray-50 dark:bg-gray-900 rounded p-4 text-sm font-mono whitespace-pre-wrap">
                  {result.markdownContent.slice(0, 500)}
                  {result.markdownContent.length > 500 && '...'}
                </div>
              )}
              
              <div className="flex justify-end mt-4 gap-3">
                <Button 
                  variant="light" 
                  color="primary"
                  onClick={() => {
                    if (result.markdownContent) {
                      navigator.clipboard.writeText(result.markdownContent);
                    }
                  }}
                  startIcon={
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
                    </svg>
                  }
                >
                  複製內容
                </Button>
                <Button 
                  color="primary"
                  onClick={() => {
                    if (result.markdownContent) {
                      const blob = new Blob([result.markdownContent], { type: 'text/markdown' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'processed-content.md';
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }
                  }}
                  startIcon={
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                  }
                >
                  下載文件
                </Button>
              </div>
            </div>
            
            <div className="flex justify-between pt-4">
              <Button 
                variant="light"
                onClick={() => setActiveTab('progress')}
                startIcon={
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                  </svg>
                }
              >
                返回進度
              </Button>
              <Button 
                onClick={handleReset}
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
        )}
      </div>
    </div>
  );
} 