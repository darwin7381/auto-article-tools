import 'highlight.js/styles/github-dark.css';
import MarkdownViewer from './MarkdownViewer';

// 从R2服务直接获取文件
async function fetchMarkdownContent(keyPath: string): Promise<{ content: string; title: string; error?: string }> {
  try {
    // 处理URL编码问题
    let decodedPath = keyPath;
    if (keyPath.includes('%')) {
      try {
        decodedPath = decodeURIComponent(keyPath);
      } catch (error) {
        console.warn('URL解码失敗:', error);
      }
    }

    // 判断是否为直接URL
    let url = '';
    if (decodedPath.startsWith('http')) {
      url = decodedPath;
    } else {
      url = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL || 'https://files.blocktempo.ai'}/${decodedPath}`;
    }

    console.log('服务端获取Markdown内容:', url);

    // 使用fetch获取内容
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Accept': 'text/markdown, text/plain, */*'
      }
    });

    if (!response.ok) {
      return {
        content: '',
        title: '載入失敗',
        error: `无法获取内容 (${response.status})`
      };
    }

    const text = await response.text();

    // 检查是否为HTML内容
    if (text.trim().startsWith('<!DOCTYPE html>') || text.trim().startsWith('<html>')) {
      return {
        content: text,
        title: '文件格式錯誤',
        error: '接收到HTML而非Markdown內容'
      };
    }

    // 尝试从Markdown提取标题
    const titleMatch = text.match(/^#\s+(.+)$/m);
    let title = '文檔';
    
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1];
    } else {
      // 从文件名或URL的最后部分中提取文件名
      const fileName = url.split('/').pop()?.split('.')[0] || '文檔';
      title = fileName;
    }

    return { content: text, title };
  } catch (error) {
    console.error('获取Markdown失败:', error);
    return {
      content: '',
      title: '載入失敗',
      error: error instanceof Error ? error.message : '未知錯誤'
    };
  }
}

export default async function MarkdownPage({ params }: { params: { key: string[] } }) {
  // 将参数数组连接成路径
  const keyPath = params.key.join('/');
  
  // 获取Markdown内容
  const { content, title, error } = await fetchMarkdownContent(keyPath);

  // 传递数据给客户端组件
  return <MarkdownViewer content={content} title={title} error={error} />;
} 