'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button/Button';

interface WordPressSettingsProps {
  onPublish: (formData: WordPressPublishData) => void;
  isSubmitting?: boolean;
  error?: string;
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
  onPublish,
  isSubmitting = false,
  error
}: WordPressSettingsProps) {
  const [title, setTitle] = useState('');
  const [categories, setCategories] = useState('');
  const [tags, setTags] = useState('');
  const [status, setStatus] = useState<'publish' | 'draft' | 'pending'>('draft');
  const [isPrivate, setIsPrivate] = useState(false);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onPublish({
      title,
      categories: categories || undefined,
      tags: tags || undefined,
      status,
      isPrivate
    });
  };
  
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h3 className="font-medium text-blue-800 mb-2">WordPress 上稿設置</h3>
        <p className="text-sm text-blue-600">
          認證信息已在環境變量中配置，無需手動輸入
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
            {error}
          </div>
        )}
        
        {/* 標題 */}
        <div className="space-y-2">
          <label htmlFor="title" className="block font-medium">
            文章標題 <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="請輸入文章標題"
            required
          />
        </div>
        
        {/* 分類 */}
        <div className="space-y-2">
          <label htmlFor="categories" className="block font-medium">
            分類 ID（多個用逗號分隔）
          </label>
          <input
            id="categories"
            type="text"
            value={categories}
            onChange={(e) => setCategories(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="例如: 1,4,7"
          />
        </div>
        
        {/* 標籤 */}
        <div className="space-y-2">
          <label htmlFor="tags" className="block font-medium">
            標籤（多個用逗號分隔）
          </label>
          <input
            id="tags"
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="例如: 新聞,科技,區塊鏈"
          />
        </div>
        
        {/* 發布狀態 */}
        <div className="space-y-2">
          <label htmlFor="status" className="block font-medium">
            發布狀態
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'publish' | 'draft' | 'pending')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            className="h-4 w-4 text-blue-600 rounded"
          />
          <label htmlFor="isPrivate" className="font-medium">
            設為私密文章
          </label>
        </div>
        
        {/* 提交按鈕 */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSubmitting || !title.trim()}
            className={isSubmitting ? 'opacity-70' : ''}
          >
            {isSubmitting ? '發布中...' : '發布到 WordPress'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default WordPressSettings; 