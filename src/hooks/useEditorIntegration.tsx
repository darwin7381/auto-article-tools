'use client';

import { useState, useEffect, useCallback } from 'react';
import { saveEditorContent, getEditorContent } from '@/services/storage/localService';

interface EditorIntegrationOptions {
  fileId: string;
  initialHtml?: string;
  markdownUrl?: string;
}

/**
 * 編輯器集成Hook - 處理編輯器內容的加載和保存
 */
export function useEditorIntegration(options: EditorIntegrationOptions) {
  const { fileId, initialHtml, markdownUrl } = options;
  
  const [editorContent, setEditorContent] = useState<string>('');
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  
  // 初始化 - 嘗試從localStorage加載內容或使用初始HTML
  useEffect(() => {
    const loadContent = async () => {
      try {
        if (!fileId) return;
        
        setIsLoading(true);
        
        // 先嘗試從localStorage獲取編輯器內容
        const savedContent = getEditorContent(fileId);
        
        if (savedContent) {
          // 如果有已保存的內容，直接使用
          setEditorContent(savedContent);
        } else if (initialHtml) {
          // 如果沒有已保存內容但有初始HTML，使用初始HTML
          setEditorContent(initialHtml);
          // 順便保存到localStorage
          saveEditorContent(initialHtml, fileId);
        } else if (markdownUrl) {
          // 如果有Markdown URL，嘗試獲取並轉換
          try {
            const response = await fetch(markdownUrl);
            if (response.ok) {
              const markdownContent = await response.text();
              // 這裡簡化處理，實際可能需要更複雜的markdown->html轉換
              const html = `<div>${markdownContent.replace(/\n/g, '<br/>')}</div>`;
              setEditorContent(html);
              saveEditorContent(html, fileId);
            }
          } catch (error) {
            console.error('獲取Markdown內容失敗:', error);
          }
        }
      } catch (error) {
        console.error('加載編輯器內容失敗:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadContent();
  }, [fileId, initialHtml, markdownUrl]);
  
  // 切換編輯器顯示狀態
  const toggleEditor = useCallback(() => {
    setIsEditorOpen(prev => !prev);
  }, []);
  
  // 保存編輯器內容到localStorage
  const handleSaveContent = useCallback((content: string) => {
    if (!fileId) return;
    
    setIsSaving(true);
    setEditorContent(content);
    
    try {
      saveEditorContent(content, fileId);
      console.log('內容已保存到localStorage');
    } catch (error) {
      console.error('保存編輯器內容失敗:', error);
    } finally {
      setIsSaving(false);
    }
  }, [fileId]);
  
  return {
    editorContent,
    setEditorContent: handleSaveContent,
    isEditorOpen,
    toggleEditor,
    isLoading,
    isSaving
  };
} 