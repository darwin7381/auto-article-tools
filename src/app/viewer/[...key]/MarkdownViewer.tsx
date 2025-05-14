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
  const [processedMarkdown, setProcessedMarkdown] = useState('');
  const [extractedTitle, setExtractedTitle] = useState<string | null>(null);
  
  // 處理 Markdown 內容，確保正確顯示
  useEffect(() => {
    if (!content) {
      setProcessedMarkdown('');
      setExtractedTitle(null);
      return;
    }
    
    // 嘗試提取標題
    const titleMatch = content.match(/^#\s+(.+)$/m);
    if (titleMatch && titleMatch[1]) {
      setExtractedTitle(titleMatch[1]);
    } else {
      setExtractedTitle(null);
    }
    
    console.log('原始內容前60個字符:', content.substring(0, 60).replace(/\n/g, '\\n'));
    console.log('是否已有```markdown開頭:', content.trim().startsWith('```markdown'));
    
    // 為Markdown視圖準備內容
    let wrappedContent = content;
    
    // 如果內容不是以 ```markdown 開頭，我們用一個特殊技巧：
    // 創建一個包含完整 markdown 代碼塊的字符串
    if (!content.trim().startsWith('```markdown')) {
      wrappedContent = "```markdown\n" + content + "\n```";
      console.log('已為內容添加 ```markdown 包裝');
    }
    
    setProcessedMarkdown(wrappedContent);
    
  }, [content]);
  
  // 使用useCallback優化函數，防止不必要的重複創建
  const convertToArticleHtml = useCallback(async (markdownContent: string) => {
    if (!markdownContent) return;
    
    // 清理Markdown內容，移除frontmatter和程式碼區塊標記
    let processedContent = markdownContent;
    
    // 移除YAML frontmatter (位於文件開頭的---之間的內容)
    processedContent = processedContent.replace(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/, '');
    
    // 移除開頭的 ```markdown 標記（非標準Markdown語法）
    processedContent = processedContent.replace(/^```markdown\r?\n/g, '');
    
    // 移除結尾的 ``` 標記
    processedContent = processedContent.replace(/\r?\n```\s*$/g, '');
    
    // 將相對路徑的圖片轉換為絕對路徑
    const baseUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || 'https://files.blocktempo.ai';
    
    // 替換標準Markdown圖片語法中的相對路徑為絕對路徑
    processedContent = processedContent.replace(
      /!\[(.*?)\]\((?!http)(.*?)\)/g, 
      (match: string, alt: string, url: string) => {
        return `![${alt}](${baseUrl}/${url})`;
      }
    );
    
    // 使用extractedTitle或title作為articleTitle
    const articleTitle = extractedTitle || title;
    
    // 如果在內容中找到標題，移除它以避免重複
    if (extractedTitle) {
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
    
    // 處理圖片，確保圖片正常顯示，支持各種格式的圖片標籤
    const enhancedHtml = (parsedHtml as string).replace(/<img\s+([^>]*)>/g, 
      (match: string, attributes: string) => {
        // 提取src屬性
        const srcMatch = attributes.match(/src=["']([^"']*)["']/);
        if (!srcMatch) return match; // 如果沒有src屬性，保持不變
        
        const src = srcMatch[1];
        
        // 確保保留原有的屬性
        const sanitizedAttributes = attributes
          .replace(/src=["'][^"']*["']/, `src="${src}"`)
          .replace(/\s+$/, '');
        
        return `<figure class="article-image">
          <img ${sanitizedAttributes} loading="lazy" />
        </figure>`;
      }
    );
    
    // 清理HTML並設置
    const sanitizedHtml = DOMPurify.sanitize(`
      <article class="article">
        <div class="article-content">
          <h1>${articleTitle}</h1>
          ${enhancedHtml}
        </div>
      </article>
    `);
    
    setArticleHtml(sanitizedHtml);
  }, [title, extractedTitle]);
  
  // 當內容或視圖模式更新時，處理HTML
  useEffect(() => {
    if (processedMarkdown && viewMode === 'article') {
      convertToArticleHtml(processedMarkdown);
    }
  }, [processedMarkdown, viewMode, convertToArticleHtml]);
  
  // 使用內容提取的標題或傳入的標題
  const displayTitle = extractedTitle || title;
  
  return (
    <div className="container mx-auto p-4">
      <Card className="w-full max-w-6xl mx-auto">
        <CardHeader className="border-b border-gray-200 dark:border-gray-800 px-6 py-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h1 className="text-2xl font-bold text-primary-600 dark:text-primary-400">{displayTitle}</h1>
            
            {/* 視圖切換按鈕 - 新設計 */}
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg self-end">
              <button
                onClick={() => setViewMode('article')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'article' 
                    ? 'bg-primary-500 text-white' 
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700/50'
                }`}
              >
                文章視圖
              </button>
              <button
                onClick={() => setViewMode('markdown')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'markdown' 
                    ? 'bg-primary-500 text-white' 
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700/50'
                }`}
              >
                Markdown視圖
              </button>
            </div>
          </div>
        </CardHeader>
        
        <CardBody className="p-0">
          {!content && !error && (
            <div className="flex justify-center items-center p-10">
              <div className="animate-spin h-10 w-10 border-4 border-primary-500 rounded-full border-t-transparent"></div>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-b-xl border-t border-red-100 dark:border-red-800/30">
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
            <div className="markdown-content prose lg:prose-lg dark:prose-invert max-w-none p-6">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
              >
                {processedMarkdown}
              </ReactMarkdown>
            </div>
          )}
          
          {content && !error && viewMode === 'article' && (
            <div 
              className="article-view prose lg:prose-lg dark:prose-invert max-w-none p-6"
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
        /* 確保代碼換行 */
        .markdown-content pre,
        .markdown-content code {
          white-space: pre-wrap !important;
          word-wrap: break-word !important;
          word-break: break-word !important;
          max-width: 100%;
        }
        
        /* 解決代碼塊水平滾動問題 */
        .markdown-content pre {
          overflow-x: auto;
        }
        
        .article {
          font-family: 'Noto Sans TC', 'Noto Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          line-height: 1.8;
        }
        
        .article-content {
          font-size: 1.125rem;
        }
        
        .article-content h1 {
          font-size: 2rem;
          font-weight: 700;
          margin-top: 0.5rem;
          margin-bottom: 1.5rem;
          line-height: 1.3;
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
          .article-content h1 {
            font-size: 1.75rem;
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