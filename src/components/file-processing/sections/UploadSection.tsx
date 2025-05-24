'use client';

import React from 'react';
import { FileUpload } from '@/components/ui/file-upload/FileUpload';
import { Button } from '@/components/ui/button/Button';
import ProcessingModeSelector from '@/components/ui/ProcessingModeSelector';
import ArticleTypeSelector from '@/components/ui/ArticleTypeSelector';
import { ArticleType, AdvancedArticleSettings } from '@/types/article-formatting';

interface UploadSectionProps {
  selectedFile: File | null;
  onFileChange: (file: File) => void;
  selectedInputType: 'file' | 'link';
  setSelectedInputType: (type: 'file' | 'link') => void;
  linkUrl: string;
  onLinkChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  linkType: string;
  setLinkType: (type: string) => void;
  urlError: string | null;
  uploadError: string | null;
  uploadSuccess: boolean;
  processSuccess: boolean;
  isProcessing: boolean;
  onProcess: () => void;
  isAutoMode: boolean;
  onModeChange: (isAuto: boolean) => void;
  selectedArticleType: ArticleType;
  onArticleTypeChange: (type: ArticleType) => void;
  advancedSettings: AdvancedArticleSettings;
  onAdvancedSettingsChange: (settings: AdvancedArticleSettings) => void;
}

export default function UploadSection({
  selectedFile,
  onFileChange,
  selectedInputType,
  setSelectedInputType,
  linkUrl,
  onLinkChange,
  linkType,
  setLinkType,
  urlError,
  uploadError,
  uploadSuccess,
  processSuccess,
  isProcessing,
  onProcess,
  isAutoMode,
  onModeChange,
  selectedArticleType,
  onArticleTypeChange,
  advancedSettings,
  onAdvancedSettingsChange
}: UploadSectionProps) {
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

  return (
    <div className="space-y-6">
      {/* 處理模式選擇 */}
      <ProcessingModeSelector 
        isAutoMode={isAutoMode} 
        onChange={onModeChange} 
      />
      
      {/* 文稿類型選擇 */}
      <ArticleTypeSelector
        selectedType={selectedArticleType}
        onTypeChange={onArticleTypeChange}
        advancedSettings={advancedSettings}
        onAdvancedSettingsChange={onAdvancedSettingsChange}
      />
      
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
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 0-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
          </svg>
          輸入連結
        </button>
      </div>
      
      {/* 文件上傳 */}
      {selectedInputType === 'file' && (
        <FileUpload
          onFileChange={onFileChange}
          selectedFile={selectedFile}
          onReset={() => onFileChange(null as unknown as File)}
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
                  onChange={onLinkChange}
                  className={`w-full pl-10 pr-4 py-2.5 border ${urlError ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'} rounded-md bg-default-50 dark:bg-default-50/10 hover:bg-default-100 dark:hover:bg-default-100/10 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent`}
                />
                {linkUrl && (
                  <button 
                    type="button" 
                    onClick={() => {
                      onLinkChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>);
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
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10z"></path>
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
          onClick={onProcess}
          disabled={
            (selectedInputType === 'file' && !selectedFile) || 
            (selectedInputType === 'link' && (!linkUrl || !!urlError)) || 
            isProcessing
          }
          isLoading={false}
          color={processSuccess ? "secondary" : "primary"}
          startIcon={
            isProcessing ? (
              <svg className="animate-spin h-5 w-5 mr-1 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : processSuccess ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
              </svg>
            )
          }
        >
          {isProcessing ? '處理中...' : (processSuccess ? '重新處理' : (selectedInputType === 'file' ? '開始處理' : '處理連結'))}
        </Button>
      </div>
    </div>
  );
} 