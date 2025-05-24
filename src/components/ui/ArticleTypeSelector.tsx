'use client';

import React from 'react';
import { ArticleType } from '@/types/article-formatting';
import { ArticleTypeOptions } from '@/config/article-templates';

interface ArticleTypeSelectorProps {
  selectedType: ArticleType;
  onTypeChange: (type: ArticleType) => void;
  className?: string;
}

export default function ArticleTypeSelector({
  selectedType,
  onTypeChange,
  className = ''
}: ArticleTypeSelectorProps) {
  
  return (
    <div className={`mb-4 ${className}`}>
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            文稿類型：
          </label>
          <select 
            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm" 
            value={selectedType}
            onChange={(e) => onTypeChange(e.target.value as ArticleType)}
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
            className="ml-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:dark:text-gray-300"
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
      </div>
    </div>
  );
} 