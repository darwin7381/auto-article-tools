# Clerk 路由保護官方解決方案

本文檔記錄了 Clerk 官方提供的路由保護方法，適用於 Next.js 應用程序。

## 最新發現：middleware.ts 位置問題（關鍵原因）

**重要發現**: 所有先前嘗試的方法失敗，並非因為方法本身不正確，而是因為 middleware.ts 文件放置在錯誤位置！

### 錯誤與解決方案
- **錯誤位置**: 根目錄 (`/middleware.ts`)
- **正確位置**: src 目錄下 (`/src/middleware.ts`)

Next.js 與 Clerk 要求中間件文件必須放在特定位置才能被正確識別和執行。將文件從根目錄移動到 `/src/middleware.ts` 後，路由保護立即開始正常工作。

### 關鍵教訓
1. 文件位置與命名對於 Next.js 和 Clerk 中間件功能至關重要
2. 中間件文件必須放在 `/src/middleware.ts` 位置才能被正確識別
3. 排除 middleware 功能問題時，請先檢查文件位置是否正確

## 當前採用的解決方案: 客戶端頁面級保護（暫時解法）

**重要：** 由於 middleware 方法未能成功保護所有路由，我們採用了客戶端頁面級保護的解決方案。

在每個需要保護的頁面中添加以下代碼：

```typescript
'use client';

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedPage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
    return <div className="flex justify-center items-center min-h-screen">載入中...</div>;
  }

  // 頁面內容
}
```

### 關鍵點
1. 使用 `'use client'` 指令標記為客戶端組件
2. 使用 `useUser()` hook 獲取用戶登錄狀態
3. 在 `useEffect` 中檢查登錄狀態，未登錄則重定向到 '/sign-in'
4. 渲染時也有條件判斷，未登錄顯示載入狀態

### 優點
- 更可靠 - 不依賴 middleware 的複雜路由匹配
- 更直接 - 在每個頁面直接檢查用戶登錄狀態
- 更靈活 - 可以針對不同頁面定制不同的保護邏輯

### 缺點
- 需要在每個需要保護的頁面重複實現保護邏輯
- 無法像 middleware 一樣在請求到達頁面前就進行攔截
- 可能導致頁面短暫顯示後才重定向

## 嘗試方案記錄（都未成功）

以下是之前嘗試但未成功的 middleware 解決方案：

### 嘗試失敗 1：使用官方標準的 auth.protect() 方法

> **重要提示：** 此方法也在我們的項目中嘗試失敗，無法正確保護首頁和其他路由如 `/demo/integrated-processing`。

這個方法直接使用 `auth.protect()` 而不混合手動重定向邏輯：

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// 定義公開路由（只有這些路由可以不需登入訪問）
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)', 
  '/api/clerk-webhook(.*)' 
])

export default clerkMiddleware(async (auth, req) => {
  // 如果不是公開路由，則保護它
  if (!isPublicRoute(req)) {
    // 使用官方推薦的 auth.protect() 方法，讓 Clerk 處理重定向邏輯
    await auth.protect()
  }
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
```

問題診斷：儘管使用了 Clerk 官方推薦的 `auth.protect()` 方法，系統仍然無法可靠地保護所有路由。可能的原因包括 Clerk 版本兼容性問題或與 Next.js 的特定路由處理機制衝突。

### 嘗試失敗 2：使用 clerkMiddleware 和 手動重定向

> **重要提示：** 此方法在我們的項目中嘗試失敗，無法正確保護首頁和其他路由如 `/demo/integrated-processing`。

這個方法使用 `auth()` 獲取用戶 ID，然後手動實現重定向邏輯：

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// 定義公開路由（只有這些路由可以不需登入訪問）
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)', 
  '/api/clerk-webhook(.*)' 
])

export default clerkMiddleware(async (auth, req) => {
  // 如果不是公開路由，則保護它
  if (!isPublicRoute(req)) {
    // 非公開路由必須登入
    const { userId } = await auth()
    if (!userId) {
      const signInUrl = new URL('/sign-in', req.url)
      return NextResponse.redirect(signInUrl)
    }
  }
})

export const config = {
  matcher: [
    // 明確匹配首頁
    '/',
    // 明確匹配 demo 路徑
    '/demo/(.*)',
    // 明確匹配受保護頁面
    '/protected',
    '/viewer/(.*)',
    // 跳過Next.js內部文件和靜態文件
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // 總是處理API路由
    '/(api|trpc)(.*)',
  ],
};
```

### 嘗試失敗 3：使用 auth.protect() 的簡化版本

> **重要提示：** 此方法在我們的項目中嘗試失敗，無法正確保護首頁和其他路由如 `/demo/integrated-processing`。

這是更簡化的版本，但在我們的專案中未能正常工作：

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// 定義公開路由（只有這些路由可以不需登入訪問）
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)', 
  '/api/clerk-webhook(.*)' 
]);

export default clerkMiddleware(async (auth, req) => {
  // 如果不是公開路由，則保護它
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/',                   // 明確匹配根路徑（首頁）
    // 跳過Next.js內部文件和靜態文件
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // 總是處理API路由
    '/(api|trpc)(.*)',
  ],
};
```

### 嘗試失敗 4：使用 authMiddleware (請勿使用)

**注意：此方法在我們的項目中無法正常工作，因為它使用的是錯誤的中間件函數。**

這是 **錯誤** 的實現方式，不要在項目中使用：

```typescript
import { authMiddleware } from "@clerk/nextjs";

// 所有不在此清單中的路由都需要驗證
export default authMiddleware({
  // 公開路由列表
  publicRoutes: [
    "/sign-in(.*)",         // 登入頁面
    "/sign-up(.*)",         // 註冊頁面
    "/api/clerk-webhook(.*)"// Webhook 端點
  ]
});

export const config = {
  matcher: [
    // 跳過Next.js內部文件和靜態文件
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // 明確匹配首頁
    '/',
    // 總是處理API路由
    '/(api|trpc)(.*)',
  ],
};
```

## 重要注意事項

1. **matcher 配置關鍵**：
   - 必須明確包含 `'/'` 才能保護首頁
   - 必須包含所有需要保護的路由模式
   - 可能需要同時包含路徑本身和路徑+通配符 (例如同時包含 `/demo` 和 `/demo/(.*)`)

2. **路由匹配順序**：
   - Clerk middleware 按照定義順序處理路由匹配
   - 更具體的匹配應該放在前面

3. **調試技巧**：
   - 在 middleware 中添加 `console.log(req.nextUrl.pathname)` 可以幫助調試
   - 確保每個請求都經過 middleware 處理

4. **API 路由考慮**：
   - 使用 `/(api|trpc)(.*)` 匹配器確保保護所有 API 端點
   - 將需要公開訪問的 API 添加到 公開路由列表中

5. **可能的替代解決方案**：
   - 在頁面級別添加保護而非使用 middleware（我們當前採用的方案）
   - 在每個需要保護的頁面使用 `useUser()` 或 `auth()` 進行檢查 