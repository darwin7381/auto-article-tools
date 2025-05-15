'use client';

import { useState } from 'react';
// 不再需要直接導入publishPost
// import { publishPost } from '@/services/wordpress/wordpressService';

interface WordPressIntegrationOptions {
  initialContent?: string;
  fileId?: string;
  debug?: boolean;
}

export interface WordPressPublishData {
  title: string;
  categories?: string;
  tags?: string;
  status: 'publish' | 'draft' | 'pending' | 'future' | 'private';
  isPrivate: boolean;
  slug?: string;
  author?: string;
  featured_media?: string;
  date?: string;
}

interface PublishResult {
  success: boolean;
  postId?: number;
  postUrl?: string;
  error?: string;
  debugInfo?: {
    contentSample?: string;
    [key: string]: unknown;
  };
}

/**
 * 簡化版WordPress整合Hook (使用服務端代理)
 */
export function useSimplifiedWPIntegration(options: WordPressIntegrationOptions) {
  const { initialContent = '', debug = false } = options;
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null);
  
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
  
  // 發布到WordPress (通過服務端代理)
  const publishToWordPress = async (formData: WordPressPublishData) => {
    setIsSubmitting(true);
    setPublishResult(null);
    
    try {
      // 確保有HTML內容
      const content = initialContent || '<p>空白內容</p>';
      
      // 準備發布數據
      interface PublishRequestData {
        title: string;
        content: string;
        status: 'publish' | 'draft' | 'pending' | 'future' | 'private';
        categories?: number[];
        tags?: string[];
        isPrivate: boolean;
        slug?: string;
        author?: number;
        featured_media?: number;
        date?: string;
      }
      
      const publishData: PublishRequestData = {
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
      
      // 添加特色圖片(featured_media)參數
      if (formData.featured_media && formData.featured_media.trim() !== '') {
        const mediaId = parseInt(formData.featured_media.trim());
        if (!isNaN(mediaId) && mediaId > 0) {
          publishData.featured_media = mediaId;
        }
      }
      
      // 添加定時發布日期(date)參數
      if (formData.status === 'future' && formData.date) {
        publishData.date = new Date(formData.date).toISOString();
      }
      
      if (debug) {
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
      console.log("正在呼叫WordPress服務端代理API...");
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
      
      // 處理成功情況
      console.log("WordPress發布成功:", responseData);
      
      const successResult: PublishResult = {
        success: true,
        postId: responseData.id,
        postUrl: responseData.link,
        debugInfo: debug ? { 
          contentSample: content.substring(0, 200),
          responseData
        } : undefined
      };
      
      setPublishResult(successResult);
      return successResult;
    } catch (error) {
      console.error('WordPress發布操作失敗:', error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      const errorResult: PublishResult = {
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