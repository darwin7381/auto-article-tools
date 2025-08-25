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
 * 检查环境变数是否包含异常字符
 */
function validateEnvironmentVariable(name: string, value?: string): boolean {
  if (!value) return true; // 空值是可以的
  
  // 检查是否包含可能导致JSON解析错误的字符
  const problematicPatterns = [
    /```json/,
    /Request\s+En/,
    /<!DOCTYPE/i,
    /<html/i,
    /\{[\s\S]*"```json/
  ];
  
  for (const pattern of problematicPatterns) {
    if (pattern.test(value)) {
      console.error(`环境变数 ${name} 包含异常内容:`, value.substring(0, 100));
      return false;
    }
  }
  
  return true;
}

/**
 * 构建完整的API URL
 * @param path API路径，如 '/api/endpoint'
 * @returns 完整的API URL
 */
export function getApiUrl(path: string): string {
  // 在服务器端验证关键环境变数
  if (typeof window === 'undefined') {
    validateEnvironmentVariable('VERCEL_URL', process.env.VERCEL_URL);
    validateEnvironmentVariable('API_SECRET_KEY', process.env.API_SECRET_KEY);
    validateEnvironmentVariable('NEXT_PUBLIC_API_BASE_URL', process.env.NEXT_PUBLIC_API_BASE_URL);
  }
  
  const baseUrl = getBaseUrl();
  
  // 确保path以/开头
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // 确保在服务器端API路由中总是使用完整URL
  if (typeof window === 'undefined') {
    // 服务器端 - 总是使用完整URL
    if (baseUrl) {
      // 确保baseUrl包含协议前缀
      const urlWithProtocol = baseUrl.startsWith('http') 
        ? baseUrl 
        : `https://${baseUrl}`;
      
      return `${urlWithProtocol}${normalizedPath}`;
    }
    return `http://localhost:3000${normalizedPath}`;
  }
  
  // 客户端 - 可以使用相对URL
  return baseUrl ? (baseUrl.startsWith('http') ? `${baseUrl}${normalizedPath}` : `https://${baseUrl}${normalizedPath}`) : normalizedPath;
} 