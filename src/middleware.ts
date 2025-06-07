import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

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
  // 如果是公開路由，直接通過
  if (isPublicRoute(req)) {
    return;
  }
  
  // 調試信息
  console.log('==== 中間件調試信息 ====');
  console.log('請求路徑:', req.nextUrl.pathname);
  
  // 檢查是否有 API Key（用於內部服務調用）
  const apiKey = req.headers.get('x-api-key');
  const expectedApiKey = process.env.API_SECRET_KEY;
  
  console.log('API Key 檢查:', apiKey ? `${apiKey.substring(0, 8)}...` : 'null');
  console.log('期望的 API Key:', expectedApiKey ? `${expectedApiKey.substring(0, 8)}...` : 'null');
  
  if (apiKey && expectedApiKey && apiKey === expectedApiKey) {
    console.log('通過 API Key 認證，允許內部調用');
    return; // API Key 有效，允許請求通過
  }
  
  // 沒有有效 API Key，檢查用戶登入狀態
  const { userId, sessionClaims } = await auth();
  
  console.log('用戶ID:', userId);
  console.log('SessionClaims:', sessionClaims);
  
  // 如果用戶未登入，重定向到登入頁面
  if (!userId) {
    console.log('未登入且無有效 API Key，重定向到登入頁面');
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
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}; 