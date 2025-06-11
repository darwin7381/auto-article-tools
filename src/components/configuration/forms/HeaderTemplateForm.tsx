import React, { useState } from 'react';
import { Save, X } from 'lucide-react';
import { HeaderDisclaimerTemplate } from '@/services/strapi';

interface HeaderTemplateFormProps {
  item?: HeaderDisclaimerTemplate;
  onSave: (data: Partial<HeaderDisclaimerTemplate>) => Promise<void>;
  onCancel: () => void;
}

export function HeaderTemplateForm({ item: template, onSave, onCancel }: HeaderTemplateFormProps) {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    displayName: template?.displayName || '',
    template: template?.template || '',
    description: template?.description || '',
    isActive: template?.isActive ?? true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      const cleanData: Partial<HeaderDisclaimerTemplate> = {
        name: formData.name.trim(),
        displayName: formData.displayName.trim(),
        template: formData.template.trim(),
        isActive: formData.isActive,
      };
      
      if (formData.description?.trim()) {
        cleanData.description = formData.description.trim();
      }
      
      await onSave(cleanData);
      alert('開頭押註模板儲存成功！');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '儲存失敗，請重試';
      setError(errorMessage);
      console.error('儲存開頭押註模板失敗:', err);
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
              模板代碼 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="例：sponsored"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
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
              placeholder="例：廣編稿開頭押註"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                         placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            模板內容 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.template}
            onChange={(e) => setFormData({ ...formData, template: e.target.value })}
            placeholder="例：&lt;span style=&quot;color: #808080;&quot;&gt;&lt;em&gt; 廣編稿&lt;/em&gt;&lt;/span&gt;"
            required
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                       placeholder-gray-400 dark:placeholder-gray-500 resize-none font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            說明
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="這個模板的用途說明"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
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
              className="w-4 h-4 text-green-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-green-500 dark:focus:ring-green-600 focus:ring-2"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">啟用此模板</span>
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
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors disabled:opacity-50"
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