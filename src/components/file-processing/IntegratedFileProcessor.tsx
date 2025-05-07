'use client';

import React, { useState, useEffect } from 'react';
import { FileUpload } from '../ui/file-upload/FileUpload';
import ProgressDisplay from '../progress/ProgressDisplay';
import useProcessingFlow, { ExtractResult } from './useProcessingFlow';
import { ProcessingResult as BaseProcessingResult } from './useAiProcessingStage';
import { useProcessing } from '@/context/ProcessingContext';
import { Button } from '../ui/button/Button';

// 擴展ProcessingResult類型以包含markdownContent
interface ExtendedProcessingResult extends BaseProcessingResult {
  markdownContent?: string;
  publicUrl?: string;
}

export default function IntegratedFileProcessor() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtendedProcessingResult | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'progress' | 'result'>('upload');
  const [selectedInputType, setSelectedInputType] = useState<'file' | 'link'>('file');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkType, setLinkType] = useState('website');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [markdownUrl, setMarkdownUrl] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [processSuccess, setProcessSuccess] = useState(false);
  
  // 獲取處理上下文
  const { processState, resetProcessState } = useProcessing();

  // 處理流程hook
  const { processFile, processUrl, cleanup } = useProcessingFlow({
    onProcessSuccess: (processResult) => {
      // 將處理結果轉換為擴展類型
      const extendedResult = processResult as ExtendedProcessingResult;
      setResult(extendedResult);
      setProcessSuccess(true);
      
      // 設置Markdown URL用於預覽
      if (extendedResult.publicUrl) {
        setMarkdownUrl(`/viewer/${encodeURIComponent(extendedResult.publicUrl)}`);
      } else if (extendedResult.markdownKey) {
        const key = extendedResult.markdownKey.split('/').pop() || '';
        setMarkdownUrl(`/viewer/processed/${key}`);
      }
      
      setActiveTab('result');
    },
    onProcessError: (error, stage) => {
      console.error(`處理錯誤 (${stage}):`, error);
      setUploadError(error);
      
      // 如果是AI處理階段錯誤，仍然標記為部分成功
      if (stage === 'process') {
        setProcessSuccess(true);
      }
    },
    onStageComplete: (stage, result) => {
      console.log(`階段完成: ${stage}`, result);
      // 當第一個階段完成時，自動切換到進度頁面
      if (stage === 'upload' && activeTab === 'upload') {
        setUploadSuccess(true);
        setActiveTab('progress');
      }
      
      // 如果是extract階段，且有publicUrl或markdownKey，提前設置預覽URL
      if (stage === 'extract' && 'publicUrl' in result) {
        const extractResult = result as ExtractResult;
        if (extractResult.publicUrl) {
          setMarkdownUrl(`/viewer/${encodeURIComponent(extractResult.publicUrl)}`);
        } else if (extractResult.markdownKey) {
          const key = extractResult.markdownKey.split('/').pop() || '';
          setMarkdownUrl(`/viewer/processed/${key}`);
        }
      }
    },
    onFileUploadComplete: () => {
      setUploadSuccess(true);
    },
    setIsProcessing,
    setUploadSuccess,
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
    setLinkUrl('');
    setLinkType('website');
    setUrlError(null);
    setUploadError(null);
    setResult(null);
    setMarkdownUrl(null);
    setUploadSuccess(false);
    setProcessSuccess(false);
    setActiveTab('upload');
    resetProcessState();
  };

  // 處理文件上傳
  const handleFileChange = (file: File) => {
    setSelectedFile(file);
    setUploadError(null);
  };

  // 處理連結輸入
  const handleLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLinkUrl(e.target.value);
    if (e.target.value) {
      validateUrl(e.target.value);
    } else {
      setUrlError(null);
    }
    setUploadError(null);
  };

  // 驗證URL
  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      setUrlError(null);
      
      // 自動檢測URL類型
      detectUrlType(url);
      return true;
    } catch {
      setUrlError('請輸入有效的URL');
      return false;
    }
  };

  // 檢測URL類型
  const detectUrlType = (url: string) => {
    try {
      // 檢測Google Docs
      if (url.includes('docs.google.com')) {
        setLinkType('gdocs');
        return;
      }
      
      // 檢測Medium
      if (url.includes('medium.com') || url.match(/^https:\/\/[\w-]+\.medium\.com/)) {
        setLinkType('medium');
        return;
      }
      
      // 檢測WeChat
      if (url.includes('weixin.qq.com') || url.includes('mp.weixin.qq.com')) {
        setLinkType('wechat');
        return;
      }
      
      // 默認為一般網站
      setLinkType('website');
    } catch (error) {
      // URL無效，不更改類型
      console.error('URL檢測失敗:', error);
    }
  };

  // 開始處理
  const handleProcess = () => {
    if (isProcessing) return;
    
    // 重置處理狀態
    setUploadError(null);
    setResult(null);
    setMarkdownUrl(null);
    
    if (selectedInputType === 'file' && selectedFile) {
      processFile(selectedFile);
    } else if (selectedInputType === 'link' && linkUrl) {
      // 驗證URL
      if (!validateUrl(linkUrl)) {
        return;
      }
      processUrl(linkUrl, linkType);
    } else {
      setUploadError(selectedInputType === 'file' ? '請選擇要上傳的檔案' : '請輸入有效的連結');
    }
  };

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
            {markdownUrl && (
              <a 
                href={markdownUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary-600 dark:text-primary-400 flex items-center gap-1 hover:underline"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                查看
              </a>
            )}
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
            {/* 輸入類型選擇 */}
            <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setSelectedInputType('file')}
                className={`flex-1 py-2.5 px-4 text-sm font-medium flex items-center justify-center gap-2 ${
                  selectedInputType === 'file'
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                上傳文件
              </button>
              <button
                onClick={() => setSelectedInputType('link')}
                className={`flex-1 py-2.5 px-4 text-sm font-medium flex items-center justify-center gap-2 ${
                  selectedInputType === 'link'
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                </svg>
                輸入連結
              </button>
            </div>
            
            {/* 文件上傳 */}
            {selectedInputType === 'file' && (
              <FileUpload
                onFileChange={handleFileChange}
                selectedFile={selectedFile}
                onReset={() => setSelectedFile(null)}
                supportedFormatsText="支持 PDF、DOCX 和 其他文本格式"
              />
            )}
            
            {/* 連結輸入 */}
            {selectedInputType === 'link' && (
              <div className="space-y-6">
                <div className="max-w-full">
                  <div className="mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      文章連結
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3 text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                        </svg>
                      </div>
                      <input
                        type="url"
                        placeholder="輸入URL，例如：https://example.com/article"
                        value={linkUrl}
                        onChange={handleLinkChange}
                        className={`w-full pl-10 pr-4 py-2.5 border ${urlError ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'} rounded-md bg-default-50 dark:bg-default-50/10 hover:bg-default-100 dark:hover:bg-default-100/10 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent`}
                      />
                      {linkUrl && (
                        <button 
                          type="button" 
                          onClick={() => {
                            setLinkUrl('');
                            setUrlError(null);
                          }}
                          className="absolute right-3 text-gray-400 hover:text-gray-500"
                          aria-label="清除輸入"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                    {urlError && (
                      <p className="mt-1 text-xs text-red-500">{urlError}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">輸入包含文章內容的網頁連結</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <p className="text-sm font-medium text-primary-600 dark:text-primary-400">連結類型</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div 
                      className={`border-2 p-3 rounded-lg cursor-pointer flex items-center gap-2 ${linkType === 'website' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700'}`}
                      onClick={() => setLinkType('website')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 ${linkType === 'website' ? 'text-primary-500' : 'text-gray-500'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="2" y1="12" x2="22" y2="12"></line>
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                      </svg>
                      <span className="text-sm font-medium">一般網站</span>
                    </div>
                    
                    <div 
                      className={`border-2 p-3 rounded-lg cursor-pointer flex items-center gap-2 ${linkType === 'gdocs' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700'}`}
                      onClick={() => setLinkType('gdocs')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 ${linkType === 'gdocs' ? 'text-primary-500' : 'text-gray-500'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                      </svg>
                      <span className="text-sm font-medium">Google Docs</span>
                    </div>
                    
                    <div 
                      className={`border-2 p-3 rounded-lg cursor-pointer flex items-center gap-2 ${linkType === 'medium' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700'}`}
                      onClick={() => setLinkType('medium')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 ${linkType === 'medium' ? 'text-primary-500' : 'text-gray-500'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <path d="M21 15l-5-5L5 21"></path>
                      </svg>
                      <span className="text-sm font-medium">Medium</span>
                    </div>
                    
                    <div 
                      className={`border-2 p-3 rounded-lg cursor-pointer flex items-center gap-2 ${linkType === 'wechat' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700'}`}
                      onClick={() => setLinkType('wechat')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 ${linkType === 'wechat' ? 'text-primary-500' : 'text-gray-500'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        <line x1="9" y1="10" x2="9" y2="10"></line>
                        <line x1="12" y1="10" x2="12" y2="10"></line>
                        <line x1="15" y1="10" x2="15" y2="10"></line>
                      </svg>
                      <span className="text-sm font-medium">WeChat</span>
                    </div>
                  </div>
                  
                  <div className="mt-2 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-start gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mt-0.5 flex-shrink-0">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                      </svg>
                      <span>
                        選擇正確的連結類型可以幫助系統更準確地提取文章內容。例如，WeChat 和 Medium 等平台有特殊的內容結構，需要專門的處理方法。
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* 狀態通知 */}
            {renderStatusNotification()}

            {/* 處理按鈕 */}
            <div className="flex justify-end pt-2">
              <Button 
                onClick={handleProcess}
                disabled={
                  (selectedInputType === 'file' && !selectedFile) || 
                  (selectedInputType === 'link' && (!linkUrl || !!urlError)) || 
                  isProcessing
                }
                isLoading={isProcessing}
                startIcon={
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                  </svg>
                }
              >
                {selectedInputType === 'file' ? '開始處理' : '處理連結'}
              </Button>
            </div>
          </div>
        )}

        {/* 進度顯示 */}
        {activeTab === 'progress' && processState && (
          <div className="space-y-6">
            <ProgressDisplay state={processState} />
            
            {/* 狀態通知 */}
            {renderStatusNotification()}
            
            <div className="flex justify-between pt-2">
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
                {markdownUrl && (
                  <Button 
                    color="primary"
                    onClick={() => {
                      window.open(markdownUrl, '_blank', 'noopener,noreferrer');
                    }}
                    startIcon={
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    }
                  >
                    查看完整內容
                  </Button>
                )}
              </div>
            </div>
            
            {/* 狀態通知 */}
            {renderStatusNotification()}
            
            <div className="flex justify-between pt-2">
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
                處理新{selectedInputType === 'file' ? '文件' : '連結'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 