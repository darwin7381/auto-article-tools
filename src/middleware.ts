import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// 定義公開路由
const isPublicRoute = createRouteMatcher([
  // 認證相關路由
  '/sign-in(.*)',
  '/sign-up(.*)', 
  '/api/clerk-webhook(.*)',
  
  // 文件處理相關API路由 - 允許未登入也能使用這些API
  '/api/extract-content(.*)',
  '/api/process-file(.*)',
  '/api/process-pdf(.*)',
  '/api/process-url(.*)',
  '/api/process-openai(.*)',
  '/api/upload(.*)',
  '/api/parse-url(.*)',
  '/api/save-markdown(.*)',
  '/api/processors/(.*)'
])

export default clerkMiddleware(async (auth, req) => {
  // 如果是公開路由，直接通過
  if (isPublicRoute(req)) {
    return;
  }
  
  // 所有非公開路由都需要登入
  const { userId, sessionClaims } = await auth();
  
  // 調試信息
  console.log('==== 中間件調試信息 ====');
  console.log('請求路徑:', req.nextUrl.pathname);
  console.log('用戶ID:', userId);
  console.log('SessionClaims:', sessionClaims);
  
  // 如果用戶未登入，重定向到登入頁面
  if (!userId) {
    console.log('未登入，重定向到登入頁面');
    const signInUrl = new URL('/sign-in', req.url);
    return NextResponse.redirect(signInUrl);
  }
  
  // 暫時移除角色檢查，只檢查登入狀態
  // 在確定角色存儲位置後再添加角色檢查
  /*
  // 檢查用戶角色（確保至少有 bd-editor 或 admin 角色）
  const userRole = sessionClaims?.metadata ? (sessionClaims.metadata as {role?: string}).role : undefined;
  console.log('用戶角色:', userRole);
  
  if (userRole !== 'bd-editor' && userRole !== 'admin') {
    // 如果用戶沒有所需角色，重定向到登入頁面
    console.log('角色不足，重定向到登入頁面');
    const signInUrl = new URL('/sign-in', req.url);
    return NextResponse.redirect(signInUrl);
  }
  */
  
  // 用戶已登入，允許訪問
  console.log('用戶已登入，允許訪問');
  return;
})

export const config = {
  matcher: [
    // 明確匹配首頁
    '/',
    // 明確匹配 demo 路徑及其子路徑
    '/demo/(.*)',
    // 添加 demo 頁面本身
    '/demo',
    // 明確匹配受保護頁面及其子路徑
    '/protected',
    '/protected/(.*)',
    '/viewer',
    '/viewer/(.*)',
    // 跳過Next.js內部文件和靜態文件
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // 總是處理API路由
    '/(api|trpc)(.*)',
  ],
}; 