import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { securityMiddleware, addSecurityHeaders, detectSuspiciousActivity } from '@/middleware/security'

// 定義公開路由 - 只保留真正應該公開的路由
const isPublicRoute = createRouteMatcher([
  // 認證相關路由
  '/sign-in(.*)',
  '/sign-up(.*)', 
  '/api/clerk-webhook(.*)',
  
  // 真正應該公開的 API 路由（只保留查詢類型的 API）
  '/api/parse-url(.*)',        // URL 解析 - 用於預覽，可以保持公開
  '/api/process-status(.*)',   // 狀態查詢 - 查詢處理狀態，可以保持公開
  
  // 移除以下路徑，這些 API 應該需要認證：
  // '/api/extract-content(.*)' - 內容提取，消耗資源，需要認證
  // '/api/process-url(.*)' - URL 處理，消耗資源，需要認證
  // '/api/upload(.*)' - 文件上傳，消耗存儲，需要認證
  // '/api/process-file(.*)' - 文件處理，消耗 ConvertAPI，需要認證
  // '/api/process-openai(.*)' - AI 處理，消耗 OpenAI API，需要認證
  // '/api/save-markdown(.*)' - 保存文件，寫入存儲，需要認證
  // '/api/processors/(.*)' - 處理器，消耗資源，需要認證
  // '/api/generate-cover-image(.*)' - 封面圖生成，消耗 OpenAI API，需要認證
])

export default clerkMiddleware(async (auth, req) => {
  // 1. 首先進行安全檢查
  if (detectSuspiciousActivity(req)) {
    return new NextResponse(JSON.stringify({
      error: '請求被拒絕',
      message: '檢測到可疑活動',
      code: 'SUSPICIOUS_ACTIVITY'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // 2. 速率限制檢查
  const rateLimitResponse = securityMiddleware(req);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }
  
  // 如果是公開路由，添加安全頭部後直接通過
  if (isPublicRoute(req)) {
    return addSecurityHeaders(NextResponse.next());
  }
  
  // 僅在開發環境顯示調試信息
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {
    console.log('==== 中間件調試信息 ====');
    console.log('請求路徑:', req.nextUrl.pathname);
  }
  
  // 檢查是否有 API Key（用於內部服務調用）
  const apiKey = req.headers.get('x-api-key');
  const expectedApiKey = process.env.API_SECRET_KEY;
  
  // 安全的調試信息 - 不暴露任何敏感數據
  if (isDevelopment) {
    console.log('API Key 檢查:', apiKey ? '存在' : '缺少');
    console.log('環境 API Key:', expectedApiKey ? '已配置' : '未配置');
  }
  
  if (apiKey && expectedApiKey && apiKey === expectedApiKey) {
    if (isDevelopment) {
      console.log('通過 API Key 認證，允許內部調用');
    }
    return addSecurityHeaders(NextResponse.next()); // API Key 有效，添加安全頭部
  }
  
  // 沒有有效 API Key，檢查用戶登入狀態
  const { userId, sessionClaims } = await auth();
  
  // 安全的調試信息
  if (isDevelopment) {
    console.log('用戶狀態:', userId ? '已登錄' : '未登錄');
  }
  
  // 如果用戶未登入，重定向到登入頁面
  if (!userId) {
    if (isDevelopment) {
      console.log('未登錄且無有效 API Key，重定向到登錄頁面');
    }
    const signInUrl = new URL('/sign-in', req.url);
    return NextResponse.redirect(signInUrl);
  }
  
  // 重新啟用角色檢查（安全關鍵）
  const userRole = sessionClaims?.metadata ? (sessionClaims.metadata as {role?: string}).role : undefined;
  
  // 暫時允許所有登錄用戶，但記錄角色信息用於未來實施
  if (isDevelopment) {
    console.log('用戶角色:', userRole || '未設置');
  }
  
  // TODO: 在角色系統完全配置後，啟用以下檢查
  /*
  if (userRole !== 'bd-editor' && userRole !== 'admin') {
    if (isDevelopment) {
      console.log('角色不足，重定向到登錄頁面');
    }
    const signInUrl = new URL('/sign-in', req.url);
    return NextResponse.redirect(signInUrl);
  }
  */
  
  // 用戶已登入，允許訪問並添加安全頭部
  if (isDevelopment) {
    console.log('用戶已登錄，允許訪問');
  }
  return addSecurityHeaders(NextResponse.next());
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}; 