'use client';

import React from 'react';

/**
 * 處理模式選擇器組件
 * 允許用戶選擇自動或手動處理模式及WordPress發佈狀態
 */
export const ProcessingModeSelector = ({ 
  isAutoMode, 
  defaultPublishStatus = 'draft',
  onChange,
  onPublishStatusChange
}: { 
  isAutoMode: boolean,
  defaultPublishStatus?: 'draft' | 'pending' | 'publish' | 'private' | 'future',
  onChange: (isAuto: boolean) => void,
  onPublishStatusChange?: (status: 'draft' | 'pending' | 'publish' | 'private' | 'future') => void
}) => {
  return (
    <div className="mb-4">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            處理模式：
          </label>
          <select 
            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm" 
            value={isAutoMode ? 'auto' : 'manual'}
            onChange={(e) => onChange(e.target.value === 'auto')}
            aria-label="選擇處理模式"
          >
            <option value="auto">自動模式</option>
            <option value="manual">手動模式</option>
          </select>
          <button 
            type="button"
            className="ml-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:dark:text-gray-300"
            title="處理模式說明"
            onClick={() => alert('自動模式: 全流程自動執行，無需手動確認\n手動模式: 需要手動確認上稿準備和上架新聞階段')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.94 6.94a.75.75 0 11-1.061-1.061 3 3 0 112.871 5.026v.345a.75.75 0 01-1.5 0v-.5c0-.72.57-1.172 1.081-1.287A1.5 1.5 0 108.94 6.94zM10 15a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        {/* 發佈狀態選擇器 */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            預設發佈狀態：
          </label>
          <select 
            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm" 
            value={defaultPublishStatus}
            onChange={(e) => onPublishStatusChange?.(e.target.value as 'draft' | 'pending' | 'publish' | 'private' | 'future')}
            aria-label="選擇發佈狀態"
          >
            <option value="draft">草稿</option>
            <option value="pending">待審核</option>
            <option value="publish">立即發佈</option>
            <option value="private">私人</option>
            <option value="future">定時發佈</option>
          </select>
          <button 
            type="button"
            className="ml-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:dark:text-gray-300"
            title="發佈狀態說明"
            onClick={() => alert('草稿: 保存為草稿，需手動發佈\n待審核: 等待審核後才能發佈\n立即發佈: 發佈後立即公開\n私人: 僅登入用戶可見\n定時發佈: 在指定日期時間發佈')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.94 6.94a.75.75 0 11-1.061-1.061 3 3 0 112.871 5.026v.345a.75.75 0 01-1.5 0v-.5c0-.72.57-1.172 1.081-1.287A1.5 1.5 0 108.94 6.94zM10 15a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProcessingModeSelector; 