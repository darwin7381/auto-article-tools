'use client';

import { useState } from 'react';
import { useProcessing } from '@/context/ProcessingContext';
import type { 
  WordPressIntegrationOptions, 
  WordPressPublishData, 
  WordPressPublishResult,
  WordPressPublishRequestData 
} from '@/types/wordpress';

// 輔助函數：轉義正則表達式中的特殊字符
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& 表示整個匹配的字符串
}

/**
 * 簡化版WordPress整合Hook (使用服務端代理)
 */
export function useSimplifiedWPIntegration(options: WordPressIntegrationOptions) {
  const { initialContent = '', debug = false } = options;
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publishResult, setPublishResult] = useState<WordPressPublishResult | null>(null);
  const { completeStage } = useProcessing();
  
  // 將分類和標籤字符串轉換為適合API的格式
  const formatCategoriesAndTags = (categories?: string) => {
    if (!categories) return { categories: undefined };
    
    // 處理分類ID
    const categoryIds = categories
      .split(',')
      .map(id => parseInt(id.trim()))
      .filter(id => !isNaN(id));
    
    return {
      categories: categoryIds.length > 0 ? categoryIds : undefined
    };
  };
  
  // 將標籤字符串轉換為標籤數組
  const formatTags = (tags?: string) => {
    if (!tags) return { tags: undefined };
    
    // 處理標籤
    const tagsList = tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
    
    return {
      tags: tagsList.length > 0 ? tagsList : undefined
    };
  };
  
  // 檢測輸入的是URL還是ID
  const isURL = (input: string): boolean => {
    try {
      new URL(input);
      return true;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return false;
    }
  };
  
  // 從URL上傳圖片到WordPress
  const uploadImageFromUrl = async (imageUrl: string): Promise<number | null> => {
    try {
      // 使用服務端代理上傳圖片
      const response = await fetch('/api/wordpress-proxy/upload-image-from-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrl }),
        cache: 'no-store'
      });
      
      // 首先獲取響應體，無論成功與否
      let responseData;
      try {
        responseData = await response.json();
      } catch (parseError) {
        console.error(`解析響應失敗: ${parseError instanceof Error ? parseError.message : '未知錯誤'}`);
        console.error(`響應狀態: ${response.status} ${response.statusText}`);
        return null;
      }
      
      if (!response.ok) {
        console.error(`上傳圖片失敗 (HTTP ${response.status}): ${
          responseData && responseData.error 
            ? responseData.error
            : `請求失敗，狀態碼: ${response.status} ${response.statusText}`
        }`);
        // 不拋出異常，而是返回null
        return null;
      }
      
      return responseData.id;
    } catch (error) {
      console.error(`上傳圖片過程中發生網絡或系統錯誤: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  };
  
  // 發布到WordPress (通過服務端代理)
  const publishToWordPress = async (formData: WordPressPublishData) => {
    setIsSubmitting(true);
    setPublishResult(null);
    
    try {
      // 確保有HTML內容
      let content = initialContent || '<p>空白內容</p>';
      
      // 處理內容 - 移除第一個h1標籤，避免標題重複
      try {
        // 檢查是否已有h1標籤
        if (content.match(/<h1[^>]*>.*?<\/h1>/i)) {
          // 使用正則表達式移除第一個h1標籤及其內容
          content = content.replace(/<h1[^>]*>.*?<\/h1>/i, '');
          console.log('已移除內容中的h1標題，避免WordPress顯示重複標題');
        }
      } catch (error) {
        console.error('處理內容時出錯:', error);
        // 發生錯誤時使用原始內容，不做更改
      }
      
      // 提取並處理特色圖片
      let featuredImageUrl = '';
      try {
        // 🔧 修復Bug：始終先移除內容中的第一張圖片（避免重複顯示）
        const firstImgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
        let originalFirstImageUrl = '';
        if (firstImgMatch && firstImgMatch[1]) {
          originalFirstImageUrl = firstImgMatch[1];
          console.log('檢測到內容中的第一張圖片:', originalFirstImageUrl);
        }
        
        // 如果表單中提供了featured_media且為URL，將其保存為特色圖片URL
        if (formData.featured_media && isURL(formData.featured_media.trim())) {
          featuredImageUrl = formData.featured_media.trim();
          console.log('從表單獲取到特色圖片URL:', featuredImageUrl);
          
          // 🔧 關鍵修復：無論新的特色圖片URL是什麼，都要移除原本內容中的第一張圖片
          if (originalFirstImageUrl) {
            const originalImgRegex = new RegExp(`<figure[^>]*>\\s*<img[^>]*src=["']${escapeRegExp(originalFirstImageUrl)}["'][^>]*>.*?<\\/figure>|<img[^>]*src=["']${escapeRegExp(originalFirstImageUrl)}["'][^>]*>`, 'i');
            const oldContent = content;
            content = content.replace(originalImgRegex, '');
            
            if (oldContent !== content) {
              console.log('已從內容中移除原始首圖，避免與新特色圖片重複:', originalFirstImageUrl);
            }
          }
          
          // 如果新的特色圖片URL與原始首圖不同，且存在於內容中其他位置，也要移除
          if (featuredImageUrl !== originalFirstImageUrl && content.includes(featuredImageUrl)) {
            const newImgRegex = new RegExp(`<figure[^>]*>\\s*<img[^>]*src=["']${escapeRegExp(featuredImageUrl)}["'][^>]*>.*?<\\/figure>|<img[^>]*src=["']${escapeRegExp(featuredImageUrl)}["'][^>]*>`, 'i');
            const oldContent = content;
            content = content.replace(newImgRegex, '');
            
            if (oldContent !== content) {
              console.log('已從內容中移除新設置的特色圖片，避免重複顯示:', featuredImageUrl);
            }
          }
        } else if (!formData.featured_media && originalFirstImageUrl) {
          // 如果沒有提供特色圖片，使用內容中的第一張圖片作為特色圖片
          featuredImageUrl = originalFirstImageUrl;
          console.log('從內容中提取特色圖片URL:', featuredImageUrl);
          
          // 從內容中移除該圖片
          const imgRegex = new RegExp(`<figure[^>]*>\\s*<img[^>]*src=["']${escapeRegExp(featuredImageUrl)}["'][^>]*>.*?<\\/figure>|<img[^>]*src=["']${escapeRegExp(featuredImageUrl)}["'][^>]*>`, 'i');
          const oldContent = content;
          content = content.replace(imgRegex, '');
          
          // 檢查是否成功移除
          if (oldContent !== content) {
            console.log('已從內容中移除特色圖片，避免WordPress顯示重複圖片');
          }
        }
      } catch (error) {
        console.error('處理特色圖片時出錯:', error);
        // 發生錯誤時不修改內容，繼續處理
      }
      
      // 準備發布數據
      const publishData: WordPressPublishRequestData = {
        title: formData.title,
        content: content,
        status: formData.status,
        isPrivate: formData.isPrivate
      };
      
      // 添加分類和標籤
      const categoriesData = formatCategoriesAndTags(formData.categories);
      const tagsData = formatTags(formData.tags);
      
      if (categoriesData.categories) {
        publishData.categories = categoriesData.categories;
      }
      
      if (tagsData.tags) {
        publishData.tags = tagsData.tags;
      }
      
      // 添加自訂連結(slug)參數
      if (formData.slug && formData.slug.trim() !== '') {
        publishData.slug = formData.slug.trim();
      }
      
      // 添加指定作者(author)參數
      if (formData.author && formData.author.trim() !== '') {
        const authorId = parseInt(formData.author.trim());
        if (!isNaN(authorId) && authorId > 0) {
          publishData.author = authorId;
        }
      }
      
      // 處理特色圖片(featured_media)參數
      if (formData.featured_media && formData.featured_media.trim() !== '') {
        try {
          const featuredMedia = formData.featured_media.trim();
          
          // 檢測輸入是URL還是ID
          if (isURL(featuredMedia)) {
            // 如果是URL，先上傳獲取ID
            const mediaId = await uploadImageFromUrl(featuredMedia);
            
            if (mediaId) {
              publishData.featured_media = mediaId;
            } else {
              // 特色圖片上傳失敗但繼續發布
            }
          } else {
            // 如果是ID，直接使用
            const mediaId = parseInt(featuredMedia);
            if (!isNaN(mediaId) && mediaId > 0) {
              publishData.featured_media = mediaId;
            }
          }
        } catch (imageError) {
          // 捕獲所有圖片處理錯誤，但不影響發布流程
          console.error("處理特色圖片時發生錯誤，將繼續發布文章:", imageError);
        }
      } else if (featuredImageUrl) {
        // 如果表單中沒有提供但我們從內容中提取了圖片URL，則上傳該圖片
        try {
          const mediaId = await uploadImageFromUrl(featuredImageUrl);
          if (mediaId) {
            publishData.featured_media = mediaId;
            console.log('成功上傳特色圖片並獲取ID:', mediaId);
          }
        } catch (imageError) {
          console.error("上傳提取的特色圖片時發生錯誤:", imageError);
        }
      }
      
      // 添加定時發布日期(date)參數
      if (formData.status === 'future' && formData.date) {
        publishData.date = new Date(formData.date).toISOString();
      }
      
      if (debug) {
        // 僅在調試模式輸出詳細信息
        console.log("發布數據:", {
          title: formData.title,
          contentLength: content.length,
          status: formData.status,
          categories: publishData.categories,
          tags: publishData.tags,
          isPrivate: formData.isPrivate,
          slug: publishData.slug,
          author: publishData.author,
          featured_media: publishData.featured_media,
          date: publishData.date
        });
      }
      
      // 調用服務端代理API
      const response = await fetch('/api/wordpress-proxy/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(publishData),
        cache: 'no-store'
      });
      
      // 處理響應
      const responseData = await response.json();
      
      if (!response.ok) {
        console.error("WordPress API代理失敗:", response.status, responseData);
        throw new Error(responseData.error || `WordPress發布失敗 (${response.status})`);
      }
      
      const successResult: WordPressPublishResult = {
        success: true,
        postId: responseData.id,
        postUrl: responseData.link,
        debugInfo: debug ? { 
          contentSample: content.substring(0, 200),
          responseData
        } : undefined
      };
      
      setPublishResult(successResult);
      
      // 標記上架新聞階段為已完成
      completeStage('publish-news', `上架新聞完成，文章ID: ${responseData.id}`);
      
      console.log("WordPress發布成功 - 階段已標記為完成:", responseData.id);
      
      return successResult;
    } catch (error) {
      console.error('WordPress發布操作失敗:', error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      const errorResult: WordPressPublishResult = {
        success: false,
        error: errorMessage,
        debugInfo: debug ? { 
          contentSample: initialContent.substring(0, 200),
          error: errorMessage
        } : undefined
      };
      
      setPublishResult(errorResult);
      return errorResult;
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return {
    isSubmitting,
    publishResult,
    publishToWordPress
  };
} 