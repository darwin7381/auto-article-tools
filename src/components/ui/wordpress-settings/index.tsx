'use client';

import type { WordPressSettingsProps } from '@/types/wordpress';

/**
 * WordPress設置組件 - 簡化版，使用環境變量進行認證
 */
export function WordPressSettings({
  formData,
  onChange,
  error,
  detailedError,
  extractedParams
}: WordPressSettingsProps) {
  // 處理表單字段的更新
  const handleChange = (field: string, value: string | boolean) => {
    onChange({
      ...formData,
      [field]: value
    });
  };
  
  // 格式化分類或標籤顯示，如果有名稱則顯示，否則只顯示ID
  const formatEntityDisplay = (entities?: Array<{ id: number; name?: string }>) => {
    if (!entities || !entities.length) return null;
    
    return (
      <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
        自動提取: {entities.map(entity => 
          entity.name ? `${entity.name} (${entity.id})` : `ID: ${entity.id}`
        ).join(', ')}
      </div>
    );
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
        
        {/* 自訂連結 (slug) */}
        <div className="space-y-1">
          <label htmlFor="slug" className="block text-sm font-medium">
            自訂連結 (slug)
          </label>
          <input
            id="slug"
            type="text"
            value={formData.slug}
            onChange={(e) => handleChange('slug', e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 bg-transparent rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            placeholder="例如: my-custom-article-url"
          />
          <p className="text-xs text-gray-700">不填寫時將自動根據標題生成</p>
          {extractedParams?.slug && (
            <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              自動提取: {extractedParams.slug}
            </div>
          )}
        </div>
        
        {/* 指定作者 */}
        <div className="space-y-1">
          <label htmlFor="author" className="block text-sm font-medium">
            指定作者 (ID)
          </label>
          <input
            id="author"
            type="text"
            value={formData.author}
            onChange={(e) => handleChange('author', e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 bg-transparent rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            placeholder="例如: 1"
          />
          <p className="text-xs text-gray-700">請輸入作者ID，不填寫則使用當前登入的用戶</p>
        </div>
        
        {/* 特色圖片 */}
        <div className="space-y-1">
          <label htmlFor="featured_media" className="block text-sm font-medium">
            特色圖片 (ID 或 URL)
          </label>
          <input
            id="featured_media"
            type="text"
            value={formData.featured_media}
            onChange={(e) => handleChange('featured_media', e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 bg-transparent rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            placeholder="例如: 123 或 https://example.com/image.jpg"
          />
          <p className="text-xs text-gray-700">輸入WordPress媒體庫中的圖片ID，或直接輸入圖片URL</p>
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
          {extractedParams?.categories && formatEntityDisplay(extractedParams.categories)}
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
          {extractedParams?.tags && formatEntityDisplay(extractedParams.tags)}
        </div>
        
        {/* 發布狀態 */}
        <div className="space-y-1">
          <label htmlFor="status" className="block text-sm font-medium">
            發布狀態
          </label>
          <select
            id="status"
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 bg-transparent rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="draft">草稿</option>
            <option value="pending">待審核</option>
            <option value="publish">直接發布</option>
            <option value="future">定時發布</option>
            <option value="private">私密文章</option>
          </select>
        </div>
        
        {/* 定時發布日期 (只在選擇「定時發布」時顯示) */}
        {formData.status === 'future' && (
          <div className="space-y-1">
            <label htmlFor="date" className="block text-sm font-medium">
              發布日期時間 <span className="text-red-500">*</span>
            </label>
            <input
              id="date"
              type="datetime-local"
              value={formData.date}
              onChange={(e) => handleChange('date', e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 bg-transparent rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              required={formData.status === 'future'}
            />
            <p className="text-xs text-gray-700">選擇「定時發布」時必須設定未來的發布日期時間</p>
          </div>
        )}
        
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