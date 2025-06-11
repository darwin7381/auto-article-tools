import React, { useState } from 'react';
import { Save, X } from 'lucide-react';
import { ArticleTypePreset, Author, HeaderDisclaimerTemplate, FooterDisclaimerTemplate } from '@/services/strapi';

interface ArticlePresetFormProps {
  item?: ArticleTypePreset;
  onSave: (data: Partial<ArticleTypePreset>) => Promise<void>;
  onCancel: () => void;
  // 額外的數據依賴
  authors?: Author[];
  headerTemplates?: HeaderDisclaimerTemplate[];
  footerTemplates?: FooterDisclaimerTemplate[];
}

export function ArticlePresetForm({ 
  item: preset, 
  onSave, 
  onCancel,
  authors = [],
  headerTemplates = [],
  footerTemplates = []
}: ArticlePresetFormProps) {
  const [formData, setFormData] = useState({
    name: preset?.name || '',
    code: preset?.code || '',
    description: preset?.description || '',
    defaultAuthorId: preset?.defaultAuthor?.documentId || '',
    headerDisclaimerTemplateId: preset?.headerDisclaimerTemplate?.documentId || '',
    footerDisclaimerTemplateId: preset?.footerDisclaimerTemplate?.documentId || '',
    requiresAdTemplate: preset?.requiresAdTemplate ?? false,
    isActive: preset?.isActive ?? true,
    sortOrder: preset?.sortOrder || 0,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      const cleanData: Partial<ArticleTypePreset> = {
        name: formData.name.trim(),
        code: formData.code.trim(),
        requiresAdTemplate: formData.requiresAdTemplate,
        isActive: formData.isActive,
        sortOrder: formData.sortOrder,
      };
      
      if (formData.description?.trim()) {
        cleanData.description = formData.description.trim();
      }
      
      // 處理關聯字段 - Strapi 5 格式
      if (formData.defaultAuthorId) {
        (cleanData as Record<string, unknown>).defaultAuthor = { connect: [{ documentId: formData.defaultAuthorId }] };
      }
      
      if (formData.headerDisclaimerTemplateId) {
        (cleanData as Record<string, unknown>).headerDisclaimerTemplate = { connect: [{ documentId: formData.headerDisclaimerTemplateId }] };
      }
      
      if (formData.footerDisclaimerTemplateId) {
        (cleanData as Record<string, unknown>).footerDisclaimerTemplate = { connect: [{ documentId: formData.footerDisclaimerTemplateId }] };
      }
      
      await onSave(cleanData);
      alert('文稿類型預設儲存成功！');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '儲存失敗，請重試';
      setError(errorMessage);
      console.error('儲存文稿類型預設失敗:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              預設名稱 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="例：廣編稿"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                         placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              代碼 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="例：sponsored"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                         placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            描述
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="這個文稿類型的用途說明"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                       placeholder-gray-400 dark:placeholder-gray-500 resize-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              預設作者
            </label>
            <select
              value={formData.defaultAuthorId}
              onChange={(e) => setFormData({ ...formData, defaultAuthorId: e.target.value })}
              title="選擇預設作者"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">-- 無指定 --</option>
              {authors.map((author) => (
                <option key={author.documentId} value={author.documentId}>
                  {author.displayName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              開頭押註模板
            </label>
            <select
              value={formData.headerDisclaimerTemplateId}
              onChange={(e) => setFormData({ ...formData, headerDisclaimerTemplateId: e.target.value })}
              title="選擇開頭押註模板"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">-- 無 --</option>
              {headerTemplates.map((template) => (
                <option key={template.documentId} value={template.documentId}>
                  {template.displayName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              末尾押註模板
            </label>
            <select
              value={formData.footerDisclaimerTemplateId}
              onChange={(e) => setFormData({ ...formData, footerDisclaimerTemplateId: e.target.value })}
              title="選擇末尾押註模板"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">-- 無 --</option>
              {footerTemplates.map((template) => (
                <option key={template.documentId} value={template.documentId}>
                  {template.displayName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            排序順序
          </label>
          <input
            type="number"
            value={formData.sortOrder}
            onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
            min="0"
            title="排序順序"
            placeholder="0"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md p-3">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-600">
          <div className="space-y-2">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={formData.requiresAdTemplate}
                onChange={(e) => setFormData({ ...formData, requiresAdTemplate: e.target.checked })}
                className="w-4 h-4 text-red-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-red-500 dark:focus:ring-red-600 focus:ring-2"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">需要廣告模板</span>
            </label>
            
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 text-purple-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-purple-500 dark:focus:ring-purple-600 focus:ring-2"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">啟用此預設</span>
            </label>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors disabled:opacity-50"
            >
              <X className="h-4 w-4 mr-2 inline" />
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-2 inline" />
              {isSubmitting ? '儲存中...' : '儲存'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
} 