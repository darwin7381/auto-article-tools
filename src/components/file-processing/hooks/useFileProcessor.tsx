'use client';

import { useState } from 'react';
import { useProcessing } from '@/context/ProcessingContext';
import useProcessingFlow, { ExtractResult } from '../useProcessingFlow';
import { ProcessingResult as BaseProcessingResult } from '../useAiProcessingStage';

// 擴展ProcessingResult類型以包含markdownContent和wordpressParams
export interface ExtendedProcessingResult extends BaseProcessingResult {
  markdownContent?: string;
  publicUrl?: string;
  wordpressParams?: {
    title: string;
    content: string;
    excerpt?: string;
    slug?: string;
    categories?: Array<{ id: number }>;
    tags?: Array<{ id: number }>;
  };
  [key: string]: unknown; // 添加索引簽名，使其與StageResult兼容
}

export interface FileProcessorOptions {
  onActiveTabChange: (tab: 'upload' | 'initial-process' | 'advanced-process' | 'result') => void;
}

export default function useFileProcessor(options: FileProcessorOptions) {
  const { onActiveTabChange } = options;
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtendedProcessingResult | null>(null);
  const [selectedInputType, setSelectedInputType] = useState<'file' | 'link'>('file');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkType, setLinkType] = useState('website');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [markdownUrl, setMarkdownUrl] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [processSuccess, setProcessSuccess] = useState(false);
  
  // 獲取處理上下文
  const { 
    resetProcessState, 
    saveStageResult,
    updateProcessingParams
  } = useProcessing();
  
  // 處理流程hook
  const { processFile, processUrl, cleanup } = useProcessingFlow({
    onProcessSuccess: (processResult) => {
      // 將處理結果轉換為擴展類型
      const extendedResult = processResult as ExtendedProcessingResult;
      setResult(extendedResult);
      setProcessSuccess(true);
      setIsProcessing(false); // 确保处理状态重置
      
      // 保存最終處理結果
      saveStageResult('complete', extendedResult);
      
      // 設置Markdown URL用於預覽
      if (extendedResult.publicUrl) {
        setMarkdownUrl(`/viewer/${encodeURIComponent(extendedResult.publicUrl)}?view=markdown`);
      } else if (extendedResult.markdownKey) {
        const key = extendedResult.markdownKey.split('/').pop() || '';
        setMarkdownUrl(`/viewer/processed/${key}?view=markdown`);
      }
      
      onActiveTabChange('result');
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
      
      // 保存階段結果到上下文
      saveStageResult(stage, result);
      
      // 當第一個階段完成時，自動切換到進度頁面
      if (stage === 'upload') {
        setUploadSuccess(true);
        onActiveTabChange('initial-process');
      }
      
      // 當初步處理階段的process完成時，切換到後期處理頁面
      if (stage === 'process') {
        onActiveTabChange('advanced-process');
      }
      
      // 如果是extract階段，且有publicUrl或markdownKey，提前設置預覽URL
      if (stage === 'extract' && 'publicUrl' in result) {
        const extractResult = result as ExtractResult;
        if (extractResult.publicUrl) {
          setMarkdownUrl(`/viewer/${encodeURIComponent(extractResult.publicUrl)}?view=markdown`);
        } else if (extractResult.markdownKey) {
          const key = extractResult.markdownKey.split('/').pop() || '';
          setMarkdownUrl(`/viewer/processed/${key}?view=markdown`);
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
    onActiveTabChange('upload');
    updateProcessingParams({ mode: 'auto' }); // 重置處理模式為自動
    resetProcessState();
    setIsProcessing(false); // 確保處理狀態被重置
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
    
    // 如果已處理完成，需要重置狀態以啟動新的處理流程
    if (processSuccess) {
      setIsProcessing(false);
      setProcessSuccess(false);
      setResult(null);
      setMarkdownUrl(null);
      resetProcessState();
    }
    
    // 重置處理狀態
    setUploadError(null);
    
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
  
  return {
    selectedFile,
    isProcessing,
    uploadError,
    result,
    markdownUrl,
    uploadSuccess,
    processSuccess,
    selectedInputType, 
    setSelectedInputType,
    linkUrl,
    linkType,
    setLinkType,
    urlError,
    handleReset,
    handleFileChange,
    handleLinkChange,
    handleProcess,
    cleanup
  };
} 