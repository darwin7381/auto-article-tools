'use client';

import { Dispatch, SetStateAction } from 'react';

interface WordPressSettingsProps {
  formData: {
    title: string;
    categories: string;
    tags: string;
    status: 'publish' | 'draft' | 'pending';
    isPrivate: boolean;
  };
  onChange: Dispatch<SetStateAction<{
    title: string;
    categories: string;
    tags: string;
    status: 'publish' | 'draft' | 'pending';
    isPrivate: boolean;
  }>>;
  error?: string;
  detailedError?: string;
}

export interface WordPressPublishData {
  title: string;
  categories?: string;
  tags?: string;
  status: 'publish' | 'draft' | 'pending';
  isPrivate: boolean;
}

/**
 * WordPress設置組件 - 簡化版，使用環境變量進行認證
 */
export function WordPressSettings({
  formData,
  onChange,
  error,
  detailedError
}: WordPressSettingsProps) {
  // 處理表單字段的更新
  const handleChange = (field: string, value: string | boolean) => {
    onChange(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm space-y-2">
            <p className="font-medium">{error}</p>
            {detailedError && (
              <div className="text-xs p-2 bg-red-100/50 rounded">
                <p className="whitespace-pre-line">{detailedError}</p>
              </div>
            )}
          </div>
        )}
        
        {/* 標題 */}
        <div className="space-y-1">
          <label htmlFor="title" className="block text-sm font-medium">
            文章標題 <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 bg-transparent rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            placeholder="請輸入文章標題"
            required
          />
        </div>
        
        {/* 分類 */}
        <div className="space-y-1">
          <label htmlFor="categories" className="block text-sm font-medium">
            分類 ID（多個用逗號分隔）
          </label>
          <input
            id="categories"
            type="text"
            value={formData.categories}
            onChange={(e) => handleChange('categories', e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 bg-transparent rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            placeholder="例如: 1,4,7"
          />
        </div>
        
        {/* 標籤 */}
        <div className="space-y-1">
          <label htmlFor="tags" className="block text-sm font-medium">
            標籤（多個用逗號分隔）
          </label>
          <input
            id="tags"
            type="text"
            value={formData.tags}
            onChange={(e) => handleChange('tags', e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 bg-transparent rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            placeholder="例如: 新聞,科技,區塊鏈"
          />
        </div>
        
        {/* 發布狀態 */}
        <div className="space-y-1">
          <label htmlFor="status" className="block text-sm font-medium">
            發布狀態
          </label>
          <select
            id="status"
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value as 'publish' | 'draft' | 'pending')}
            className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 bg-transparent rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="draft">草稿</option>
            <option value="pending">待審核</option>
            <option value="publish">直接發布</option>
          </select>
        </div>
        
        {/* 私密文章 */}
        <div className="flex items-center space-x-2">
          <input
            id="isPrivate"
            type="checkbox"
            checked={formData.isPrivate}
            onChange={(e) => handleChange('isPrivate', e.target.checked)}
            className="h-4 w-4 text-blue-600 rounded"
          />
          <label htmlFor="isPrivate" className="text-sm font-medium">
            設為私密文章
          </label>
        </div>
      </div>
    </div>
  );
}

export default WordPressSettings; 