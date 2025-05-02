'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardBody } from '@heroui/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import DOMPurify from 'isomorphic-dompurify';

interface MarkdownViewerProps {
  content: string;
  title: string;
  error?: string;
}

export default function MarkdownViewer({ content, title, error }: MarkdownViewerProps) {
  const [viewMode, setViewMode] = useState<'markdown' | 'article'>('article');
  const [articleHtml, setArticleHtml] = useState('');
  
  // 使用useCallback優化函數，防止不必要的重複創建
  const convertToArticleHtml = useCallback((markdownContent: string) => {
    if (!markdownContent) return;
    
    // 將相對路徑的圖片轉換為絕對路徑
    let processedContent = markdownContent;
    const baseUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || 'https://files.blocktempo.ai';
    
    // 替換標準Markdown圖片語法 ![alt](url)
    processedContent = processedContent.replace(
      /!\[(.*?)\]\((?!http)(.*?)\)/g, 
      (match, alt, url) => {
        return `![${alt}](${baseUrl}/${url})`;
      }
    );
    
    // 使用臨時DOM元素將ReactMarkdown轉換的內容保存為HTML字符串
    const tempElement = document.createElement('div');
    tempElement.className = 'markdown-body';
    
    // 這裡我們手動將Markdown轉換為HTML
    // 頭部標題處理
    const titleMatch = processedContent.match(/^#\s+(.+)$/m);
    let articleTitle = title;
    if (titleMatch && titleMatch[1]) {
      articleTitle = titleMatch[1];
      processedContent = processedContent.replace(/^#\s+(.+)$/m, '');
    }
    
    // 處理圖片，確保圖片正常顯示
    processedContent = processedContent.replace(/!\[(.*?)\]\((.*?)\)/g, 
      (match, alt, url) => {
        return `<figure class="article-image">
          <img src="${url}" alt="${alt || ''}" loading="lazy" />
          ${alt ? `<figcaption>${alt}</figcaption>` : ''}
        </figure>`;
      }
    );
    
    // 處理標題
    processedContent = processedContent.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
    processedContent = processedContent.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
    
    // 處理段落
    processedContent = processedContent.replace(/^(?![<#])(.*)\n$/gm, '<p>$1</p>');
    
    // 處理列表
    processedContent = processedContent.replace(/^-\s+(.+)$/gm, '<li>$1</li>');
    processedContent = processedContent.replace(/(<li>.*<\/li>\n)+/g, '<ul>$&</ul>');
    
    // 處理代碼塊
    processedContent = processedContent.replace(/```(.*)\n([\s\S]*?)\n```/g, 
      (match, lang, code) => {
        return `<pre><code class="language-${lang}">${code}</code></pre>`;
      }
    );
    
    // 處理鏈接
    processedContent = processedContent.replace(/\[(.*?)\]\((.*?)\)/g, 
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    
    // 處理強調
    processedContent = processedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    processedContent = processedContent.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // 清理HTML並設置
    const sanitizedHtml = DOMPurify.sanitize(`
      <article class="article">
        <header class="article-header">
          <h1>${articleTitle}</h1>
        </header>
        <div class="article-content">
          ${processedContent}
        </div>
      </article>
    `);
    
    setArticleHtml(sanitizedHtml);
  }, [title]);
  
  // 當內容或視圖模式更新時，處理HTML
  useEffect(() => {
    if (content && viewMode === 'article') {
      convertToArticleHtml(content);
    }
  }, [content, viewMode, convertToArticleHtml]);
  
  return (
    <div className="container mx-auto p-4">
      <Card className="w-full max-w-6xl mx-auto">
        <CardHeader className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-primary-600 dark:text-primary-400">{title}</h1>
            
            {/* 視圖切換按鈕 */}
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('article')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'article' 
                    ? 'bg-white dark:bg-gray-700 shadow text-primary-600 dark:text-primary-400' 
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700/50'
                }`}
              >
                文章視圖
              </button>
              <button
                onClick={() => setViewMode('markdown')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'markdown' 
                    ? 'bg-white dark:bg-gray-700 shadow text-primary-600 dark:text-primary-400' 
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700/50'
                }`}
              >
                Markdown視圖
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-500">
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
              
              {content && content.startsWith('<!DOCTYPE html>') && (
                <div className="mt-4 text-xs text-red-500">
                  <p>接收到HTML內容而非Markdown，可能是因為：</p>
                  <ul className="list-disc ml-4 mt-2">
                    <li>R2存儲配置問題（CORS或Content-Type）</li>
                    <li>URL參數編碼錯誤</li>
                    <li>原始文件格式不正確</li>
                  </ul>
                </div>
              )}
            </div>
          )}
          
          {content && !error && viewMode === 'markdown' && (
            <div className="markdown-content prose lg:prose-lg dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
              >
                {content}
              </ReactMarkdown>
            </div>
          )}
          
          {content && !error && viewMode === 'article' && (
            <div 
              className="article-view prose lg:prose-lg dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: articleHtml }}
              style={{
                '--article-spacing': '2rem',
                '--article-bg': 'white',
                '--article-text': '#333'
              } as React.CSSProperties}
            >
              {/* 文章HTML由dangerouslySetInnerHTML注入 */}
            </div>
          )}
        </CardBody>
      </Card>
      
      {/* 文章視圖的樣式 */}
      <style jsx global>{`
        .article {
          font-family: 'Noto Sans TC', 'Noto Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          line-height: 1.8;
        }
        
        .article-header {
          margin-bottom: 2rem;
        }
        
        .article-header h1 {
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          line-height: 1.3;
        }
        
        .article-content {
          font-size: 1.125rem;
        }
        
        .article-content h2 {
          font-size: 1.75rem;
          font-weight: 600;
          margin-top: 2.5rem;
          margin-bottom: 1.25rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid rgba(0,0,0,0.1);
        }
        
        .article-content h3 {
          font-size: 1.35rem;
          font-weight: 600;
          margin-top: 2rem;
          margin-bottom: 1rem;
        }
        
        .article-content p {
          margin-bottom: 1.5rem;
        }
        
        .article-content ul, .article-content ol {
          margin-bottom: 1.5rem;
          padding-left: 1.5rem;
        }
        
        .article-content li {
          margin-bottom: 0.5rem;
        }
        
        .article-content a {
          color: #3b82f6;
          text-decoration: none;
          border-bottom: 1px solid rgba(59, 130, 246, 0.3);
          transition: border-color 0.2s;
        }
        
        .article-content a:hover {
          border-color: #3b82f6;
        }
        
        .article-image {
          margin: 2rem 0;
          text-align: center;
        }
        
        .article-image img {
          max-width: 100%;
          border-radius: 0.5rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        
        .article-image figcaption {
          margin-top: 0.75rem;
          font-size: 0.875rem;
          color: #6b7280;
          font-style: italic;
        }
        
        .article-content pre {
          background-color: #1f2937;
          border-radius: 0.5rem;
          padding: 1rem;
          overflow-x: auto;
          margin: 1.5rem 0;
        }
        
        .article-content code {
          font-family: 'Courier New', Consolas, Monaco, monospace;
          font-size: 0.9em;
          color: #e5e7eb;
        }
        
        @media (max-width: 768px) {
          .article-header h1 {
            font-size: 1.875rem;
          }
          
          .article-content {
            font-size: 1rem;
          }
          
          .article-content h2 {
            font-size: 1.5rem;
          }
          
          .article-content h3 {
            font-size: 1.25rem;
          }
        }
      `}</style>
    </div>
  );
} 