'use client';

import { useState } from 'react';
import { Button } from '../button/Button';

interface WordPressFormProps {
  onSubmit: (formData: WordPressFormData) => void;
  isSubmitting?: boolean;
  error?: string;
}

export interface WordPressFormData {
  title: string;
  status: 'publish' | 'draft' | 'pending';
  categories?: number[];
  tags?: string[];
  isPrivate?: boolean;
}

/**
 * WordPress發布表單組件 - 簡化版
 * 使用 .env 中的 WordPress API 設定
 */
export function WordPressForm({
  onSubmit,
  isSubmitting = false,
  error,
}: WordPressFormProps) {
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<'publish' | 'draft' | 'pending'>('draft');
  const [isPrivate, setIsPrivate] = useState(false);
  const [category, setCategory] = useState<string>('');
  const [tags, setTags] = useState<string>('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 處理分類ID
    const categoryIds = category ? 
      category.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id)) : 
      [];
    
    // 處理標籤
    const tagsList = tags ? 
      tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : 
      [];
    
    onSubmit({
      title,
      status,
      categories: categoryIds.length > 0 ? categoryIds : undefined,
      tags: tagsList.length > 0 ? tagsList : undefined,
      isPrivate,
    });
  };
  
  return (
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
      
      {/* 分類 ID */}
      <div className="space-y-2">
        <label htmlFor="category" className="block font-medium">
          分類 ID（可選，多個用逗號分隔）
        </label>
        <input
          id="category"
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="例如: 1,4,7"
        />
      </div>
      
      {/* 標籤 */}
      <div className="space-y-2">
        <label htmlFor="tags" className="block font-medium">
          標籤（可選，多個用逗號分隔）
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
  );
}

export default WordPressForm; 