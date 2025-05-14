import 'highlight.js/styles/github-dark.css';
import dynamic from 'next/dynamic';

// 動態導入組件以降低初始加載大小
const MarkdownViewer = dynamic(() => import('./MarkdownViewer'), { 
  ssr: true,
  loading: () => <div className="p-8 text-center">正在載入 Markdown 查看器...</div>
});

// 導入 HTML 查看器
const HTMLViewer = dynamic(() => import('./HTMLViewer'), { 
  ssr: true,
  loading: () => <div className="p-8 text-center">正在載入 HTML 查看器...</div>
});

// 從R2服務直接獲取文件
async function fetchContent(keyPath: string): Promise<{ content: string; title: string; error?: string; contentType?: string }> {
  try {
    // 處理URL編碼問題
    let decodedPath = keyPath;
    if (keyPath.includes('%')) {
      try {
        decodedPath = decodeURIComponent(keyPath);
      } catch (error) {
        console.warn('URL解碼失敗:', error);
      }
    }

    // 判斷是否為直接URL
    let url = '';
    if (decodedPath.startsWith('http')) {
      url = decodedPath;
    } else {
      url = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL || 'https://files.blocktempo.ai'}/${decodedPath}`;
    }

    console.log('服務端獲取內容:', url);

    // 使用fetch獲取內容
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Accept': 'text/markdown, text/html, text/plain, */*'
      }
    });

    if (!response.ok) {
      return {
        content: '',
        title: '載入失敗',
        error: `無法獲取內容 (${response.status})`
      };
    }

    const text = await response.text();
    const contentType = response.headers.get('content-type') || '';

    // 檢查URL中是否指定了檢視類型（例如：.../file.md?view=html）
    const urlObj = new URL(url);
    const forcedViewType = urlObj.searchParams.get('view');
    
    // 根據內容或副檔名確定類型
    let detectedType = '';
    
    // 首先檢查URL參數是否強制指定了類型
    if (forcedViewType === 'html') {
      detectedType = 'html';
    } else if (forcedViewType === 'markdown') {
      detectedType = 'markdown';
    } 
    // 如果未指定強制類型，則進行自動檢測
    else if (contentType.includes('text/html') || 
        text.trim().startsWith('<!DOCTYPE html>') || 
        text.trim().startsWith('<html>') ||
        keyPath.toLowerCase().endsWith('.html')) {
      detectedType = 'html';
    } else if (contentType.includes('text/markdown') ||
               keyPath.toLowerCase().endsWith('.md')) {
      detectedType = 'markdown';
    }

    // 嘗試從內容提取標題
    let title = '文檔';
    
    if (detectedType === 'markdown') {
      const titleMatch = text.match(/^#\s+(.+)$/m);
      if (titleMatch && titleMatch[1]) {
        title = titleMatch[1];
      }
    } else if (detectedType === 'html') {
      const titleMatch = text.match(/<title>(.+?)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        title = titleMatch[1];
      }
    }
    
    // 如果沒有從內容提取到標題，嘗試從文件名提取
    if (title === '文檔') {
      const fileName = url.split('/').pop()?.split('.')[0] || '文檔';
      title = fileName;
    }

    return { 
      content: text, 
      title,
      contentType: detectedType
    };
  } catch (error) {
    console.error('獲取內容失敗:', error);
    return {
      content: '',
      title: '載入失敗',
      error: error instanceof Error ? error.message : '未知錯誤'
    };
  }
}

// 使用Next.js的正確方式處理動態參數
export default async function ContentPage({ 
  params 
}: { 
  params: Promise<{ key: string[] }> 
}) {
  try {
    // 首先await整個params對象
    const resolvedParams = await params;
    
    // 從解析後的params對象中安全地獲取key
    const routeSegments = resolvedParams.key;
    
    // 轉換為路徑
    const keyPath = Array.isArray(routeSegments) ? routeSegments.join('/') : '';
    
    // 獲取內容
    const { content, title, error, contentType } = await fetchContent(keyPath);
    
    // 添加調試信息
    console.log('檔案路徑:', keyPath);
    console.log('偵測到的內容類型:', contentType);
    console.log('內容前100個字符:', content.slice(0, 100));
    
    // 根據內容類型選擇適合的查看器
    if (contentType === 'html') {
      return <HTMLViewer content={content} title={title} error={error} />;
    } else {
      // 默認使用Markdown查看器
      return <MarkdownViewer content={content} title={title} error={error} />;
    }
  } catch (error) {
    console.error('渲染頁面失敗:', error);
    // 出錯時使用Markdown查看器
    return <MarkdownViewer 
      content="" 
      title="錯誤" 
      error={error instanceof Error ? error.message : '未知錯誤'}
    />;
  }
} 