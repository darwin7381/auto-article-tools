'use client';

/**
 * WordPress服務 - 提供與WordPress API交互的能力
 */

// WordPress API基本URL
const WP_API_BASE = process.env.NEXT_PUBLIC_WORDPRESS_API_URL || '';
const WP_API_USER = process.env.WORDPRESS_API_USER || '';
const WP_API_PASSWORD = process.env.WORDPRESS_API_PASSWORD || '';

// 打印檢查環境變數
console.log('WordPress環境變數檢查:', {
  apiBase: WP_API_BASE,
  hasUsername: !!WP_API_USER,
  hasPassword: !!WP_API_PASSWORD,
  usernameFirstChar: WP_API_USER ? WP_API_USER.charAt(0) : '',
  passwordLength: WP_API_PASSWORD ? WP_API_PASSWORD.length : 0
});

// 創建WordPress API完整URL的通用函數
function createWpApiUrl(endpoint: string): string {
  // 打印實際使用的API基本URL
  console.log(`創建WordPress API URL: 基本URL=${WP_API_BASE}, endpoint=${endpoint}`);
  
  // 確保API基本URL是完整的絕對URL
  if (!WP_API_BASE || !WP_API_BASE.startsWith('http')) {
    console.error('WordPress API基本URL無效:', WP_API_BASE);
    throw new Error('WordPress API基本URL必須是完整的絕對URL (以http://或https://開頭)');
  }
  
  // 修正WordPress REST API路徑
  // WordPress REST API路徑應該是/wp-json/wp/v2/...而不是/wp/v2/...
  let apiPath = endpoint;
  if (endpoint.startsWith('/wp/v2/')) {
    apiPath = '/wp-json' + endpoint;
  } else if (endpoint.startsWith('/wp-json/wp/v2/')) {
    // 已經是完整路徑，不需調整
    apiPath = endpoint;
  } else if (!endpoint.startsWith('/wp-json/')) {
    apiPath = '/wp-json' + (endpoint.startsWith('/') ? endpoint : `/${endpoint}`);
  }
  
  // 移除潛在的重複斜線
  while (apiPath.includes('//')) {
    apiPath = apiPath.replace('//', '/');
  }
  if (apiPath.startsWith('/')) {
    // 確保開頭只有一個斜線
    apiPath = '/' + apiPath.replace(/^\/+/, '');
  }
  
  // 構建完整URL
  // 移除API基本URL結尾的斜線(如果有)
  const baseUrl = WP_API_BASE.endsWith('/') ? WP_API_BASE.slice(0, -1) : WP_API_BASE;
  const fullUrl = `${baseUrl}${apiPath}`;
  console.log(`完整WordPress API URL: ${fullUrl}`);
  
  return fullUrl;
}

export interface WordPressCredentials {
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

// 創建認證標頭
function createAuthHeader(credentials: WordPressCredentials): string {
  const { username, password } = credentials;
  
  // 檢查認證信息是否有效
  if (!username || !password) {
    throw new Error('WordPress認證信息不完整，必須提供用戶名和密碼');
  }
  
  // 使用Basic認證，將用戶名和密碼進行Base64編碼
  // 注意：密碼中可能包含空格，需要原樣保留
  try {
    const authString = `${username}:${password}`;
    const base64Auth = Buffer.from(authString).toString('base64');
    return `Basic ${base64Auth}`;
  } catch (error) {
    console.error('創建認證標頭失敗:', error);
    throw new Error('無法創建WordPress認證標頭');
  }
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
  
  // 使用新函數創建基本授權標頭
  const authHeader = createAuthHeader(auth);
  
  // 構建完整的API URL
  const apiUrl = createWpApiUrl('/wp-json/wp/v2/posts');
  
  // 添加更詳細的日誌以便調試
  console.log("publishPost函數執行:", {
    apiUrl,
    hasUsername: !!auth.username,
    hasPassword: !!auth.password,
    titleLength: options.title.length,
    contentLength: options.content.length
  });
  
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

    // 打印更多詳細信息以便調試
    console.log("發送WordPress請求:", {
      url: apiUrl,
      method: 'POST',
      hasAuthHeader: !!authHeader,
      authHeaderPrefix: authHeader.substring(0, 10) + '...',
      contentType: 'application/json',
      dataKeys: Object.keys(postData)
    });
    
    // 增加fetch選項
    const fetchOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'Accept': 'application/json'
      },
      body: JSON.stringify(postData),
      mode: 'cors' as RequestMode,
      credentials: 'omit' as RequestCredentials,
      cache: 'no-cache' as RequestCache,
      redirect: 'follow' as RequestRedirect,
      referrerPolicy: 'no-referrer' as ReferrerPolicy
    };
    
    console.log("Fetch選項:", JSON.stringify({
      ...fetchOptions,
      headers: {
        ...Object.fromEntries(Object.entries(fetchOptions.headers)), 
        'Authorization': '******' // 隱藏認證信息
      },
      body: '(body content omitted)'
    }, null, 2));
    
    // 使用try/catch專門捕獲fetch錯誤
    let response;
    try {
      response = await fetch(apiUrl, fetchOptions);
    } catch (fetchError) {
      console.error("Fetch請求失敗:", fetchError);
      // 提供更詳細的錯誤信息
      const errorDetails = fetchError instanceof Error ? {
        name: fetchError.name,
        message: fetchError.message,
        stack: fetchError.stack
      } : String(fetchError);
      
      throw new Error(`網絡請求失敗: ${JSON.stringify(errorDetails)}`);
    }
    
    // 添加響應信息日誌
    console.log("WordPress API響應:", {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type'),
      ok: response.ok
    });
    
    if (!response.ok) {
      // 改進錯誤處理邏輯
      const contentType = response.headers.get("content-type") || "";
      
      // 檢查回應是不是JSON格式
      if (contentType.includes("application/json")) {
        const errorData = await response.json();
        console.error("WordPress錯誤響應(JSON):", errorData);
        
        // 處理特定的錯誤
        if (errorData.code === 'rest_cannot_create') {
          throw new Error(`WordPress授權錯誤: 此用戶沒有創建文章的權限。請確保用戶名和密碼正確，且用戶具有發布文章權限。`);
        } else {
          throw new Error(`WordPress API錯誤: ${response.status} - ${JSON.stringify(errorData)}`);
        }
      } else {
        // 對於非JSON回應，獲取文本內容
        const errorText = await response.text();
        console.error("WordPress錯誤響應(非JSON):", {
          text: errorText.substring(0, 300),
          length: errorText.length
        });
        throw new Error(`WordPress API錯誤: ${response.status} - ${errorText.substring(0, 150)}...`);
      }
    }
    
    const data = await response.json();
    console.log("WordPress發布成功:", {
      id: data.id,
      link: data.link
    });
    
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
    const apiUrl = createWpApiUrl('/wp/v2/users/me');
    const response = await fetch(apiUrl, {
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
    const apiUrl = createWpApiUrl('/wp/v2/categories?per_page=100');
    const response = await fetch(apiUrl);
    
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
    const apiUrl = createWpApiUrl('/wp/v2/tags?per_page=100');
    const response = await fetch(apiUrl);
    
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
    const apiUrl = createWpApiUrl('/wp-json/wp/v2/posts');
    
    // 使用 Basic 认证
    const authString = `${credentials.username}:${credentials.password}`;
    const base64Auth = btoa(authString);
    
    // 打印詳細日誌以便調試
    console.log("publishToWordPress發送請求:", {
      url: apiUrl,
      method: 'POST',
      hasAuthHeader: true,
      contentType: 'application/json',
      dataKeys: Object.keys(postData)
    });
    
    // 設置請求選項，與publishPost保持一致
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${base64Auth}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(postData),
      mode: 'cors' as RequestMode,
      credentials: 'omit' as RequestCredentials,
      cache: 'no-cache' as RequestCache,
      redirect: 'follow' as RequestRedirect,
      referrerPolicy: 'no-referrer' as ReferrerPolicy
    };
    
    console.log("publishToWordPress請求選項:", JSON.stringify({
      ...requestOptions,
      headers: Object.fromEntries(Object.entries(requestOptions.headers)),
      body: '(body content omitted)'
    }, null, 2));
    
    // 发送请求並捕捉網絡錯誤
    let response;
    try {
      response = await fetch(apiUrl, requestOptions);
    } catch (fetchError) {
      console.error("publishToWordPress fetch失敗:", fetchError);
      return {
        id: 0,
        link: '',
        status: 'error',
        title: { rendered: '' },
        success: false,
        error: `網絡請求失敗: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`
      };
    }
    
    // 添加響應信息日誌
    console.log("publishToWordPress響應:", {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type'),
      ok: response.ok
    });
    
    // 处理响应
    if (response.ok) {
      const data = await response.json();
      return {
        ...data,
        success: true
      };
    } else {
      // 改進錯誤處理邏輯
      const contentType = response.headers.get("content-type") || "";
      let errorText = "";
      
      try {
        // 檢查回應是不是JSON格式
        if (contentType.includes("application/json")) {
          const errorData = await response.json();
          console.error("WordPress錯誤響應(JSON):", errorData);
          errorText = JSON.stringify(errorData);
        } else {
          // 對於非JSON回應，獲取文本內容
          errorText = await response.text();
          console.error("WordPress錯誤響應(非JSON):", {
            text: errorText.substring(0, 300),
            length: errorText.length
          });
        }
      } catch (parseError) {
        errorText = "無法解析錯誤響應";
        console.error("解析錯誤響應失敗:", parseError);
      }
      
      return {
        id: 0,
        link: '',
        status: 'error',
        title: { rendered: '' },
        success: false,
        error: `發布失敗: ${response.status} ${response.statusText}. ${errorText.substring(0, 150)}...`
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
    const apiUrl = createWpApiUrl('/wp/v2/media');
    
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