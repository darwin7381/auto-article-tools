'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FileUpload } from '../ui/file-upload/FileUpload';
import ProgressDisplay from '../progress/ProgressDisplay';
import useProcessingFlow, { ExtractResult } from './useProcessingFlow';
import { ProcessingResult as BaseProcessingResult } from './useAiProcessingStage';
import { useProcessing } from '@/context/ProcessingContext';
import { Button } from '../ui/button/Button';
import EditorIntegration from '@/components/ui/editor-integration';
import WordPressSettings from '@/components/ui/wordpress-settings';
import { useSimplifiedWPIntegration } from '@/hooks/useSimplifiedWPIntegration';
import ProcessingModeSelector from '@/components/ui/ProcessingModeSelector';
import ArticleTypeSelector from '@/components/ui/ArticleTypeSelector';
import { ArticleType, ArticleClassification, AdvancedArticleSettings } from '@/types/article-formatting';
import { getArticleTemplate, DefaultAdvancedSettings } from '@/config/article-templates';

// 擴展ProcessingResult類型以包含markdownContent和wordpressParams
interface ExtendedProcessingResult extends BaseProcessingResult {
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

// 定義階段結果視圖類型
interface StageView {
  id: string;
  result: Record<string, unknown>;
}

// 替換舊的上稿準備階段組件
const PrepPublishingComponent = ({ fileId, htmlContent, markdownUrl, onContentChange, onContinue }: { 
  fileId: string, 
  htmlContent?: string,
  markdownUrl?: string, 
  onContentChange?: (content: string) => void,
  onContinue?: () => void // 新增：繼續處理的回調函數
}) => {
  return (
    <div className="mt-2 pl-8 pr-0">
      <EditorIntegration 
        fileId={fileId}
        initialHtml={htmlContent || ''}
        markdownUrl={markdownUrl}
        onContentSave={onContentChange}
        onContinue={onContinue} // 傳遞繼續處理回調
      />
    </div>
  );
};

// 替換舊的WordPress發布設置組件
const WordPressPublishComponent = ({ 
  htmlContent, 
  wordpressParams,
  processingParams,
  processState,
  completeStage
}: { 
  htmlContent?: string, 
  wordpressParams?: {
    title?: string;
    content?: string;
    excerpt?: string;
    slug?: string;
    categories?: Array<{ id: number }>;
    tags?: Array<{ id: number }>;
  },
  processingParams?: {
    mode: 'auto' | 'manual',
    defaultPublishStatus?: 'draft' | 'pending' | 'publish' | 'private' | 'future',
    defaultAuthorId?: number
  },
  processState?: {
    currentStage?: string;
    stages?: Array<{id: string; status: string; progress: number}>;
  },  // 更精確的processState類型
  completeStage?: (stageId: string, message?: string) => void  // 添加completeStage函數參數
}) => {
  // 確保htmlContent有值且為字符串
  const sanitizedHtmlContent = typeof htmlContent === 'string' && htmlContent.trim() ? 
    htmlContent : '<p>無內容，請編輯文章內容後再發布</p>';
  
  const { 
    isSubmitting, 
    publishResult, 
    publishToWordPress 
  } = useSimplifiedWPIntegration({ 
    initialContent: sanitizedHtmlContent,
    debug: true // 啟用調試模式
  });
  
  // 輸出HTML內容信息（僅在開發模式）
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log("WordPressPublishComponent HTML內容信息:", {
        hasContent: !!htmlContent,
        contentLength: htmlContent?.length || 0,
        sanitizedLength: sanitizedHtmlContent.length
      });
    }
  }, [htmlContent, sanitizedHtmlContent]);
  
  // 提取HTML內容中的H1標題
  const extractH1Title = useCallback((html: string): string => {
    try {
      // 使用正則表達式提取第一個H1標籤內容
      const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
      if (h1Match && h1Match[1]) {
        // 去除可能的HTML標籤，只保留文本
        const h1Content = h1Match[1].replace(/<[^>]+>/g, '').trim();
        console.log("從編輯器內容中提取H1標題:", h1Content);
        return h1Content;
      }
    } catch (error) {
      console.error("提取H1標題出錯:", error);
    }
    return '';
  }, []);

  // 提取HTML內容中的第一張圖片URL
  const extractFeatureImage = useCallback((html: string): string => {
    try {
      // 使用正則表達式提取第一個img標籤的src屬性
      const imgMatch = html.match(/<img[^>]+src="([^">]+)"/i);
      if (imgMatch && imgMatch[1]) {
        const imgSrc = imgMatch[1].trim();
        console.log("從編輯器內容中提取首圖URL:", imgSrc);
        return imgSrc;
      }
    } catch (error) {
      console.error("提取首圖URL出錯:", error);
    }
    return '';
  }, []);

  // 當HTML內容加載時立即提取並使用標題與特色圖片
  useEffect(() => {
    if (sanitizedHtmlContent) {
      // 提取並設置標題
      const extractedTitle = extractH1Title(sanitizedHtmlContent);
      if (extractedTitle) {
        setFormData(prev => ({
          ...prev,
          title: extractedTitle
        }));
        console.log("從編輯器提取的標題已設置:", extractedTitle);
      }
      
      // 提取並設置特色圖片
      const extractedImageUrl = extractFeatureImage(sanitizedHtmlContent);
      if (extractedImageUrl) {
        setFormData(prev => ({
          ...prev,
          featured_media: extractedImageUrl
        }));
        console.log("從編輯器提取的特色圖片已設置:", extractedImageUrl);
      }
    }
  }, [sanitizedHtmlContent, extractH1Title, extractFeatureImage]);

  // 當WordPress參數變更時更新表單數據
  useEffect(() => {
    // 輸出詳細的調試信息
    console.log("WordPress參數狀態:", {
      有參數: !!wordpressParams,
      參數類型: wordpressParams ? typeof wordpressParams : 'undefined'
    });
    
    if (wordpressParams) {
      try {
        // 處理分類，確保是數組
        let categoriesStr = '';
        if (wordpressParams.categories && Array.isArray(wordpressParams.categories)) {
          categoriesStr = wordpressParams.categories
            .map(cat => cat && typeof cat === 'object' && 'id' in cat ? cat.id : '')
            .filter(Boolean)
            .join(',');
        }
        
        // 處理標籤，確保是數組
        let tagsStr = '';
        if (wordpressParams.tags && Array.isArray(wordpressParams.tags)) {
          tagsStr = wordpressParams.tags
            .map(tag => tag && typeof tag === 'object' && 'id' in tag ? tag.id : '')
            .filter(Boolean)
            .join(',');
        }
        
        // 更新表單數據（標題已經由前面的useEffect從編輯器提取處理好了）
        setFormData(prev => ({
          ...prev,
          // 注意：不再設置title，因為它已經從編輯器內容中提取並設置了
          categories: categoriesStr || prev.categories,
          tags: tagsStr || prev.tags,
          slug: wordpressParams.slug || prev.slug
        }));
        
        console.log("表單數據已更新 (分類和標籤)");
      } catch (error) {
        console.error("解析WordPress參數時出錯:", error);
      }
    }
  }, [wordpressParams]);

  // 當處理參數中有預設作者ID時，自動設置到表單
  useEffect(() => {
    if (processingParams?.defaultAuthorId) {
      setFormData(prev => ({
        ...prev,
        author: processingParams.defaultAuthorId!.toString()
      }));
      console.log("自動設置作者ID:", processingParams.defaultAuthorId);
    }
  }, [processingParams?.defaultAuthorId]);
  
  const [isExpanded, setIsExpanded] = useState(false);
  
  // 表單數據狀態 - 先使用空值初始化，在useEffect中再更新
  const [formData, setFormData] = useState({
    title: '',
    categories: '',
    tags: '',
    status: (processingParams?.defaultPublishStatus || 'draft') as 'publish' | 'draft' | 'pending' | 'future' | 'private',
    isPrivate: false,
    slug: '',
    author: '',
    featured_media: '',
    date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16) // 預設為明天的當前時間
  });
  
  // 當processingParams.defaultPublishStatus變化時更新formData.status
  useEffect(() => {
    if (processingParams?.defaultPublishStatus) {
      setFormData(prev => ({
        ...prev,
        status: processingParams.defaultPublishStatus as 'draft' | 'pending' | 'publish' | 'private' | 'future'
      }));
      console.log("更新表單發佈狀態為:", processingParams.defaultPublishStatus);
    }
  }, [processingParams?.defaultPublishStatus]);
  
  // 發布處理函數
  const handlePublish = useCallback(() => {
    if (!formData.title.trim()) {
      alert('請輸入文章標題');
      return;
    }
    
    // 檢查定時發布時必須填寫日期
    if (formData.status === 'future' && !formData.date) {
      alert('選擇定時發布時必須設定發布日期');
      return;
    }
    
    // 使用publishToWordPress發布，內容將自動使用initialContent
    publishToWordPress(formData);
  }, [formData, publishToWordPress]);
  
  // 顯示成功或錯誤訊息
  const renderPublishStatus = () => {
    if (publishResult?.success) {
      // 删除手动DOM更新代码，由ProcessingContext管理状态
      
      return (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="text-green-700 font-medium">發布成功！文章已發送到WordPress</p>
          </div>
          
          {publishResult.postUrl && (
            <a 
              href={publishResult.postUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center text-sm text-blue-600 hover:underline"
            >
              <span>在WordPress中查看文章</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
              </svg>
            </a>
          )}
        </div>
      );
    }
    
    if (publishResult?.error) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-red-700 font-medium">發布失敗</p>
              <p className="text-red-600 text-sm mt-1">{publishResult.error}</p>
              <p className="text-xs text-gray-500 mt-2">
                所有WordPress認證和API操作都在服務端進行，您的帳號和密碼不會暴露。
                如持續發生錯誤，請聯繫系統管理員確認伺服器配置。
              </p>
            </div>
          </div>
        </div>
      );
    }
    
    return null;
  };

  // 上架新聞階段的自動確認邏輯
  useEffect(() => {
    // 僅在自動模式下執行
    if (processingParams?.mode === 'auto' && 
        !isSubmitting && 
        !publishResult) {
      
      console.log("自動模式檢查條件:", {
        mode: processingParams?.mode,
        isSubmitting,
        hasPublishResult: !!publishResult,
        currentTitle: formData.title.trim(),
        titleLength: formData.title.length
      });
      
      // 自動點擊發布按鈕 - 延長延遲時間確保標題提取完成
      const autoPublishTimer = setTimeout(() => {
        console.log("自動模式：準備執行上架新聞階段自動確認");
        console.log("當前formData狀態:", {
          title: formData.title,
          titleTrimmed: formData.title.trim(),
          hasTitle: !!formData.title.trim(),
          author: formData.author,
          status: formData.status
        });
        
        if (formData.title.trim()) {
          console.log("自動模式：上架新聞階段自動確認 - 標題檢查通過");
          
          // 設置預設發佈狀態
          if (processingParams?.defaultPublishStatus) {
            setFormData(prev => ({
              ...prev,
              status: processingParams.defaultPublishStatus as 'draft' | 'pending' | 'publish' | 'private' | 'future'
            }));
            console.log("自動設置發布狀態為:", processingParams.defaultPublishStatus);
          }
          
          // 執行發布
          console.log("自動模式：開始執行 handlePublish");
          handlePublish();
        } else {
          console.warn("自動發布失敗：文章標題為空", {
            originalTitle: formData.title,
            titleLength: formData.title.length,
            sanitizedHtmlContentLength: sanitizedHtmlContent.length
          });
        }
      }, 3000); // 延長到3秒，確保所有useEffect完成
      
      // 清理定時器
      return () => {
        clearTimeout(autoPublishTimer);
      };
    }
    
    // 當發布完成時，確保狀態更新
    if (publishResult?.success && processState?.currentStage === 'publish-news' && completeStage) {
      // 使用setTimeout確保狀態更新在渲染週期之外
      setTimeout(() => {
        console.log("自動模式：發布成功，完成上架新聞階段");
        // 完成上架新聞階段
        completeStage('publish-news', '已成功發布到WordPress');
      }, 500);
    }
  }, [processingParams?.mode, processingParams?.defaultPublishStatus, isSubmitting, publishResult, formData.title, formData.author, formData.status, processState?.currentStage, completeStage, handlePublish, sanitizedHtmlContent]);

  return (
    <div className="mt-2 pl-8 pr-0">
      {renderPublishStatus()}
      
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
                isExpanded 
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' 
                  : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3,3v18h18 M3,15h6c0.83,0,1.5-0.67,1.5-1.5v0c0-0.83-0.67-1.5-1.5-1.5H7v-3h2c0.83,0,1.5-0.67,1.5-1.5v0 c0-0.83-0.67-1.5-1.5-1.5H3" />
                <path d="M16,3h5v5 M21,3L3,21" />
              </svg>
              <span>{isExpanded ? '收起發布表單' : '配置WordPress發布設定'}</span>
            </button>
          </div>
          
          <Button
            onClick={handlePublish}
            disabled={isSubmitting || !formData.title.trim()}
            className="flex items-center gap-1 px-3 py-1.5 text-sm"
            color="primary"
            startIcon={
              isSubmitting ? (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 74 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12.75 15l3-3m0 0l-3-3m3 3h-7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )
            }
          >
            {isSubmitting ? '發布中...' : '發布到WordPress'}
          </Button>
        </div>
        
        {isExpanded && (
          <div className="bg-background/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <WordPressSettings
              formData={formData}
              onChange={setFormData}
              error={publishResult?.error}
              extractedParams={wordpressParams}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default function IntegratedFileProcessor() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtendedProcessingResult | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'initial-process' | 'advanced-process' | 'result'>('upload');
  const [selectedInputType, setSelectedInputType] = useState<'file' | 'link'>('file');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkType, setLinkType] = useState('website');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [markdownUrl, setMarkdownUrl] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [processSuccess, setProcessSuccess] = useState(false);
  // 處理模式狀態 - 預設為自動模式
  const [isAutoMode, setIsAutoMode] = useState(true);
  // 文稿類型狀態 - 預設為廣編稿
  const [selectedArticleType, setSelectedArticleType] = useState<ArticleType>('sponsored');
  // 進階設定狀態 - 預設為廣編稿的設定
  const [advancedSettings, setAdvancedSettings] = useState<AdvancedArticleSettings>(
    DefaultAdvancedSettings['sponsored']
  );
  
  // 階段查看結果
  const [viewingStage, setViewingStage] = useState<StageView | null>(null);
  
  // 獲取處理上下文
  const { 
    processState, 
    resetProcessState, 
    saveStageResult, 
    updateStageProgress, 
    updateProcessState,
    processingParams,
    updateProcessingParams,
    moveToNextStage,
    completeStage,
    setArticleClassification
  } = useProcessing();

  // 更新處理模式
  const handleModeChange = useCallback((isAuto: boolean) => {
    setIsAutoMode(isAuto);
    updateProcessingParams({ 
      mode: isAuto ? 'auto' : 'manual' 
    });
  }, [updateProcessingParams]);
  
  // 更新文稿類型
  const handleArticleTypeChange = useCallback((articleType: ArticleType) => {
    setSelectedArticleType(articleType);
    
    // 獲取對應的模板配置
    const template = getArticleTemplate(articleType);
    
    // 更新處理參數，包括作者ID
    updateProcessingParams({ 
      articleType,
      defaultAuthorId: template.authorId // 添加預設作者ID
    });
    
    // 創建文稿分類對象並設置到context
    const classification: ArticleClassification = {
      articleType,
      author: template.author as 'BTEditor' | 'BTVerse' | 'custom',
      authorDisplayName: template.authorDisplayName || undefined,
      authorId: template.authorId, // 設置WordPress作者ID
      requiresAdTemplate: articleType === 'sponsored',
      templateVersion: 'v1.0',
      timestamp: Date.now(),
      advancedSettings // 包含進階設定
    };
    
    setArticleClassification(classification);
  }, [updateProcessingParams, setArticleClassification, advancedSettings]);
  
  // 處理進階設定變更
  const handleAdvancedSettingsChange = useCallback((settings: AdvancedArticleSettings) => {
    setAdvancedSettings(settings);
    
    // 更新 context 中的分類信息
    const template = getArticleTemplate(selectedArticleType);
    const classification: ArticleClassification = {
      articleType: selectedArticleType,
      author: template.author as 'BTEditor' | 'BTVerse' | 'custom',
      authorDisplayName: template.authorDisplayName || undefined,
      authorId: template.authorId,
      requiresAdTemplate: selectedArticleType === 'sponsored',
      templateVersion: 'v1.0',
      timestamp: Date.now(),
      advancedSettings: settings
    };
    
    setArticleClassification(classification);
  }, [selectedArticleType, setArticleClassification]);
  
  // 更新發佈狀態
  const handlePublishStatusChange = useCallback((status: 'draft' | 'pending' | 'publish' | 'private' | 'future') => {
    updateProcessingParams({ 
      defaultPublishStatus: status 
    });
  }, [updateProcessingParams]);
  
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
      
      // 保存階段結果到上下文
      saveStageResult(stage, result);
      
      // 當第一個階段完成時，自動切換到進度頁面
      if (stage === 'upload' && activeTab === 'upload') {
        setUploadSuccess(true);
        setActiveTab('initial-process');
      }
      
      // 當初步處理階段的process完成時，切換到後期處理頁面
      if (stage === 'process' && activeTab === 'initial-process') {
        setActiveTab('advanced-process');
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

  // 組件卸載時清理資源
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // 初始化文稿分類設定
  useEffect(() => {
    // 組件初始化時設置預設的文稿分類
    const template = getArticleTemplate(selectedArticleType);
    const classification: ArticleClassification = {
      articleType: selectedArticleType,
      author: template.author as 'BTEditor' | 'BTVerse' | 'custom',
      authorDisplayName: template.authorDisplayName || undefined,
      authorId: template.authorId,
      requiresAdTemplate: selectedArticleType === 'sponsored',
      templateVersion: 'v1.0',
      timestamp: Date.now(),
      advancedSettings
    };
    
    setArticleClassification(classification);
    console.log('初始化文稿分類設定:', classification);
  }, [selectedArticleType, advancedSettings, setArticleClassification]); // 添加正確的依賴項

  // 用於初始化上稿準備階段狀態的Effect
  useEffect(() => {
    if (processState && 
        activeTab === 'result' && 
        processState.stages.find(s => s.id === 'prep-publish')?.status === 'pending') {
      // 將上稿準備階段狀態設置為processing
      setTimeout(() => {
        // 先設置當前階段為上稿準備
        const prepPublishStage = processState.stages.find(s => s.id === 'prep-publish');
        if (prepPublishStage) {
          // 更新整體進度狀態為處理中
          updateProcessState({
            currentStage: 'prep-publish',
            overall: {
              ...processState.overall,
              status: 'processing'
            }
          });
          // 然後更新階段進度
          updateStageProgress('prep-publish', 60, '上稿準備中，請編輯內容...');
        }
      }, 0);
    }
  }, [processState, activeTab, updateStageProgress, updateProcessState]);

  // 上稿準備階段的自動確認邏輯
  useEffect(() => {
    // 僅在自動模式下執行
    if (processingParams?.mode === 'auto' && 
        processState?.currentStage === 'prep-publish' && 
        processState.stages.find(s => s.id === 'prep-publish')?.status === 'processing') {
      
      // 自動點擊確認按鈕，進入下一階段
      setTimeout(() => {
        console.log("自動模式：上稿準備階段自動確認");
        
        // 更新狀態 - 明確將上稿準備設為完成
        const updatedStages = processState.stages.map(s => 
          s.id === 'prep-publish' 
            ? { ...s, status: 'completed' as const, progress: 100, message: '上稿準備已自動完成' }
            : s.id === 'publish-news'
              ? { ...s, status: 'processing' as const, progress: 10, message: '準備WordPress發布設定...' }
              : s
        );
        
        // 先更新上稿準備階段狀態為已完成
        updateProcessState({
          stages: updatedStages
        });
        
        // 完成當前階段
        completeStage('prep-publish', '上稿準備已自動完成');
        
        // 然後移動到下一階段
        moveToNextStage();
        
        // 最後確保狀態被正確設置
        updateProcessState({
          currentStage: 'publish-news',
          stages: updatedStages
        });
      }, 1000); // 短暫延遲，讓用戶看到階段完成
    }
  }, [processingParams?.mode, processState?.currentStage, processState?.stages, moveToNextStage, updateProcessState, completeStage]);

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
    setIsAutoMode(true);
    updateProcessingParams({ mode: 'auto' }); // 重置處理模式
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
    
    // 重置處理狀態
    setUploadError(null);
    
    // 準備文稿分類（在重置前準備好）
    const template = getArticleTemplate(selectedArticleType);
    const classification: ArticleClassification = {
      articleType: selectedArticleType,
      author: template.author as 'BTEditor' | 'BTVerse' | 'custom',
      authorDisplayName: template.authorDisplayName || undefined,
      authorId: template.authorId,
      requiresAdTemplate: selectedArticleType === 'sponsored',
      templateVersion: 'v1.0',
      timestamp: Date.now(),
      advancedSettings
    };
    
    // 如果已處理完成，需要重置狀態以啟動新的處理流程
    if (processSuccess) {
      setIsProcessing(false);
      setProcessSuccess(false);
      setResult(null);
      setMarkdownUrl(null);
      resetProcessState();
      
      // 🔧 修復競態條件：立即重新設置文稿分類，而不是使用 setTimeout
      // 確保在重置後文稿分類立即可用，避免進階格式化階段找不到分類信息
      setArticleClassification(classification);
      console.log('重置後立即重新設置文稿分類:', classification);
    } else {
      // 正常情況下設置文稿分類
      setArticleClassification(classification);
      console.log('處理開始前設置文稿分類:', classification);
    }
    
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

  // 處理階段查看
  const handleViewStage = (stageId: string, stageResult?: Record<string, unknown>) => {
    if (!stageResult) return;
    
    // 獲取階段查看URL
    const viewerUrl = getStageViewerUrl(stageId, stageResult);
    if (viewerUrl) {
      // 直接在新窗口中打開
      window.open(viewerUrl, '_blank', 'noopener,noreferrer');
    }
  };
  
  // 獲取階段查看URL
  const getStageViewerUrl = (stageId: string, result: Record<string, unknown>): string | undefined => {
    if (stageId === 'extract' && result.markdownKey) {
      const key = String(result.markdownKey).split('/').pop() || '';
      return `/viewer/processed/${key}?view=markdown`;
    }
    
    if (stageId === 'process' && result.markdownKey) {
      const key = String(result.markdownKey).split('/').pop() || '';
      return `/viewer/processed/${key}?view=markdown`;
    }
    
    if (stageId === 'advanced-ai' && result.markdownKey) {
      const key = String(result.markdownKey).split('/').pop() || '';
      return `/viewer/processed/${key}?view=markdown`;
    }
    
    if (stageId === 'format-conversion' || stageId === 'copy-editing' || stageId === 'article-formatting') {
      // 如果有 HTML 文件鍵，直接使用 viewer 查看
      if (result.htmlKey) {
        const key = String(result.htmlKey).split('/').pop() || '';
        return `/viewer/processed/${key}?view=html`;
      }
      
      // 向後兼容舊版 API，通過 API 端點查看
      if (result.htmlUrl) {
        return `/api/processors/view-html?key=${encodeURIComponent(String(result.htmlUrl))}`;
      }
    }
    
    return undefined;
  };
  
  // 渲染階段結果查看對話框
  const renderStageViewDialog = () => {
    if (!viewingStage) return null;
    
    const { id, result } = viewingStage;
    
    // 簡單格式化結果，簡化顯示
    const formattedResult = formatStageResult(id, result);
    
    return (
      <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col">
          <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-800 p-4">
            <h3 className="text-lg font-semibold">
              {getStageTitle(id)} 處理結果
            </h3>
            <button 
              onClick={() => setViewingStage(null)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="關閉視窗"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="p-4 overflow-y-auto flex-1">
            {formattedResult}
          </div>
          
          <div className="border-t border-gray-200 dark:border-gray-800 p-4 flex justify-end">
            <Button
              onClick={() => setViewingStage(null)}
              variant="light"
            >
              關閉
            </Button>
            {(() => {
              const viewerUrl = getStageViewerUrl(id, result);
              return viewerUrl && (
              <Button
                onClick={() => {
                    if (viewerUrl) window.open(viewerUrl, '_blank', 'noopener,noreferrer');
                }}
                className="ml-2"
                color="primary"
                startIcon={
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
              >
                在新窗口中查看
              </Button>
              );
            })()}
          </div>
        </div>
      </div>
    );
  };
  
  // 獲取階段標題
  const getStageTitle = (stageId: string): string => {
    const stageMap: Record<string, string> = {
      'upload': '上傳文件',
      'extract': '提取內容',
      'process': 'AI 初步內容處理',
      'advanced-ai': 'PR writer處理',
      'format-conversion': '格式轉換',
      'copy-editing': 'AI上稿編修',
      'cover-image': '封面圖處理',
      'article-formatting': '進階格式化',
      'prep-publish': '上稿準備',
      'publish-news': '上架新聞',
      'complete': '處理完成'
    };
    
    return stageMap[stageId] || stageId;
  };
  
  // 格式化階段結果
  const formatStageResult = (stageId: string, result: Record<string, unknown>) => {
    if (stageId === 'extract' || stageId === 'process' || stageId === 'advanced-ai') {
      // 顯示Markdown內容預覽
      if (result.markdownContent && typeof result.markdownContent === 'string') {
        return (
          <div className="max-h-96 overflow-y-auto bg-gray-50 dark:bg-gray-900 rounded p-4 text-sm font-mono whitespace-pre-wrap">
            {result.markdownContent.slice(0, 1000)}
            {result.markdownContent.length > 1000 && '...'}
          </div>
        );
      }
      
      // 顯示其他資訊
      return (
        <div className="bg-gray-50 dark:bg-gray-900 rounded p-4">
          <pre className="whitespace-pre-wrap text-sm overflow-x-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      );
    }
    
    if (stageId === 'format-conversion' || stageId === 'copy-editing' || stageId === 'cover-image' || stageId === 'article-formatting') {
      // 顯示HTML內容預覽
      if (result.htmlContent && typeof result.htmlContent === 'string') {
        return (
          <div className="bg-gray-50 dark:bg-gray-900 rounded p-4">
            <div 
              className="max-h-96 overflow-y-auto" 
              dangerouslySetInnerHTML={{ __html: result.htmlContent.slice(0, 1000) + (result.htmlContent.length > 1000 ? '...' : '') }}
            />
          </div>
        );
      } else if (stageId === 'copy-editing' && result.adaptedContent && typeof result.adaptedContent === 'string') {
        // 如果是文稿編輯階段且有adaptedContent，則顯示adaptedContent
        return (
          <div className="bg-gray-50 dark:bg-gray-900 rounded p-4">
            <div 
              className="max-h-96 overflow-y-auto" 
              dangerouslySetInnerHTML={{ __html: result.adaptedContent.slice(0, 1000) + (result.adaptedContent.length > 1000 ? '...' : '') }}
            />
          </div>
        );
      } else if (stageId === 'article-formatting' && result.formattedContent && typeof result.formattedContent === 'string') {
        // 如果是進階格式化階段且有formattedContent，則顯示formattedContent
        return (
          <div className="bg-gray-50 dark:bg-gray-900 rounded p-4">
            <div 
              className="max-h-96 overflow-y-auto" 
              dangerouslySetInnerHTML={{ __html: result.formattedContent.slice(0, 1000) + (result.formattedContent.length > 1000 ? '...' : '') }}
            />
          </div>
        );
      }
    }
    
    // 默認顯示
    return (
      <div className="bg-gray-50 dark:bg-gray-900 rounded p-4">
        <pre className="whitespace-pre-wrap text-sm overflow-x-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      </div>
    );
  };

  // 渲染狀態通知欄
  const renderStatusNotification = () => {
    // 只顯示錯誤提示，因為上方的進度顯示已經足夠清楚
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

    // 移除成功狀態的冗餘提示，因為上方的階段進度顯示已經提供足夠清楚的信息
    return null;
  };

  return (
    <div className="w-full rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm">
      {/* 標籤式導航 */}
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex-1 py-3 px-4 text-sm font-medium ${
            activeTab === 'upload'
              ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          1. 文件上傳
        </button>
        <button
          onClick={() => processState && setActiveTab('initial-process')}
          className={`flex-1 py-3 px-4 text-sm font-medium ${
            activeTab === 'initial-process'
              ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          } ${!processState ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={!processState}
        >
          2. 初步處理
        </button>
        <button
          onClick={() => processState && setActiveTab('advanced-process')}
          className={`flex-1 py-3 px-4 text-sm font-medium ${
            activeTab === 'advanced-process'
              ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          } ${!processState ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={!processState}
        >
          3. 後期處理
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
          4. 上稿
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 0-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                </svg>
                輸入連結
              </button>
            </div>
            
            {/* 處理模式選擇 */}
            <ProcessingModeSelector 
              isAutoMode={isAutoMode} 
              defaultPublishStatus={processingParams?.defaultPublishStatus || 'draft'}
              onChange={handleModeChange} 
              onPublishStatusChange={handlePublishStatusChange}
            />
            
            {/* 文稿類型選擇 */}
            <ArticleTypeSelector
              selectedType={selectedArticleType}
              onTypeChange={handleArticleTypeChange}
              advancedSettings={advancedSettings}
              onAdvancedSettingsChange={handleAdvancedSettingsChange}
            />
            
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
                onClick={handleProcess}
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
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 74 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : processSuccess ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                  ) : uploadSuccess ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                    </svg>
                  )
                }
              >
                {isProcessing ? '處理中...' : (processSuccess ? '重新處理' : uploadSuccess ? '繼續處理' : (selectedInputType === 'file' ? '開始處理' : '處理連結'))}
              </Button>
            </div>
          </div>
        )}

        {/* 初步處理進度 */}
        {activeTab === 'initial-process' && processState && (
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
                  stages: ['advanced-ai', 'format-conversion', 'copy-editing', 'cover-image', 'article-formatting']
                },
                final: {
                  title: "上稿階段", 
                  stages: ['prep-publish', 'publish-news']
                }
              }}
              displayGroups={['initial']}
              onViewStage={handleViewStage}
            />
            
            {/* 狀態通知 */}
            {renderStatusNotification()}
            
            <div className="flex justify-between pt-2">
              <Button 
                variant="light"
                onClick={() => setActiveTab('upload')}
                startIcon={
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                  </svg>
                }
              >
                返回上傳
              </Button>
              
              {/* 如果初步處理完成，顯示前往後期處理按鈕 */}
              {processState.stages.find(s => s.id === 'process')?.status === 'completed' && (
                <Button 
                  onClick={() => setActiveTab('advanced-process')}
                  startIcon={
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                    </svg>
                  }
                >
                  前往後期處理
                </Button>
              )}
              
              {/* 顯示上傳成功狀態 */}
              {uploadSuccess && !processState.stages.find(s => s.id === 'process')?.status && (
                <div className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  上傳成功
                </div>
              )}
            </div>
          </div>
        )}

        {/* 後期處理進度 */}
        {activeTab === 'advanced-process' && processState && (
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
                  stages: ['advanced-ai', 'format-conversion', 'copy-editing', 'cover-image', 'article-formatting']
                },
                final: {
                  title: "上稿階段", 
                  stages: ['prep-publish', 'publish-news']
                }
              }}
              displayGroups={['advanced']}
              onViewStage={handleViewStage}
            />
            
            {/* 狀態通知 */}
            {renderStatusNotification()}
            
            <div className="flex justify-between pt-2">
              <Button 
                variant="light"
                onClick={() => setActiveTab('initial-process')}
                startIcon={
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                  </svg>
                }
              >
                返回初步處理
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

        {/* 結果顯示（上稿階段）*/}
        {activeTab === 'result' && result && (
          <div className="space-y-6">
            {/* 編輯器組件，供插入到stageSlots */}
            {(() => {
              const editorSlot = (
                <PrepPublishingComponent 
                  fileId={result.fileId?.toString() || processState?.id || ''}
                  htmlContent={result.htmlContent?.toString()}
                  markdownUrl={markdownUrl || undefined}
                  onContentChange={(content) => {
                    if (result) {
                      setResult({
                        ...result,
                        htmlContent: content
                      });
                    }
                  }}
                  onContinue={() => {
                    // 標記上稿準備階段為完成
                    if (processState) {
                      // 使用setTimeout避免渲染過程中的setState
                      setTimeout(() => {
                        // 完成上稿準備階段
                        saveStageResult('prep-publish', { 
                          ...result, 
                          status: 'completed' 
                        });
                        
                        // 完成後更新當前階段為上架新聞
                        updateProcessState({
                          currentStage: 'publish-news',
                          stages: processState.stages.map(s => 
                            s.id === 'prep-publish' 
                              ? { ...s, status: 'completed', progress: 100, message: '上稿準備完成，編輯內容就緒' }
                              : s.id === 'publish-news'
                                ? { ...s, status: 'processing', progress: 10, message: '準備WordPress發布設定...' }
                                : s
                          )
                        });
                        
                        // 滾動到WordPress階段
                        const publishNewsStage = document.querySelector('[data-stage-id="publish-news"]');
                        if (publishNewsStage) {
                          publishNewsStage.scrollIntoView({ behavior: 'smooth' });
                        }
                      }, 0);
                    }
                  }}
                />
              );

              // WordPress發布組件插槽
              // 添加調試日誌
              console.log('傳遞到WordPressPublishComponent的數據:', {
                htmlContent: result?.htmlContent ? String(result.htmlContent).substring(0, 100) + '...' : '無',
                wordpressParams: result?.wordpressParams || '無WordPress參數'
              });
              
              const wpPublishSlot = (
                <WordPressPublishComponent 
                  htmlContent={result?.htmlContent ? String(result.htmlContent) : ''}
                  wordpressParams={result?.wordpressParams as {
                    title?: string;
                    content?: string;
                    excerpt?: string;
                    slug?: string;
                    categories?: Array<{ id: number }>;
                    tags?: Array<{ id: number }>;
                  }}
                  processingParams={processingParams}
                  processState={processState ? {
                    currentStage: processState.currentStage,
                    stages: processState.stages
                  } : undefined}
                  completeStage={completeStage}
                />
              );

              // 配置階段插槽
              const stageSlots = {
                'prep-publish': editorSlot, // 在上稿準備階段後顯示編輯器
                'publish-news': wpPublishSlot // 在上架新聞階段後顯示WordPress發布設置
              };

              return (
                <ProgressDisplay 
                  state={processState!}
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
                  onViewStage={handleViewStage}
                  stageSlots={stageSlots}
                />
              );
            })()}
            
            {/* 狀態通知 */}
            {renderStatusNotification()}
            
            <div className="flex justify-between pt-2">
              <Button 
                variant="light"
                onClick={() => setActiveTab('advanced-process')}
                startIcon={
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                  </svg>
                }
              >
                返回後期處理
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
      
      {/* 階段結果查看對話框 */}
      {renderStageViewDialog()}
    </div>
  );
} 