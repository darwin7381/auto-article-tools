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
 * 构建完整的API URL
 * @param path API路径，如 '/api/endpoint'
 * @returns 完整的API URL
 */
export function getApiUrl(path: string): string {
  const baseUrl = getBaseUrl();
  
  // 确保path以/开头
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // 确保在服务器端API路由中总是使用完整URL
  if (typeof window === 'undefined') {
    // 服务器端 - 总是使用完整URL
    return `${baseUrl || 'http://localhost:3000'}${normalizedPath}`;
  }
  
  // 客户端 - 可以使用相对URL
  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
} 