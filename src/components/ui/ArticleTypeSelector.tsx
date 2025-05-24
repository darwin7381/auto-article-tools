'use client';

import React from 'react';
import { ArticleType, AdvancedArticleSettings, DisclaimerType } from '@/types/article-formatting';
import { ArticleTypeOptions, DisclaimerOptions, DefaultAdvancedSettings } from '@/config/article-templates';

interface ArticleTypeSelectorProps {
  selectedType: ArticleType;
  onTypeChange: (type: ArticleType) => void;
  advancedSettings: AdvancedArticleSettings;
  onAdvancedSettingsChange: (settings: AdvancedArticleSettings) => void;
  className?: string;
}

export default function ArticleTypeSelector({
  selectedType,
  onTypeChange,
  advancedSettings,
  onAdvancedSettingsChange,
  className = ''
}: ArticleTypeSelectorProps) {
  
  // 處理文稿類型變更
  const handleTypeChange = (type: ArticleType) => {
    onTypeChange(type);
    // 自動應用該類型的預設進階設定
    const defaultSettings = DefaultAdvancedSettings[type];
    onAdvancedSettingsChange(defaultSettings);
  };

  // 處理進階設定變更
  const handleAdvancedSettingChange = (key: keyof AdvancedArticleSettings, value: DisclaimerType | string | undefined) => {
    onAdvancedSettingsChange({
      ...advancedSettings,
      [key]: value
    });
  };

  return (
    <div className={`mb-4 ${className}`}>
      <div className="flex items-center space-x-4 flex-wrap gap-y-3">
        {/* 文稿類型選擇 */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
            文稿類型：
          </label>
          <select 
            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm min-w-[100px]" 
            value={selectedType}
            onChange={(e) => handleTypeChange(e.target.value as ArticleType)}
            aria-label="選擇文稿類型"
          >
            {ArticleTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button 
            type="button"
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:dark:text-gray-300"
            title="文稿類型說明"
            onClick={() => {
              const selectedOption = ArticleTypeOptions.find(opt => opt.value === selectedType);
              if (selectedOption) {
                alert(`${selectedOption.label}: ${selectedOption.description}\n作者: ${selectedOption.authorInfo.displayName}`);
              }
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.94 6.94a.75.75 0 11-1.061-1.061 3 3 0 112.871 5.026v.345a.75.75 0 01-1.5 0v-.5c0-.72.57-1.172 1.081-1.287A1.5 1.5 0 108.94 6.94zM10 15a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* 正文開頭押註 */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
            正文開頭押註：
          </label>
          <select 
            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm min-w-[120px]"
            value={advancedSettings.headerDisclaimer}
            onChange={(e) => handleAdvancedSettingChange('headerDisclaimer', e.target.value as DisclaimerType)}
            aria-label="選擇正文開頭押註"
          >
            {DisclaimerOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* 正文末尾押註 */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
            正文末尾押註：
          </label>
          <select 
            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm min-w-[120px]"
            value={advancedSettings.footerDisclaimer}
            onChange={(e) => handleAdvancedSettingChange('footerDisclaimer', e.target.value as DisclaimerType)}
            aria-label="選擇正文末尾押註"
          >
            {DisclaimerOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 供稿方輸入框 - 獨立一行以避免擠壓 */}
      <div className="flex items-center space-x-2 mt-3">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
          供稿方：
        </label>
        <input
          type="text"
          className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm min-w-[200px] max-w-[300px]"
          value={advancedSettings.authorName || ''}
          onChange={(e) => handleAdvancedSettingChange('authorName', e.target.value || undefined)}
          placeholder="輸入供稿方名稱（選填）"
          aria-label="輸入供稿方名稱"
        />
        <span className="text-xs text-gray-500 dark:text-gray-400">
          用於自動替換押註中的［撰稿方名稱］
        </span>
      </div>
    </div>
  );
} 