'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardBody } from '@heroui/card';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import DOMPurify from 'isomorphic-dompurify';
import { Marked } from 'marked';

interface MarkdownViewerProps {
  content: string;
  title: string;
  error?: string;
}

export default function MarkdownViewer({ content, title, error }: MarkdownViewerProps) {
  const [viewMode, setViewMode] = useState<'markdown' | 'article'>('article');
  const [articleHtml, setArticleHtml] = useState('');
  
  // 使用useCallback優化函數，防止不必要的重複創建
  const convertToArticleHtml = useCallback(async (markdownContent: string) => {
    if (!markdownContent) return;
    
    // 將相對路徑的圖片轉換為絕對路徑
    let processedContent = markdownContent;
    const baseUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || 'https://files.blocktempo.ai';
    
    // 替換標準Markdown圖片語法中的相對路徑為絕對路徑
    processedContent = processedContent.replace(
      /!\[(.*?)\]\((?!http)(.*?)\)/g, 
      (match: string, alt: string, url: string) => {
        return `![${alt}](${baseUrl}/${url})`;
      }
    );
    
    // 移除可能存在的 ```markdown 起始標記（非標準Markdown語法）
    processedContent = processedContent.replace(/```markdown\n/g, '');
    processedContent = processedContent.replace(/```\n$/g, '');
    
    // 頭部標題處理
    const titleMatch = processedContent.match(/^#\s+(.+)$/m);
    let articleTitle = title;
    if (titleMatch && titleMatch[1]) {
      articleTitle = titleMatch[1];
      processedContent = processedContent.replace(/^#\s+(.+)$/m, '');
    }
    
    // 使用marked庫解析Markdown為HTML，啟用GitHub風格Markdown支持
    const marked = new Marked({
      gfm: true,
      breaks: true,
      pedantic: false
    });
    
    // 解析Markdown為HTML
    const parsedHtml = await marked.parse(processedContent);
    
    // 處理圖片，確保圖片正常顯示
    const enhancedHtml = (parsedHtml as string).replace(/<img src="(.*?)"(.+?)>/g, 
      (match: string, src: string, attrs: string) => {
        return `<figure class="article-image">
          <img src="${src}" ${attrs} loading="lazy" />
        </figure>`;
      }
    );
    
    // 清理HTML並設置
    const sanitizedHtml = DOMPurify.sanitize(`
      <article class="article">
        <header class="article-header">
          <h1>${articleTitle}</h1>
        </header>
        <div class="article-content">
          ${enhancedHtml}
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
        
        .article-content h4 {
          font-size: 1.15rem;
          font-weight: 600;
          margin-top: 1.75rem;
          margin-bottom: 0.75rem;
        }
        
        .article-content h5 {
          font-size: 1rem;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
        }
        
        .article-content h6 {
          font-size: 0.95rem;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
        }
        
        .article-content hr {
          margin: 2rem 0;
          border: 0;
          border-top: 1px solid rgba(0,0,0,0.1);
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