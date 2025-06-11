import React, { useState } from 'react';
import { Save, X } from 'lucide-react';
import { FooterDisclaimerTemplate } from '@/services/strapi';

interface FooterTemplateFormProps {
  item?: FooterDisclaimerTemplate;
  onSave: (data: Partial<FooterDisclaimerTemplate>) => Promise<void>;
  onCancel: () => void;
}

export function FooterTemplateForm({ item: template, onSave, onCancel }: FooterTemplateFormProps) {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    displayName: template?.displayName || '',
    template: template?.template || '',
    description: template?.description || '',
    isActive: template?.isActive ?? true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const cleanData: Partial<FooterDisclaimerTemplate> = {
        name: formData.name.trim(),
        displayName: formData.displayName.trim(),
        template: formData.template.trim(),
        isActive: formData.isActive,
      };
      
      if (formData.description?.trim()) {
        cleanData.description = formData.description.trim();
      }
      
      await onSave(cleanData);
      alert('末尾押註模板儲存成功！');
    } catch (err) {
      console.error('儲存失敗:', err);
      alert('儲存失敗，請重試');
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
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
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
              placeholder="例：廣編稿末尾押註"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
            />
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-600">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-orange-600"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">啟用此模板</span>
          </label>
          
          <div className="flex gap-3">
            <button type="button" onClick={onCancel} disabled={isSubmitting}>
              <X className="h-4 w-4 mr-2 inline" />
              取消
            </button>
            <button type="submit" disabled={isSubmitting}>
              <Save className="h-4 w-4 mr-2 inline" />
              {isSubmitting ? '儲存中...' : '儲存'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
} 