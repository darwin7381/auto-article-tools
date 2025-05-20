'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSimplifiedWPIntegration } from '@/hooks/useSimplifiedWPIntegration';

interface WordPressPublishComponentProps {
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
    mode: 'auto' | 'manual'
  }
}

export default function WordPressPublishComponent({ 
  htmlContent, 
  wordpressParams,
  processingParams
}: WordPressPublishComponentProps) {
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

  // 表單數據狀態 - 先使用空值初始化，在useEffect中再更新
  const [formData, setFormData] = useState({
    title: '',
    categories: '',
    tags: '',
    status: 'draft' as 'publish' | 'draft' | 'pending' | 'future' | 'private',
    isPrivate: false,
    slug: '',
    author: '',
    featured_media: '',
    date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16) // 預設為明天的當前時間
  });

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
  
  const [isExpanded, setIsExpanded] = useState(false);
  
  // 發布處理函數
  const handlePublish = () => {
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
  };
  
  // 上架新聞階段的自動確認邏輯
  useEffect(() => {
    // 僅在自動模式下執行
    if (processingParams?.mode === 'auto' && 
        !isSubmitting && 
        !publishResult) {
      
      // 自動點擊發布按鈕
      setTimeout(() => {
        console.log("自動模式：上架新聞階段自動確認");
        if (formData.title.trim()) {
          handlePublish();
        } else {
          console.warn("自動發布失敗：文章標題為空");
        }
      }, 1500);
    }
  }, [processingParams?.mode, isSubmitting, publishResult, formData.title]);

  // 發布完成後自動更新階段狀態
  useEffect(() => {
    if (processingParams?.mode === 'auto' && 
        publishResult?.success && 
        !isSubmitting) {
      // 通知父組件或上下文，發布已完成
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          // 使用一個自定義事件通知上下文
          const event = new CustomEvent('wordpress-publish-completed', {
            detail: { success: true, postUrl: publishResult.postUrl }
          });
          window.dispatchEvent(event);
        }
      }, 1000);
    }
  }, [processingParams?.mode, publishResult, isSubmitting]);
  
  // 顯示成功或錯誤訊息
  const renderPublishStatus = () => {
    if (publishResult?.success) {
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
          
          <button
            onClick={handlePublish}
            disabled={isSubmitting || !formData.title.trim()}
            className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-md ${
              isSubmitting || !formData.title.trim()
                ? 'bg-primary-200 text-primary-800 cursor-not-allowed'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            }`}
          >
            {isSubmitting ? (
              <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12.75 15l3-3m0 0l-3-3m3 3h-7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {isSubmitting ? '發布中...' : '發布到WordPress'}
          </button>
        </div>
        
        {isExpanded && (
          <div className="bg-background/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="space-y-4">
              {/* 標題輸入 */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  文章標題 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
                  placeholder="請輸入文章標題"
                />
              </div>
              
              {/* 分類與標籤 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="categories" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    分類 (ID，用逗號分隔)
                  </label>
                  <input
                    type="text"
                    id="categories"
                    value={formData.categories}
                    onChange={(e) => setFormData({ ...formData, categories: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
                    placeholder="例如: 1,2,3"
                  />
                </div>
                <div>
                  <label htmlFor="tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    標籤 (ID，用逗號分隔)
                  </label>
                  <input
                    type="text"
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
                    placeholder="例如: 5,6,7"
                  />
                </div>
              </div>
              
              {/* 發布狀態與日期 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    發布狀態
                  </label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800"
                  >
                    <option value="draft">草稿</option>
                    <option value="publish">立即發布</option>
                    <option value="future">定時發布</option>
                    <option value="pending">待審核</option>
                    <option value="private">私人</option>
                  </select>
                </div>
                {formData.status === 'future' && (
                  <div>
                    <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      發布日期時間
                    </label>
                    <input
                      type="datetime-local"
                      id="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 