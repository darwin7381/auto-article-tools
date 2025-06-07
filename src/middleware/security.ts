import { NextRequest, NextResponse } from 'next/server';

// 簡單的內存速率限制器（生產環境建議使用 Redis）
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

/**
 * 速率限制配置
 */
const RATE_LIMIT_CONFIG = {
  // API 認證嘗試限制
  auth: {
    maxAttempts: 10,      // 10分鐘內最多10次認證嘗試
    windowMs: 10 * 60 * 1000,
  },
  // 一般 API 調用限制
  api: {
    maxAttempts: 100,     // 10分鐘內最多100次API調用
    windowMs: 10 * 60 * 1000,
  },
  // 文件上傳限制
  upload: {
    maxAttempts: 20,      // 10分鐘內最多20次上傳
    windowMs: 10 * 60 * 1000,
  }
};

/**
 * 獲取客戶端識別碼
 */
function getClientId(req: NextRequest): string {
  // 優先使用 X-Forwarded-For (代理/負載均衡器)
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  // 其次使用 X-Real-IP
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  // 最後使用默認值
  return 'unknown';
}

/**
 * 速率限制檢查
 */
export function checkRateLimit(
  clientId: string, 
  limitType: keyof typeof RATE_LIMIT_CONFIG
): { allowed: boolean; resetTime?: number } {
  const config = RATE_LIMIT_CONFIG[limitType];
  const key = `${limitType}:${clientId}`;
  const now = Date.now();
  
  const entry = rateLimitMap.get(key);
  
  if (!entry || now > entry.resetTime) {
    // 第一次訪問或窗口重置
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + config.windowMs
    });
    return { allowed: true };
  }
  
  if (entry.count >= config.maxAttempts) {
    // 超過限制
    return { 
      allowed: false, 
      resetTime: entry.resetTime 
    };
  }
  
  // 增加計數
  entry.count++;
  return { allowed: true };
}

/**
 * 清理過期的速率限制記錄
 */
function cleanupRateLimit() {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}

// 每5分鐘清理一次過期記錄
setInterval(cleanupRateLimit, 5 * 60 * 1000);

/**
 * 添加安全頭部
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // 防止點擊劫持
  response.headers.set('X-Frame-Options', 'DENY');
  
  // 防止 MIME 類型嗅探
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // XSS 保護
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // 引用者策略
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // 權限策略
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // HSTS (僅在 HTTPS 環境)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  return response;
}

/**
 * 安全中間件主函數
 */
export function securityMiddleware(req: NextRequest): NextResponse | null {
  const clientId = getClientId(req);
  const pathname = req.nextUrl.pathname;
  
  // 確定速率限制類型
  let limitType: keyof typeof RATE_LIMIT_CONFIG = 'api';
  
  if (pathname.includes('/upload') || pathname.includes('/process-file')) {
    limitType = 'upload';
  } else if (pathname.includes('/sign-in') || pathname.includes('/api/auth')) {
    limitType = 'auth';
  }
  
  // 檢查速率限制
  const { allowed, resetTime } = checkRateLimit(clientId, limitType);
  
  if (!allowed) {
    const retryAfter = resetTime ? Math.ceil((resetTime - Date.now()) / 1000) : 600;
    
    return new NextResponse(JSON.stringify({
      error: '請求過於頻繁',
      message: `請在 ${retryAfter} 秒後重試`,
      code: 'RATE_LIMIT_EXCEEDED'
    }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
        'X-Rate-Limit-Limit': RATE_LIMIT_CONFIG[limitType].maxAttempts.toString(),
        'X-Rate-Limit-Reset': resetTime?.toString() || '',
      }
    });
  }
  
  return null; // 繼續處理
}

/**
 * 檢測可疑請求模式
 */
export function detectSuspiciousActivity(req: NextRequest): boolean {
  const userAgent = req.headers.get('user-agent') || '';
  const pathname = req.nextUrl.pathname;
  
  // 檢測已知的攻擊模式
  const suspiciousPatterns = [
    /sqlmap/i,
    /nikto/i,
    /nmap/i,
    /python-requests/i,
    /curl\/[0-9]/,
    /wget/i
  ];
  
  // 檢測路徑遍歷攻擊
  const pathTraversalPatterns = [
    /\.\.\//,
    /\.\.\\/,
    /%2e%2e%2f/i,
    /%252e%252e%252f/i
  ];
  
  // 檢測 SQL 注入嘗試
  const sqlInjectionPatterns = [
    /(\bUNION\b)|(\bSELECT\b)|(\bDROP\b)|(\bINSERT\b)|(\bDELETE\b)/i,
    /'(\s)*(or|and)(\s)*'/i,
    /(--|#|\/\*)/
  ];
  
  // 檢查 User-Agent
  if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
    return true;
  }
  
  // 檢查路徑
  if (pathTraversalPatterns.some(pattern => pattern.test(pathname))) {
    return true;
  }
  
  // 檢查查詢參數中的 SQL 注入
  const searchParams = req.nextUrl.searchParams.toString();
  if (sqlInjectionPatterns.some(pattern => pattern.test(searchParams))) {
    return true;
  }
  
  return false;
} 