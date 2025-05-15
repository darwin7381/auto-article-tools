'use client';

import { useState, useEffect, useRef } from 'react';
import TapEditor from '../taptip-editor';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import markdownToHtml from '@/utils/markdown-to-html';
import { Button } from '../button/Button';

interface EditorIntegrationProps {
  fileId: string;
  initialHtml?: string;
  markdownUrl?: string;
  onContentSave?: (content: string) => void;
  onContinue?: () => void;
}

/**
 * 編輯器集成組件 - 包含打開/關閉編輯器功能和編輯器內容處理
 */
export default function EditorIntegration({
  fileId,
  initialHtml = '',
  markdownUrl,
  onContentSave,
  onContinue,
}: EditorIntegrationProps) {
  const [content, setContent] = useState(initialHtml);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const fullScreenEditorRef = useRef<HTMLDivElement>(null);
  
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

  // 強制滾動到頂部的函數
  const scrollToTop = (element: HTMLElement | null) => {
    if (element) {
      // 立即滾動並稍後再次滾動以確保生效
      element.scrollTop = 0;
      
      // 使用多個 setTimeout 確保在各種情況下都能生效
      setTimeout(() => {
        if (element) element.scrollTop = 0;
      }, 10);
      
      setTimeout(() => {
        if (element) element.scrollTop = 0;
      }, 50);
      
      setTimeout(() => {
        if (element) element.scrollTop = 0;
      }, 100);
    }
  };
  
  // 當展開或收合編輯器時處理滾動
  const handleToggleEditor = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    
    // 如果展開編輯器，稍後滾動到頂部
    if (!newState) {
      setTimeout(() => {
        scrollToTop(editorContainerRef.current);
      }, 10);
    }
  };

  // 開啟全屏編輯模式
  const openFullScreenEditor = () => {
    setIsFullScreen(true);
    // 禁止背景滾動
    document.body.style.overflow = 'hidden';
    
    // 滾動到頂部（延遲確保DOM已更新）
    setTimeout(() => {
      const editorContent = fullScreenEditorRef.current?.querySelector('.ProseMirror');
      if (editorContent instanceof HTMLElement) {
        scrollToTop(editorContent);
      }
    }, 50);
  };

  // 關閉全屏編輯模式
  const closeFullScreenEditor = () => {
    setIsFullScreen(false);
    // 恢復背景滾動
    document.body.style.overflow = '';
  };
  
  // 處理內容變更
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setItem(editorStorageKey, newContent);
    
    // 如果提供了保存回調，則觸發
    if (onContentSave) {
      onContentSave(newContent);
    }
  };

  // 處理繼續按鈕點擊
  const handleContinue = () => {
    if (onContinue) {
      onContinue();
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
    <div className="w-full space-y-4">
      {/* 可點擊的編輯器標題與控制按鈕 */}
      <div className="flex justify-between items-center">
        <div 
          onClick={handleToggleEditor}
          className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-2 rounded-md transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          <h3 className="text-lg font-semibold">Tiptap 編輯器</h3>
          <span className="text-gray-500 ml-2">
            {isCollapsed ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="18 15 12 9 6 15"></polyline>
              </svg>
            )}
          </span>
        </div>

        {/* 全屏編輯按鈕 - 更新圖標 */}
        <Button
          onClick={openFullScreenEditor}
          variant="light"
          size="sm"
          className="flex items-center gap-1.5 px-2 py-1"
          aria-label="展開整頁編輯器"
          title="展開整頁編輯器"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
          </svg>
          <span>展開整頁編輯器</span>
        </Button>
      </div>
      
      {/* 展開/收合的編輯器（帶有高度限制和滾動條） */}
      {!isCollapsed && (
        <div 
          ref={editorContainerRef}
          className="w-full max-h-[400px] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md"
        >
          <TapEditor 
            initialContent={content} 
            onChange={handleContentChange}
            placeholder="開始編輯文章內容..."
            className="border-none rounded-none"
          />
        </div>
      )}
      
      {/* 繼續處理按鈕 */}
      {onContinue && (
        <div className="flex justify-end mt-4">
          <Button
            onClick={handleContinue}
            color="primary"
            startIcon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12.75 15l3-3m0 0l-3-3m3 3h-7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          >
            確認內容並繼續處理
          </Button>
        </div>
      )}

      {/* 全屏編輯模式彈窗 - 修改為真正的全屏 */}
      {isFullScreen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-transparent w-full h-full flex items-center justify-center overflow-hidden pointer-events-none">
            {/* 編輯器主容器 */}
            <div 
              ref={fullScreenEditorRef}
              className="bg-white dark:bg-gray-900 w-full max-w-4xl h-[95vh] flex flex-col overflow-hidden rounded-lg shadow-xl pointer-events-auto"
            >
              {/* 固定在頂部的標題欄 */}
              <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-800 p-4 sticky top-0 bg-white dark:bg-gray-900 z-10">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  整頁編輯模式
                </h3>
                <div className="flex items-center gap-3">
                  {onContinue && (
                    <Button
                      onClick={() => {
                        closeFullScreenEditor();
                        handleContinue();
                      }}
                      color="primary"
                      startIcon={
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12.75 15l3-3m0 0l-3-3m3 3h-7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      }
                      className="hidden md:flex"
                    >
                      確認內容並繼續
                    </Button>
                  )}
                  <Button
                    onClick={closeFullScreenEditor}
                    variant="light"
                    className="flex items-center gap-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="hidden md:inline">關閉編輯器</span>
                  </Button>
                </div>
              </div>
              
              {/* 編輯器容器 */}
              <div className="flex-1 overflow-hidden">
                <TapEditor 
                  initialContent={content} 
                  onChange={handleContentChange}
                  placeholder="開始編輯文章內容..."
                  className="h-full border-none rounded-none"
                />
              </div>
              
              {/* 移動設備上的底部按鈕區域 */}
              <div className="md:hidden border-t border-gray-200 dark:border-gray-800 p-4 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-gray-900">
                {onContinue && (
                  <Button
                    onClick={() => {
                      closeFullScreenEditor();
                      handleContinue();
                    }}
                    color="primary"
                    className="w-full"
                  >
                    確認內容並繼續
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 