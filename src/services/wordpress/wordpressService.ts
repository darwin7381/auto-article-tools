'use client';

/**
 * WordPress服務 - 提供與WordPress API交互的能力
 */

// WordPress API基本URL
const WP_API_BASE = process.env.WORDPRESS_API_URL || '';
const WP_API_USER = process.env.WORDPRESS_API_USER || '';
const WP_API_PASSWORD = process.env.WORDPRESS_API_PASSWORD || '';

interface WordPressCredentials {
  username: string;
  password: string;
}

interface PublishOptions {
  title: string;
  content: string;
  excerpt?: string;
  categories?: number[];
  tags?: string[];
  featured_media?: number;
  status?: 'publish' | 'draft' | 'pending' | 'future';
  isPrivate?: boolean;
}

// WordPress 分類和標籤介面
interface WordPressTermBase {
  id: number;
  name: string;
}

/**
 * 發布文章到WordPress
 * @param options 發布選項
 * @param credentials 認證資訊（可選，默認使用環境變數）
 * @returns 發布結果，包含文章ID和URL
 */
export async function publishPost(
  options: PublishOptions, 
  credentials?: WordPressCredentials
): Promise<{ id: number; url: string }> {
  const auth = credentials || {
    username: WP_API_USER,
    password: WP_API_PASSWORD
  };
  
  // 基本授權標頭
  const authHeader = 'Basic ' + Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
  
  try {
    const postData = {
      title: options.title,
      content: options.content,
      excerpt: options.excerpt || '',
      status: options.status || 'draft',
      categories: options.categories || [],
      tags: options.tags || [],
      featured_media: options.featured_media || 0
    };

    // 處理私密文章
    if (options.isPrivate) {
      // @ts-expect-error - WordPress API 接受 private 狀態但類型定義中未包含
      postData.status = 'private';
    }
    
    const response = await fetch(`${WP_API_BASE}/wp/v2/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(postData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`WordPress API錯誤: ${response.status} - ${JSON.stringify(errorData)}`);
    }
    
    const data = await response.json();
    return {
      id: data.id,
      url: data.link
    };
  } catch (error) {
    console.error('發布到WordPress失敗:', error);
    throw new Error(`發布文章失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
  }
}

/**
 * 驗證WordPress憑證
 * @param credentials 認證資訊
 * @returns 是否有效
 */
export async function validateCredentials(credentials: WordPressCredentials): Promise<boolean> {
  const authHeader = 'Basic ' + Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
  
  try {
    const response = await fetch(`${WP_API_BASE}/wp/v2/users/me`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader
      }
    });
    
    return response.ok;
  } catch {
    // 捕獲錯誤但不使用錯誤對象
    return false;
  }
}

/**
 * 獲取文章分類列表
 * @returns 分類列表
 */
export async function getCategories(): Promise<WordPressTermBase[]> {
  try {
    const response = await fetch(`${WP_API_BASE}/wp/v2/categories?per_page=100`);
    
    if (!response.ok) {
      throw new Error(`獲取分類失敗: ${response.status}`);
    }
    
    const categories = await response.json();
    return categories.map((cat: WordPressTermBase) => ({
      id: cat.id,
      name: cat.name
    }));
  } catch (error) {
    console.error('獲取分類失敗:', error);
    return [];
  }
}

/**
 * 獲取文章標籤列表
 * @returns 標籤列表
 */
export async function getTags(): Promise<WordPressTermBase[]> {
  try {
    const response = await fetch(`${WP_API_BASE}/wp/v2/tags?per_page=100`);
    
    if (!response.ok) {
      throw new Error(`獲取標籤失敗: ${response.status}`);
    }
    
    const tags = await response.json();
    return tags.map((tag: WordPressTermBase) => ({
      id: tag.id,
      name: tag.name
    }));
  } catch (error) {
    console.error('獲取標籤失敗:', error);
    return [];
  }
}

// WordPress 文章数据
export interface WordPressPostData {
  title: string;
  content: string;
  excerpt?: string;
  status?: 'publish' | 'draft' | 'pending' | 'private';
  categories?: number[];
  tags?: number[];
  featured_media?: number;
}

// WordPress 发布响应
interface WordPressPostResponse {
  id: number;
  link: string;
  status: string;
  title: { rendered: string };
  success: boolean;
  error?: string;
}

/**
 * 發布文章到 WordPress
 * @param credentials WordPress 認證信息
 * @param postData 文章數據
 * @returns 發布响應
 */
export async function publishToWordPress(
  credentials: WordPressCredentials,
  postData: WordPressPostData
): Promise<WordPressPostResponse> {
  try {
    // 构建 API URL
    const apiUrl = `${WP_API_BASE}/wp-json/wp/v2/posts`;
    
    // 设置認證和请求数据
    const headers = new Headers();
    headers.append('Content-Type', 'application/json');
    
    // 使用 Basic 认证
    const authString = `${credentials.username}:${credentials.password}`;
    const base64Auth = btoa(authString);
    headers.append('Authorization', `Basic ${base64Auth}`);
    
    // 发送请求
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(postData),
    });
    
    // 处理响应
    if (response.ok) {
      const data = await response.json();
      return {
        ...data,
        success: true
      };
    } else {
      const errorText = await response.text();
      console.error('發布到 WordPress 失敗:', errorText);
      return {
        id: 0,
        link: '',
        status: 'error',
        title: { rendered: '' },
        success: false,
        error: `發布失敗: ${response.status} ${response.statusText}. ${errorText}`
      };
    }
  } catch (error) {
    console.error('WordPress 服務錯誤:', error);
    return {
      id: 0,
      link: '',
      status: 'error',
      title: { rendered: '' },
      success: false,
      error: `發生錯誤: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * 上傳媒體文件到 WordPress
 * @param credentials WordPress 認證信息
 * @param file 文件對象
 * @returns 上傳後的媒體ID
 */
export async function uploadMedia(
  credentials: WordPressCredentials,
  file: File
): Promise<number> {
  try {
    const apiUrl = `${WP_API_BASE}/wp-json/wp/v2/media`;
    
    const formData = new FormData();
    formData.append('file', file);
    
    // 設置認證
    const headers = new Headers();
    const authString = `${credentials.username}:${credentials.password}`;
    const base64Auth = btoa(authString);
    headers.append('Authorization', `Basic ${base64Auth}`);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: formData
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.id;
    }
    return 0;
  } catch (error) {
    console.error('上傳媒體到 WordPress 失敗:', error);
    return 0;
  }
} 