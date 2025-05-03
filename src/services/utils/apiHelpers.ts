/**
 * API辅助工具函数
 */

/**
 * 获取API基础URL
 * 优先使用自定义API基础URL，其次使用Vercel自动分配的URL，最后使用相对URL
 */
export function getBaseUrl() {
  // 优先使用自定义API基础URL
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  
  // 其次使用Vercel自动分配的URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // 本地开发环境 - 使用相对URL
  if (process.env.NODE_ENV === 'development') {
    return ''; // 返回空字符串，这会使fetch使用相对URL
  }
  
  // 兜底方案
  return 'http://localhost:3000';
}

/**
 * 獲取API的完整URL
 * @param path API路徑，通常以/api/開頭
 * @returns 完整的API URL
 */
export function getApiUrl(path: string): string {
  // 確保路徑以/開頭
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // 在Vercel環境中，優先使用相對路徑，避免localhost問題
  if (process.env.VERCEL) {
    return normalizedPath;
  }
  
  // 優先使用環境變數中的基礎URL（與原邏輯保持一致）
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  
  // 返回完整URL
  return `${baseUrl}${normalizedPath}`;
} 