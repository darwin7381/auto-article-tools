'use client';

import { useState, useEffect } from 'react';
import { Section } from './Section';
import { Tabs, TabItem } from '../tabs/Tabs';
import { Button } from '../button/Button';
import { Input } from '../input/Input';
import { FileUpload } from '../file-upload/FileUpload';
import { useProcessing } from '@/context/ProcessingContext';
import useProcessingFlow, { ExtractResult, ProcessingResult } from '@/components/file-processing/useProcessingFlow';

export interface FileUploadSectionProps {
  className?: string;
}

export function FileUploadSection({ className = '' }: FileUploadSectionProps) {
  const { setStageError, processState } = useProcessing();
  
  const [selectedTab, setSelectedTab] = useState('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkType, setLinkType] = useState('website');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [processSuccess, setProcessSuccess] = useState(false);
  const [markdownUrl, setMarkdownUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // 階段處理結果回調
  const handleProcessSuccess = (result: ProcessingResult) => {
    setProcessSuccess(true);
    
    // 使用公開URL作為查看路徑
    if (result.publicUrl) {
      setMarkdownUrl(`/viewer/${encodeURIComponent(result.publicUrl)}`);
    } else if (result.markdownKey) {
      const key = result.markdownKey.split('/').pop() || '';
      setMarkdownUrl(`/viewer/processed/${key}`);
    }
  };
  
  const handleProcessError = (error: string, stage: string) => {
    console.error(`${stage}階段處理錯誤:`, error);
    setUploadError(error);
    
    // 如果是AI處理階段錯誤，仍然標記為部分成功
    if (stage === 'process') {
      setProcessSuccess(true);
    }
  };
  
  const handleStageComplete = (stage: string, result: ExtractResult | Record<string, unknown>) => {
    console.log(`${stage}階段完成:`, result);
    
    // 如果是extract階段，且處理AI階段失敗，使用extract結果作為fallback
    if (stage === 'extract' && 'publicUrl' in result) {
      const extractResult = result as ExtractResult;
      if (extractResult.publicUrl) {
        setMarkdownUrl(`/viewer/${encodeURIComponent(extractResult.publicUrl)}`);
      } else if (extractResult.markdownKey) {
        const key = extractResult.markdownKey.split('/').pop() || '';
        setMarkdownUrl(`/viewer/processed/${key}`);
      }
    }
  };
  
  // 初始化統一處理流程管理器
  const processingFlow = useProcessingFlow({
    onProcessSuccess: handleProcessSuccess,
    onProcessError: handleProcessError,
    onStageComplete: handleStageComplete,
    setIsProcessing,
    setUploadSuccess,
    setUploadError,
    setIsUploading
  });
  
  // 清理資源
  useEffect(() => {
    return () => {
      processingFlow.cleanup();
    };
  }, [processingFlow]);

  // 處理文件表單提交
  const handleUpload = async (): Promise<void> => {
    if (isUploading || isProcessing) return;
    
    // 重置處理狀態
    setUploadError(null);
    setProcessSuccess(false);
    setMarkdownUrl(null);
    
    try {
      if (selectedTab === 'file' && selectedFile) {
        // 使用統一流程處理文件
        await processingFlow.processFile(selectedFile);
      } else if (selectedTab === 'link' && linkUrl) {
        // 使用統一流程處理URL
        await processingFlow.processUrl(linkUrl, linkType);
      } else {
        setUploadError(selectedTab === 'file' ? '請選擇要上傳的文件' : '請輸入有效的連結');
      }
    } catch (error) {
      console.error('處理錯誤:', error);
      setUploadError(error instanceof Error ? error.message : '處理失敗，請稍後重試');
      
      // 設置錯誤狀態
      const currentStage = processState?.currentStage || 'upload';
      setStageError(currentStage, error instanceof Error ? error.message : '處理失敗，請稍後重試');
    }
  };

  const handleFileChange = (file: File) => {
    setSelectedFile(file);
    setUploadError(null);
    setUploadSuccess(false);
    setProcessSuccess(false);
    setMarkdownUrl(null);
  };

  const handleReset = () => {
    if (selectedTab === 'file') {
      setSelectedFile(null);
      setUploadError(null);
      setUploadSuccess(false);
      setProcessSuccess(false);
      setMarkdownUrl(null);
    } else {
      setLinkUrl('');
      setLinkType('website');
      setUrlError(null);
    }
  };

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      setUrlError(null);
      return true;
    } catch {
      setUrlError('請輸入有效的URL');
      return false;
    }
  };

  const handleLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLinkUrl(e.target.value);
    if (e.target.value) {
      const isValid = validateUrl(e.target.value);
      if (isValid) {
        // 自動檢測URL類型
        detectUrlType(e.target.value);
      }
    } else {
      setUrlError(null);
    }
  };

  // 添加URL類型自動檢測功能
  const detectUrlType = (url: string) => {
    try {
      // 僅檢查URL有效性，不需要urlObj變量
      new URL(url);
      
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

  // 定義Tab項
  const tabItems: TabItem[] = [
    {
      id: "file",
      label: (
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
          上傳文件
        </div>
      ),
      content: (
        <div className="w-full py-6 space-y-6">
          <FileUpload
            selectedFile={selectedFile}
            onFileChange={handleFileChange}
            onReset={selectedFile ? handleReset : undefined}
          />
          
          {uploadError && (
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-800/30">
              <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                {uploadError}
              </p>
            </div>
          )}
          
          {uploadSuccess && !processSuccess && (
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-800/30">
              <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                文件上傳成功，正在處理中...
              </p>
            </div>
          )}
          
          {processSuccess && (
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-800/30">
              <div className="flex justify-between items-center">
                <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  文件處理完成，已生成Markdown檔案
                </p>
                {markdownUrl && (
                  <a 
                    href={markdownUrl.startsWith('/viewer/') ? markdownUrl : `/viewer/${encodeURIComponent(markdownUrl)}`} 
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
          )}
        </div>
      )
    },
    {
      id: "link",
      label: (
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
          </svg>
          輸入連結
        </div>
      ),
      content: (
        <div className="w-full py-6 space-y-6">
          <div className="max-w-full">
            <Input
              label="文章連結"
              type="url"
              placeholder="請輸入文章URL，例如：https://example.com/article"
              value={linkUrl}
              onChange={handleLinkChange}
              isInvalid={!!urlError}
              errorMessage={urlError}
              description="輸入包含文章內容的網頁連結"
              isClearable
              startContent={
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                </svg>
              }
            />
          </div>
          
          {uploadError && selectedTab === 'link' && (
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-800/30">
              <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                {uploadError}
              </p>
            </div>
          )}
          
          {uploadSuccess && selectedTab === 'link' && (
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-800/30">
              {!processSuccess ? (
                <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  連結處理中，請稍等...
                </p>
              ) : (
                <div className="flex justify-between items-center">
                  <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    連結處理完成，已生成Markdown檔案
                  </p>
                  {markdownUrl && (
                    <a 
                      href={markdownUrl.startsWith('/viewer/') ? markdownUrl : `/viewer/${encodeURIComponent(markdownUrl)}`} 
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
              )}
            </div>
          )}
          
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
      )
    }
  ];

  const footerActions = (
    <div className="flex justify-end gap-3">
      <Button 
        color="primary" 
        variant="flat"
        onClick={handleReset}
      >
        重置
      </Button>
      <Button 
        color="primary" 
        onClick={handleUpload}
        disabled={(selectedTab === 'file' && !selectedFile) || (selectedTab === 'link' && !linkUrl) || isProcessing}
        isLoading={isProcessing}
        startIcon={
          !isProcessing && (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
          )
        }
      >
        {selectedTab === 'file' ? '上傳並處理' : '處理連結'}
      </Button>
    </div>
  );

  return (
    <Section
      id="upload-section"
      title="文件輸入"
      description="選擇上傳文件或輸入文章連結"
      footer={footerActions}
      className={className}
    >
      <Tabs 
        items={tabItems}
        selectedKey={selectedTab}
        onSelectionChange={(key) => setSelectedTab(key.toString())}
      />
    </Section>
  );
} 