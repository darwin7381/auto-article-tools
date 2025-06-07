# Clerk 認證故障排除指南

本文檔提供 Clerk 認證系統的配置指南和常見問題解決方案，適用於當前的雙層認證架構。

## 當前認證架構概述

我們使用雙層認證架構：

```
外層：Clerk Middleware（用戶認證）
  ↓
內層：API Key 認證（服務間通信）
```

### 核心組件

1. **Clerk Provider** (`src/app/providers.tsx`) - 全局認證提供者
2. **Middleware** (`src/middleware.ts`) - 路由保護和認證檢查
3. **API Auth** (`src/middleware/api-auth.ts`) - API Key 認證
4. **登錄頁面** (`/sign-in`) - 用戶認證入口

## 環境配置

### 必需的環境變量

```bash
# .env.local

# Clerk 認證配置
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx

# API 內部調用密鑰
API_SECRET_KEY=your-strong-random-key-here

# 生產環境配置（部署時需要）
NEXT_PUBLIC_BASE_URL=https://your-domain.com
CLERK_TRUST_HOST=true
```

### Clerk Dashboard 配置

1. **允許的域名**：
   - 開發環境：`localhost:3000`
   - 生產環境：`your-domain.com`

2. **重定向 URLs**：
   - 開發環境：`http://localhost:3000/sign-in/[[...index]]`
   - 生產環境：`https://your-domain.com/sign-in/[[...index]]`

3. **Google OAuth 設置**：
   - 回調 URL：`https://accounts.your-clerk-instance.clerk.accounts.dev/v1/oauth/callback/google`

## 常見問題與解決方案

### 1. 無限重定向循環

**症狀**：頁面不停地重定向到登錄頁面

**原因**：
- 登錄頁面被誤設為受保護路由
- middleware 配置錯誤

**解決方案**：
```typescript
// middleware.ts 中確保登錄頁面在公開路由列表
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',  // 確保這行存在
  '/sign-up(.*)', 
  '/api/clerk-webhook(.*)',
  // 其他公開路由...
])
```

### 2. API 調用返回 HTML 而非 JSON

**症狀**：前端 API 調用收到 HTML 內容（通常是登錄頁面）

**原因**：
- API 路由未正確認證
- middleware 將 API 請求重定向到登錄頁面

**解決方案**：
```typescript
// 檢查 API 是否在正確的認證類別中
// 對於用戶 API - 確保用戶已登錄
// 對於內部 API - 確保有正確的 API Key

// 調試：查看 middleware 日誌
console.log('==== 中間件調試信息 ====');
console.log('請求路徑:', req.nextUrl.pathname);
console.log('用戶ID:', userId);
```

### 3. 內部 API 調用失敗

**症狀**：API 間調用返回 401 認證失敗

**原因**：
- 缺少 API_SECRET_KEY 環境變量
- API Key 不正確
- headers 設置錯誤

**解決方案**：
```typescript
// 檢查環境變量
console.log('API_SECRET_KEY 是否設置:', !!process.env.API_SECRET_KEY);

// 檢查調用 headers
const internalApiHeaders = {
  'Content-Type': 'application/json',
  'x-api-key': process.env.API_SECRET_KEY, // 確保這個值存在
};

// 使用正確的調用方式
const response = await fetch(getApiUrl('/api/processors/process-docx'), {
  method: 'POST',
  headers: internalApiHeaders,
  body: JSON.stringify(data)
});
```

### 4. 用戶登錄後仍然被拒絕訪問

**症狀**：用戶已登錄但仍然無法訪問受保護頁面

**原因**：
- Clerk session 未正確初始化
- 瀏覽器緩存問題
- Clerk 配置問題

**解決方案**：
```typescript
// 1. 檢查用戶狀態
'use client';
import { useUser } from '@clerk/nextjs';

function DebugUserStatus() {
  const { user, isSignedIn, isLoaded } = useUser();
  
  console.log('用戶狀態:', { 
    isLoaded, 
    isSignedIn, 
    userId: user?.id 
  });
  
  return <div>檢查控制台</div>;
}

// 2. 清除瀏覽器緩存和 cookies
// 3. 重新登錄測試
```

### 5. 生產環境登錄失敗

**症狀**：本地環境正常，生產環境無法登錄

**原因**：
- 環境變量未正確設置
- Clerk Dashboard 域名配置錯誤
- CORS 問題

**解決方案**：
```bash
# 1. 檢查 Vercel 環境變量設置
# 確保所有必需的環境變量都已設置

# 2. 更新 Clerk Dashboard 設置
# - 添加生產域名到允許列表
# - 更新重定向 URLs

# 3. 設置 CLERK_TRUST_HOST
CLERK_TRUST_HOST=true
```

### 6. 開發環境認證慢或不穩定

**症狀**：開發環境中認證響應慢或偶爾失敗

**原因**：
- 網絡連接問題
- Clerk 服務暫時不可用
- 過多的認證檢查

**解決方案**：
```typescript
// 1. 添加錯誤重試機制
const checkAuthWithRetry = async (retries = 3) => {
  try {
    const { userId } = await auth();
    return userId;
  } catch (error) {
    if (retries > 0) {
      console.warn(`認證檢查失敗，重試中... (剩餘 ${retries} 次)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return checkAuthWithRetry(retries - 1);
    }
    throw error;
  }
};

// 2. 優化 middleware 性能
// 避免過多的 console.log 在生產環境
```

## 調試工具

### 1. 認證狀態檢查工具

```typescript
// src/components/debug/AuthStatus.tsx
'use client';
import { useUser, useAuth } from '@clerk/nextjs';

export function AuthStatus() {
  const { user, isSignedIn, isLoaded } = useUser();
  const { userId, sessionId } = useAuth();
  
  if (!isLoaded) return <div>載入中...</div>;
  
  return (
    <div className="p-4 bg-gray-100 rounded">
      <h3>認證狀態</h3>
      <p>已登錄: {isSignedIn ? '是' : '否'}</p>
      <p>用戶 ID: {userId || '無'}</p>
      <p>Session ID: {sessionId || '無'}</p>
      <p>用戶 Email: {user?.primaryEmailAddress?.emailAddress || '無'}</p>
    </div>
  );
}
```

### 2. API 測試工具

```typescript
// src/utils/debug/api-test.ts
export const testApiAuth = async () => {
  console.log('=== API 認證測試 ===');
  
  // 測試用戶 API
  try {
    const response = await fetch('/api/extract-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true })
    });
    
    console.log('用戶 API 狀態:', response.status);
    console.log('用戶 API 響應:', await response.text());
  } catch (error) {
    console.error('用戶 API 測試失敗:', error);
  }
  
  // 測試內部 API
  try {
    const response = await fetch('/api/processors/process-docx', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.NEXT_PUBLIC_TEST_API_KEY // 僅用於測試
      },
      body: JSON.stringify({ test: true })
    });
    
    console.log('內部 API 狀態:', response.status);
    console.log('內部 API 響應:', await response.text());
  } catch (error) {
    console.error('內部 API 測試失敗:', error);
  }
};
```

## 生產環境部署檢查清單

### 部署前檢查

- ✅ 所有環境變量已設置
- ✅ Clerk Dashboard 域名配置正確
- ✅ Google OAuth 重定向 URLs 更新
- ✅ API_SECRET_KEY 已生成並設置
- ✅ 本地生產模式測試通過

### 部署後驗證

- ✅ 用戶可以正常登錄
- ✅ 登錄後可以訪問受保護頁面
- ✅ API 調用正常工作
- ✅ 登出功能正常
- ✅ 重定向邏輯正確

## 限制登錄域名（企業應用）

如果需要限制只允許特定域名的 Google 帳號登錄：

### 1. Clerk Dashboard 設置

1. 導航到 "User & Authentication" > "Social Connections"
2. 點擊 Google 提供商的設置
3. 開啟 "Restrict to domain" 功能
4. 添加公司域名（例如 `company.com`）

### 2. 自定義驗證邏輯

```typescript
// 在 middleware 中添加域名檢查
export default clerkMiddleware(async (auth, req) => {
  // 現有認證邏輯...
  
  const { userId, sessionClaims } = await auth();
  
  if (userId) {
    // 檢查用戶 email 域名
    const userEmail = sessionClaims?.email as string;
    if (userEmail && !userEmail.endsWith('@yourcompany.com')) {
      console.log('用戶域名不符合要求:', userEmail);
      // 重定向到錯誤頁面或登出
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }
  }
  
  // 繼續正常流程...
});
```

## 效能優化建議

### 1. 減少認證檢查頻率

```typescript
// 使用 React Context 緩存用戶狀態
// 避免在每個組件中重複調用 useUser()
```

### 2. 優化 middleware 性能

```typescript
// 在生產環境中減少日誌輸出
const isProduction = process.env.NODE_ENV === 'production';

if (!isProduction) {
  console.log('調試信息:', debugData);
}
```

### 3. 合理設置緩存

```typescript
// 對於不變的用戶信息，可以適當緩存
// 避免過於頻繁的認證檢查
```

## 總結

遵循上述故障排除指南可以解決大多數 Clerk 認證問題。關鍵要點：

- **正確配置環境變量**
- **確保 middleware 邏輯正確**
- **區分用戶 API 和內部 API 的認證方式**
- **使用調試工具定位問題**
- **生產環境部署前進行完整測試**

如果遇到未涵蓋的問題，請檢查 Clerk 官方文檔或聯繫技術支援。
