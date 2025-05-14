'use client';

import { useState, useEffect } from 'react';
import TapEditor from '../taptip-editor';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import markdownToHtml from '@/utils/markdown-to-html';

interface EditorIntegrationProps {
  fileId: string;
  initialHtml?: string;
  markdownUrl?: string;
  onContentSave?: (content: string) => void;
}

/**
 * 編輯器集成組件 - 包含打開/關閉編輯器功能和編輯器內容處理
 */
export default function EditorIntegration({
  fileId,
  initialHtml = '',
  markdownUrl,
  onContentSave,
}: EditorIntegrationProps) {
  const [content, setContent] = useState(initialHtml);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 使用localStorage來保存編輯內容
  const { getItem, setItem } = useLocalStorage();
  const editorStorageKey = `editor-content-${fileId}`;
  
  // 載入初始內容
  useEffect(() => {
    const loadContent = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // 首先嘗試從localStorage加載
        const savedContent = getItem(editorStorageKey);
        if (savedContent) {
          setContent(savedContent);
          return;
        }
        
        // 如果有初始HTML內容，直接使用
        if (initialHtml) {
          setContent(initialHtml);
          return;
        }
        
        // 如果有Markdown URL，嘗試從URL加載
        if (markdownUrl) {
          const response = await fetch(markdownUrl);
          if (!response.ok) {
            throw new Error(`無法載入Markdown內容: ${response.statusText}`);
          }
          
          const markdownContent = await response.text();
          const html = await markdownToHtml(markdownContent);
          setContent(html);
          
          // 保存到localStorage
          setItem(editorStorageKey, html);
        }
      } catch (err) {
        console.error('載入內容錯誤:', err);
        setError(err instanceof Error ? err.message : '載入內容時發生未知錯誤');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadContent();
  }, [fileId, initialHtml, markdownUrl, getItem, setItem, editorStorageKey]);
  
  // 處理內容變更
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setItem(editorStorageKey, newContent);
    
    // 如果提供了保存回調，則觸發
    if (onContentSave) {
      onContentSave(newContent);
    }
  };
  
  // 顯示載入狀態
  if (isLoading) {
    return (
      <div className="min-h-[200px] flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-md border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">載入編輯器內容中...</p>
        </div>
      </div>
    );
  }
  
  // 顯示錯誤
  if (error) {
    return (
      <div className="min-h-[200px] flex items-center justify-center bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800/30 p-4">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 font-medium">載入失敗</p>
          <p className="text-sm text-red-500 dark:text-red-500/80 mt-1">{error}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-full">
      <TapEditor 
        initialContent={content} 
        onChange={handleContentChange}
        placeholder="開始編輯文章內容..."
      />
    </div>
  );
} 