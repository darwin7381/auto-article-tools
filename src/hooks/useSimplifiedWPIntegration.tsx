'use client';

import { useState } from 'react';
import { publishPost } from '@/services/wordpress/wordpressService';

interface WordPressIntegrationOptions {
  initialContent?: string;
  fileId?: string;
}

export interface WordPressPublishData {
  title: string;
  categories?: string;
  tags?: string;
  status: 'publish' | 'draft' | 'pending';
  isPrivate: boolean;
}

interface PublishResult {
  success: boolean;
  postId?: number;
  postUrl?: string;
  error?: string;
}

/**
 * 簡化版WordPress整合Hook
 */
export function useSimplifiedWPIntegration(options: WordPressIntegrationOptions) {
  const { initialContent = '' } = options;
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null);
  
  // 將表單數據轉換為WordPress API格式
  const formatCategoriesAndTags = (
    categories?: string,
    tags?: string
  ) => {
    // 處理分類ID
    const categoryIds = categories ? 
      categories.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id)) : 
      [];
    
    // 處理標籤
    const tagsList = tags ? 
      tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : 
      [];
    
    return {
      categories: categoryIds.length > 0 ? categoryIds : undefined,
      tags: tagsList.length > 0 ? tagsList : undefined,
    };
  };
  
  // 發布到WordPress
  const publishToWordPress = async (formData: WordPressPublishData) => {
    setIsSubmitting(true);
    setPublishResult(null);
    
    try {
      // 處理分類和標籤
      const { categories, tags } = formatCategoriesAndTags(
        formData.categories,
        formData.tags
      );
      
      // 準備發布數據
      const publishData = {
        title: formData.title,
        content: initialContent,
        status: formData.status,
        categories,
        tags,
        isPrivate: formData.isPrivate
      };
      
      // 發布文章
      const result = await publishPost(publishData);
      
      // 儲存結果
      const successResult: PublishResult = {
        success: true,
        postId: result.id,
        postUrl: result.url
      };
      
      setPublishResult(successResult);
      return successResult;
    } catch (error) {
      console.error('發布到WordPress失敗:', error);
      
      const errorResult: PublishResult = {
        success: false,
        error: error instanceof Error ? error.message : String(error)
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