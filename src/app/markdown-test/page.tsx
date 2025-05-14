'use client';

import { useState } from 'react';
import { Card, CardHeader, CardBody } from '@heroui/card';
import { Button } from '@/components/ui/button/Button';
import DOMPurify from 'isomorphic-dompurify';

export default function MarkdownTestPage() {
  const [markdownUrl, setMarkdownUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    markdownContent: string;
    htmlContent: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<'markdown' | 'html' | 'rendered'>('rendered');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!markdownUrl) {
      setError('請輸入Markdown URL');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/markdown-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ markdownUrl }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '轉換失敗');
      }
      
      setResult({
        markdownContent: data.markdownContent,
        htmlContent: data.htmlContent,
      });
    } catch (err) {
      console.error('處理錯誤:', err);
      setError(err instanceof Error ? err.message : '轉換過程中發生錯誤');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-primary-600 dark:text-primary-400">
        Markdown 轉 HTML 測試工具 (使用 Tiptap)
      </h1>
      
      <Card className="mb-8">
        <CardHeader>
          <h2 className="text-xl font-semibold">輸入 Markdown URL</h2>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="markdown-url">
                Markdown文件URL
              </label>
              <input
                id="markdown-url"
                type="url"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md"
                value={markdownUrl}
                onChange={(e) => setMarkdownUrl(e.target.value)}
                placeholder="https://example.com/file.md"
              />
              {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
              )}
            </div>
            
            <Button 
              type="submit" 
              disabled={isLoading || !markdownUrl}
              isLoading={isLoading}
            >
              轉換
            </Button>
          </form>
        </CardBody>
      </Card>
      
      {result && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">轉換結果</h2>
              
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('markdown')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'markdown' 
                      ? 'bg-white dark:bg-gray-700 shadow text-primary-600 dark:text-primary-400' 
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700/50'
                  }`}
                >
                  Markdown源碼
                </button>
                <button
                  onClick={() => setActiveTab('html')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'html' 
                      ? 'bg-white dark:bg-gray-700 shadow text-primary-600 dark:text-primary-400' 
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700/50'
                  }`}
                >
                  HTML源碼
                </button>
                <button
                  onClick={() => setActiveTab('rendered')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'rendered' 
                      ? 'bg-white dark:bg-gray-700 shadow text-primary-600 dark:text-primary-400' 
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700/50'
                  }`}
                >
                  渲染結果
                </button>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            {activeTab === 'markdown' && (
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md">
                <pre className="text-sm font-mono whitespace-pre-wrap overflow-x-auto">
                  {result.markdownContent}
                </pre>
              </div>
            )}
            
            {activeTab === 'html' && (
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md">
                <pre className="text-sm font-mono whitespace-pre-wrap overflow-x-auto">
                  {result.htmlContent}
                </pre>
              </div>
            )}
            
            {activeTab === 'rendered' && (
              <div 
                className="tiptap-content prose lg:prose-lg dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ 
                  __html: DOMPurify.sanitize(result.htmlContent, {
                    ADD_TAGS: ['iframe', 'meta'],
                    ADD_ATTR: ['target', 'rel', 'loading', 'frameborder', 'allowfullscreen'],
                  }) 
                }}
              />
            )}
          </CardBody>
        </Card>
      )}

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