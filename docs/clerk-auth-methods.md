# Clerk 認證實現指南

本文檔記錄了項目中成功實現的 Clerk 認證方法，包括路由保護和安全最佳實踐。

## 當前成功實現：Clerk Middleware 路由保護

我們已成功實現了基於 Clerk middleware 的路由保護方案，結合雙層認證架構提供完整的安全保護。

### 核心實現 (`src/middleware.ts`)

```typescript
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
    console.log('未登錄且無有效 API Key，重定向到登入頁面');
    const signInUrl = new URL('/sign-in', req.url);
    return NextResponse.redirect(signInUrl);
  }
  
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
```

## 核心特性

### 1. 🔒 **全面的路由保護**
- **自動保護**：所有非公開路由自動需要用戶登錄
- **智能重定向**：未登錄用戶自動重定向到 `/sign-in`
- **靜態資源跳過**：圖片、CSS、JS 等靜態資源不需要認證

### 2. 🔑 **雙層認證支持**
- **用戶認證**：前端用戶通過 Clerk session 認證
- **API Key 認證**：內部服務通過 API Key 認證
- **自動選擇**：middleware 自動判斷使用哪種認證方式

### 3. 📋 **公開路由管理**
- **最小化原則**：只有真正需要公開的路由才設為公開
- **安全分類**：區分認證路由、查詢 API 和受保護資源

## 環境配置

### 必需的環境變量

```bash
# .env.local

# Clerk 認證配置
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx

# API 內部調用密鑰
API_SECRET_KEY=your-strong-random-key-here

# 基礎 URL（生產環境）
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

### Clerk Dashboard 配置

1. **Domain 設置**：確保在 Clerk Dashboard 中正確配置域名
2. **Redirect URLs**：設置正確的重定向 URL
   - 開發環境：`http://localhost:3000/sign-in/[[...index]]`
   - 生產環境：`https://your-domain.com/sign-in/[[...index]]`

## 用戶體驗流程

### 1. 未登錄用戶訪問受保護頁面
```
用戶訪問 https://your-app.com/
      ↓
Clerk Middleware 檢查用戶狀態
      ↓
未登錄 → 重定向到 /sign-in
      ↓
用戶登錄成功 → 重定向回原頁面
```

### 2. 已登錄用戶正常訪問
```
用戶訪問任何頁面
      ↓
Clerk Middleware 驗證 session
      ↓
已登錄 → 直接訪問頁面內容
```

### 3. 內部 API 調用
```
API A 調用 API B
      ↓
檢查 x-api-key header
      ↓
API Key 有效 → 直接處理請求
```

## 實際應用示例

### 前端頁面訪問
```typescript
// 前端頁面不需要額外的認證代碼
// Clerk middleware 自動處理認證檢查

export default function ProtectedPage() {
  // 如果用戶未登錄，middleware 會自動重定向
  // 這裡的代碼只有登錄用戶才能看到
  
  return (
    <div>
      <h1>受保護的頁面內容</h1>
      {/* 頁面內容 */}
    </div>
  );
}
```

### 前端 API 調用
```typescript
// 前端調用 API，自動包含 Clerk session
const handleSubmit = async () => {
  try {
    const response = await fetch('/api/extract-content', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Clerk 自動添加認證信息
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error('API 調用失敗');
    }
    
    const result = await response.json();
    // 處理結果...
  } catch (error) {
    console.error('錯誤:', error);
  }
};
```

### 獲取用戶信息
```typescript
'use client';

import { useUser } from '@clerk/nextjs';

export default function UserProfile() {
  const { user, isLoaded, isSignedIn } = useUser();
  
  if (!isLoaded) {
    return <div>載入中...</div>;
  }
  
  if (!isSignedIn) {
    // 這種情況通常不會發生，因為 middleware 會重定向
    return <div>請先登錄</div>;
  }
  
  return (
    <div>
      <h1>歡迎，{user.firstName}！</h1>
      <p>Email: {user.primaryEmailAddress?.emailAddress}</p>
    </div>
  );
}
```

## 路由分類

### 🔓 **公開路由**（無需登錄）
- `/sign-in/**` - 登錄頁面
- `/sign-up/**` - 註冊頁面
- `/api/clerk-webhook/**` - Clerk webhooks
- `/api/parse-url/**` - URL 解析（查詢功能）
- `/api/process-status/**` - 處理狀態查詢

### 🔒 **受保護路由**（需要登錄）
- `/` - 首頁
- `/viewer/**` - 文檔查看器
- `/protected/**` - 明確標記的受保護頁面
- `/api/extract-content/**` - 內容提取
- `/api/process-openai/**` - AI 處理
- `/api/upload/**` - 文件上傳
- 其他所有未明確設為公開的路由

### 🔑 **內部 API**（需要 API Key）
- `/api/processors/**` - 文檔處理器

## 調試與監控

### 調試日誌
middleware 提供詳細的調試信息：

```
==== 中間件調試信息 ====
請求路徑: /api/extract-content
API Key 檢查: null
期望的 API Key: f54bc588...
用戶ID: user_2xxx
SessionClaims: { ... }
用戶已登錄，允許訪問
```

### 常見問題排查

#### 1. 無限重定向循環
```
原因：登錄頁面本身被誤設為受保護路由
解決：確保 /sign-in(.*) 在公開路由列表中
```

#### 2. 靜態資源被攔截
```
原因：matcher 配置過於寬泛
解決：檢查 matcher 是否正確排除靜態資源
```

#### 3. API 調用返回 HTML（重定向頁面）
```
原因：API 路由未正確設置認證
解決：檢查 API 是否在公開路由列表或有正確的認證
```

## 安全注意事項

### ✅ **最佳實踐**

1. **最小權限原則**：只有必要的路由才設為公開
2. **環境變量安全**：API_SECRET_KEY 絕不暴露給前端
3. **調試信息控制**：生產環境減少或移除詳細日誌
4. **定期密鑰輪換**：定期更換 API_SECRET_KEY

### ⚠️ **安全警告**

1. **不要**將認證邏輯只依賴前端檢查
2. **不要**在前端代碼中硬編碼任何密鑰
3. **不要**過度公開 API 路由
4. **不要**忽略 CORS 和其他安全 headers

## 總結

當前的 Clerk 認證實現提供了：

- **🔒 全面保護**：所有非公開路由自動受保護
- **🎯 精確控制**：靈活的公開路由配置
- **🔑 雙重認證**：支持用戶認證和服務認證
- **📊 完整監控**：詳細的認證日誌和調試信息
- **🚀 無縫體驗**：用戶無感知的認證流程

這種方案既確保了應用的安全性，又保持了良好的用戶體驗和開發效率。 