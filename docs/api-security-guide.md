# API 安全認證指南

本文檔詳細說明當前 API 安全認證架構的實現方法和最佳實踐。

## 當前認證架構概述

我們採用**雙層認證架構**，確保 API 安全的同時支持不同的使用場景：

### 🔒 **外層：Clerk Middleware 保護**
- **保護範圍**：所有非公開的 API 路由
- **認證方式**：Clerk 用戶會話
- **適用場景**：前端用戶訪問

### 🔑 **內層：API Key 認證**
- **保護範圍**：需要內部調用的 API
- **認證方式**：`x-api-key` header + `API_SECRET_KEY`
- **適用場景**：API 間的服務器通信

## 認證流程

```
前端請求 → Clerk Middleware → API 處理邏輯
                ↓ (如果需要調用其他API)
               API Key 認證 → 內部 API 調用
```

### 1. 前端 → API 調用
```typescript
// 用戶登錄後，前端直接調用，無需 API Key
const response = await fetch('/api/extract-content', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // Clerk 自動處理認證，無需額外 headers
  },
  body: JSON.stringify(data)
});
```

### 2. API → 內部 API 調用
```typescript
// 內部 API 調用需要 API Key
const internalApiHeaders = {
  'Content-Type': 'application/json',
  'x-api-key': process.env.API_SECRET_KEY,
};

const response = await fetch('http://localhost:3000/api/processors/process-docx', {
  method: 'POST',
  headers: internalApiHeaders,
  body: JSON.stringify(data)
});
```

## 實現詳情

### 1. Clerk Middleware 配置 (`src/middleware.ts`)

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// 定義公開路由 - 只保留真正應該公開的路由
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)', 
  '/api/clerk-webhook(.*)',
  '/api/parse-url(.*)',        // URL 解析 - 查詢類型，可公開
  '/api/process-status(.*)',   // 狀態查詢 - 查詢類型，可公開
])

export default clerkMiddleware(async (auth, req) => {
  // 公開路由直接通過
  if (isPublicRoute(req)) {
    return;
  }
  
  // 檢查 API Key（用於內部服務調用）
  const apiKey = req.headers.get('x-api-key');
  const expectedApiKey = process.env.API_SECRET_KEY;
  
  if (apiKey && expectedApiKey && apiKey === expectedApiKey) {
    console.log('通過 API Key 認證，允許內部調用');
    return; // API Key 有效，允許請求通過
  }
  
  // 檢查用戶登錄狀態
  const { userId } = await auth();
  
  if (!userId) {
    console.log('未登錄且無有效 API Key，重定向到登錄頁面');
    const signInUrl = new URL('/sign-in', req.url);
    return NextResponse.redirect(signInUrl);
  }
  
  console.log('用戶已登錄，允許訪問');
  return;
})
```

### 2. 內層 API Key 認證 (`src/middleware/api-auth.ts`)

```typescript
import { NextResponse } from 'next/server';

export async function apiAuth(request: Request) {
  console.log('[API Auth] 開始認證檢查...');
  console.log('[API Auth] 請求 URL:', request.url);
  
  // 檢查 API Key
  console.log('[API Auth] 檢查 API Key...');
  const apiKey = request.headers.get('x-api-key');
  const expectedApiKey = process.env.API_SECRET_KEY;
  
  if (!apiKey) {
    console.log('[API Auth] 缺少 API Key');
    return NextResponse.json(
      { error: '訪問被拒絕', message: '缺少必要的認證信息' },
      { status: 401 }
    );
  }
  
  if (!expectedApiKey) {
    console.error('[API Auth] 服務器未配置 API Key');
    return NextResponse.json(
      { error: '服務器配置錯誤', message: '認證服務不可用' },
      { status: 500 }
    );
  }
  
  if (apiKey !== expectedApiKey) {
    console.log('[API Auth] API Key 不匹配');
    return NextResponse.json(
      { error: '認證失敗', message: '無效的認證信息' },
      { status: 401 }
    );
  }
  
  console.log('[API Auth] 通過 API Key 認證成功');
  return null; // 認證成功
}
```

### 3. API 實現模式

#### A. 前端直接調用的 API（如 `/api/process-openai`）
```typescript
export async function POST(request: Request) {
  // 此 API 已被 Clerk middleware 保護，不需要額外的 API Key 檢查
  // 前端調用會自動包含 Clerk session 信息
  
  try {
    // 處理邏輯...
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('處理錯誤:', error);
    return NextResponse.json({ error: '處理失敗' }, { status: 500 });
  }
}
```

#### B. 內部調用的 API（如 `/api/processors/process-docx`）
```typescript
import { apiAuth } from '@/middleware/api-auth';

export async function POST(request: Request) {
  // API 認證檢查 - 需要 API Key
  const authResponse = await apiAuth(request);
  if (authResponse) return authResponse;

  try {
    // 處理邏輯...
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('處理錯誤:', error);
    return NextResponse.json({ error: '處理失敗' }, { status: 500 });
  }
}
```

### 4. 內部 API 調用工具函數

```typescript
// src/utils/api-internal.ts
export function getApiUrl(path: string): string {
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? process.env.NEXT_PUBLIC_BASE_URL || 'https://your-domain.com'
    : 'http://localhost:3000';
  
  return `${baseUrl}${path}`;
}

export const internalApiHeaders = {
  'Content-Type': 'application/json',
  'x-api-key': process.env.API_SECRET_KEY,
};

// 使用示例
const response = await fetch(getApiUrl('/api/processors/process-docx'), {
  method: 'POST',
  headers: internalApiHeaders,
  body: JSON.stringify(data)
});
```

## 環境變量配置

### 必需的環境變量

```bash
# .env.local

# Clerk 認證配置
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx

# API 內部調用密鑰（**絕不**使用 NEXT_PUBLIC_ 前綴）
API_SECRET_KEY=your-strong-random-key-here

# 其他配置...
NEXT_PUBLIC_BASE_URL=https://your-domain.com  # 生產環境
```

### 生成安全的 API Key

```bash
# 使用 Node.js 生成隨機密鑰
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 或使用 OpenSSL
openssl rand -hex 32
```

## 安全最佳實踐

### ✅ 正確做法

1. **分層認證**：外層 Clerk 保護用戶，內層 API Key 保護服務
2. **最小權限**：只有需要內部調用的 API 才使用 API Key 認證
3. **環境分離**：不同環境使用不同的 API Key
4. **日誌記錄**：記錄所有認證嘗試，便於監控
5. **HTTPS 傳輸**：所有生產環境請求必須使用 HTTPS

### ❌ 避免做法

1. **混合認證在單一 API**：不要在同一個 API 中混合兩種認證方式
2. **前端暴露 API Key**：絕不在前端代碼中使用 API Key
3. **硬編碼密鑰**：永遠不要在代碼中硬編碼任何密鑰
4. **弱密鑰**：避免使用簡單或可預測的 API Key

## 當前 API 分類

### 🔓 公開 API（無需認證）
- `/api/parse-url` - URL 解析
- `/api/process-status` - 狀態查詢

### 🔒 用戶 API（Clerk 認證）
- `/api/extract-content` - 內容提取
- `/api/process-openai` - AI 處理
- `/api/upload` - 文件上傳
- `/api/save-markdown` - 保存文檔

### 🔑 內部 API（API Key 認證）
- `/api/processors/process-pdf` - PDF 處理
- `/api/processors/process-docx` - DOCX 處理
- `/api/processors/process-gdocs` - Google Docs 處理

## 故障排除

### 常見問題

#### 1. 前端調用 API 返回 401
```
原因：用戶未登錄或 Clerk session 過期
解決：檢查用戶登錄狀態，必要時重新登錄
```

#### 2. 內部 API 調用失敗
```
原因：缺少 API Key 或 API Key 不正確
解決：檢查環境變量 API_SECRET_KEY 是否設置
```

#### 3. API Key 認證通過但仍然被拒絕
```
原因：可能是 Clerk middleware 重定向
解決：確認該 API 是否應該在公開路由列表中
```

### 調試工具

```typescript
// 添加詳細的認證日誌
console.log('==== 認證調試信息 ====');
console.log('請求路徑:', req.nextUrl.pathname);
console.log('API Key:', apiKey ? `${apiKey.substring(0, 8)}...` : 'null');
console.log('用戶ID:', userId);
console.log('========================');
```

## 總結

當前的雙層認證架構提供了清晰的職責分離：

- **Clerk Middleware**：保護整個應用，確保只有登錄用戶可以訪問
- **API Key 認證**：保護內部 API，防止未授權的服務器間調用

這種設計既確保了安全性，又保持了架構的清晰性和可維護性。 