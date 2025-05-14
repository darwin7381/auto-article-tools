'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody } from '@heroui/card';
import DOMPurify from 'isomorphic-dompurify';

interface HTMLViewerProps {
  content: string;
  title: string;
  error?: string;
}

export default function HTMLViewer({ content, title, error }: HTMLViewerProps) {
  const [viewMode, setViewMode] = useState<'rendered' | 'source'>('rendered');
  const [sanitizedContent, setSanitizedContent] = useState<string>('');
  
  // 處理和清理 HTML 內容
  useEffect(() => {
    if (content) {
      // 使用 DOMPurify 清理 HTML
      const cleaned = DOMPurify.sanitize(content, {
        ADD_TAGS: ['iframe', 'meta'],
        ADD_ATTR: ['target', 'rel', 'loading', 'frameborder', 'allowfullscreen'],
      });
      
      setSanitizedContent(cleaned);
      console.log('已清理並設置 HTML 內容，長度:', cleaned.length);
    }
  }, [content]);
  
  return (
    <div className="container mx-auto p-4">
      <Card className="w-full max-w-6xl mx-auto">
        <CardHeader className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-primary-600 dark:text-primary-400">{title}</h1>
            
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('rendered')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'rendered' 
                    ? 'bg-white dark:bg-gray-700 shadow text-primary-600 dark:text-primary-400' 
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700/50'
                }`}
              >
                渲染視圖
              </button>
              <button
                onClick={() => setViewMode('source')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'source' 
                    ? 'bg-white dark:bg-gray-700 shadow text-primary-600 dark:text-primary-400' 
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700/50'
                }`}
              >
                原始碼
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {!content && !error ? '正在載入文件...' : '文件已載入'}
          </p>
        </CardHeader>
        
        <CardBody>
          {!content && !error && (
            <div className="flex justify-center items-center p-10">
              <div className="animate-spin h-10 w-10 border-4 border-primary-500 rounded-full border-t-transparent"></div>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-800/30">
              <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                {error}
              </p>
            </div>
          )}
          
          {content && !error && viewMode === 'rendered' && (
            <div className="tiptap-content prose lg:prose-lg dark:prose-invert max-w-none">
              <div dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
            </div>
          )}
          
          {content && !error && viewMode === 'source' && (
            <div className="source-content">
              <pre className="text-sm font-mono whitespace-pre-wrap bg-gray-100 dark:bg-gray-800 p-4 rounded-md overflow-x-auto">
                {content}
              </pre>
            </div>
          )}
        </CardBody>
      </Card>
      
      {/* 樣式 */}
      <style jsx global>{`
        .tiptap-content {
          font-family: 'Noto Sans TC', 'Noto Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          line-height: 1.8;
          font-size: 1.125rem;
        }
        
        .tiptap-content h1 {
          font-size: 2.5rem;
          font-weight: 700;
          margin: 2rem 0 1.5rem;
          line-height: 1.3;
        }
        
        .tiptap-content h2 {
          font-size: 1.875rem;
          font-weight: 600;
          margin: 1.75rem 0 1.25rem;
          padding-bottom: 0.25rem;
          border-bottom: 1px solid rgba(0,0,0,0.1);
        }
        
        .tiptap-content h3 {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 1.5rem 0 1rem;
        }
        
        .tiptap-content h4 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 1.25rem 0 0.75rem;
        }
        
        .tiptap-content p {
          margin-bottom: 1.25rem;
        }
        
        .tiptap-content ul, .tiptap-content ol {
          margin: 1.25rem 0;
          padding-left: 1.5rem;
        }
        
        .tiptap-content li {
          margin-bottom: 0.5rem;
        }
        
        .tiptap-content a {
          color: #3b82f6;
          text-decoration: none;
          border-bottom: 1px solid rgba(59, 130, 246, 0.3);
          transition: border-color 0.2s;
        }
        
        .tiptap-content a:hover {
          border-color: #3b82f6;
        }
        
        .tiptap-content img {
          max-width: 100%;
          height: auto;
          margin: 1.5rem 0;
          border-radius: 0.5rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        
        .tiptap-content blockquote {
          border-left: 4px solid #3b82f6;
          padding: 0.5rem 0 0.5rem 1rem;
          margin: 1.5rem 0;
          font-style: italic;
          background-color: rgba(59, 130, 246, 0.05);
          border-radius: 0 0.25rem 0.25rem 0;
        }
        
        .tiptap-content pre {
          background-color: #1f2937;
          border-radius: 0.5rem;
          padding: 1rem;
          overflow-x: auto;
          margin: 1.5rem 0;
        }
        
        .tiptap-content code {
          font-family: 'Courier New', Consolas, Monaco, monospace;
          font-size: 0.9em;
          color: #e5e7eb;
        }
        
        .tiptap-content hr {
          margin: 2rem 0;
          border: 0;
          height: 1px;
          background-color: rgba(0,0,0,0.1);
        }
        
        .tiptap-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.5rem 0;
        }
        
        .tiptap-content th {
          background-color: rgba(0,0,0,0.05);
          font-weight: 600;
          text-align: left;
          padding: 0.75rem;
          border: 1px solid rgba(0,0,0,0.1);
        }
        
        .tiptap-content td {
          padding: 0.75rem;
          border: 1px solid rgba(0,0,0,0.1);
        }
        
        @media (prefers-color-scheme: dark) {
          .tiptap-content {
            color: #e5e7eb;
          }
          
          .tiptap-content a {
            color: #60a5fa;
            border-bottom-color: rgba(96, 165, 250, 0.3);
          }
          
          .tiptap-content a:hover {
            border-color: #60a5fa;
          }
          
          .tiptap-content blockquote {
            border-left-color: #60a5fa;
            background-color: rgba(96, 165, 250, 0.05);
          }
          
          .tiptap-content h2 {
            border-bottom-color: rgba(255,255,255,0.1);
          }
          
          .tiptap-content hr {
            background-color: rgba(255,255,255,0.1);
          }
          
          .tiptap-content th {
            background-color: rgba(255,255,255,0.05);
            border-color: rgba(255,255,255,0.1);
          }
          
          .tiptap-content td {
            border-color: rgba(255,255,255,0.1);
          }
        }
      `}</style>
    </div>
  );
} 