import React, { useState } from 'react';
import { Save, X } from 'lucide-react';
import { Author } from '@/services/strapi';

interface AuthorFormProps {
  item?: Author;
  onSave: (data: Partial<Author>) => Promise<void>;
  onCancel: () => void;
}

export function AuthorForm({ item: author, onSave, onCancel }: AuthorFormProps) {
  const [formData, setFormData] = useState({
    name: author?.name || '',
    displayName: author?.displayName || '',
    department: author?.department || '',
    wordpressId: author?.wordpressId || undefined,
    description: author?.description || '',
    isActive: author?.isActive ?? true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      const cleanData: Partial<Author> = {
        name: formData.name.trim(),
        displayName: formData.displayName.trim(),
        isActive: formData.isActive,
      };
      
      if (formData.department?.trim()) {
        cleanData.department = formData.department.trim();
      }
      
      if (formData.description?.trim()) {
        cleanData.description = formData.description.trim();
      }
      
      if (formData.wordpressId && formData.wordpressId > 0) {
        cleanData.wordpressId = formData.wordpressId;
      }
      
      await onSave(cleanData);
      alert('作者資料儲存成功！');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '儲存失敗，請重試';
      setError(errorMessage);
      console.error('儲存作者失敗:', err);
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
              作者帳號 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="例：john_doe"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent
                         placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              顯示名稱 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              placeholder="例：約翰・杜"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent
                         placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              部門
            </label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              placeholder="例：BTEditor"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent
                         placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              WordPress 作者 ID
            </label>
            <input
              type="number"
              value={formData.wordpressId?.toString() || ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                wordpressId: e.target.value ? Number(e.target.value) : undefined 
              })}
              placeholder="WordPress 系統中的作者 ID"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent
                         placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            描述 (可選)
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="作者的簡短描述"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent
                       placeholder-gray-400 dark:placeholder-gray-500 resize-none"
          />
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md p-3">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-600">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-emerald-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-emerald-500 dark:focus:ring-emerald-600 focus:ring-2"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">啟用此作者</span>
          </label>

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
              className="px-4 py-2 text-sm font-medium text-white bg-slate-600 hover:bg-slate-700 dark:bg-slate-500 dark:hover:bg-slate-600 border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 transition-colors disabled:opacity-50"
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