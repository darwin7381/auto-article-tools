# API 開發標準與認證規範

本文檔定義了項目中 API 開發的標準和最佳實踐，包括認證機制、響應格式、錯誤處理等關鍵規範。

## 認證架構標準

### 🔐 雙層認證架構

我們採用雙層認證架構，確保安全性的同時支持不同使用場景：

```
外層：Clerk Middleware（用戶認證）
  ↓
內層：API Key 認證（服務間通信）
```

### 1. API 分類與認證要求

#### 🔓 **公開 API**（無需認證）
```typescript
// 示例：URL 解析 API
export async function POST(request: Request) {
  // 無需認證檢查，直接處理
  try {
    // 處理邏輯...
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleApiError(error);
  }
}
```

**公開 API 列表：**
- `/api/parse-url` - URL 解析
- `/api/process-status` - 狀態查詢
- `/api/clerk-webhook` - Clerk webhooks

#### 🔒 **用戶 API**（Clerk 認證）
```typescript
// 示例：內容提取 API - 已被 Clerk middleware 保護
export async function POST(request: Request) {
  // 此 API 已被 Clerk middleware 保護，用戶必須登錄
  // 無需額外的認證檢查
  
  try {
    // 處理邏輯...
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleApiError(error);
  }
}
```

**用戶 API 列表：**
- `/api/extract-content` - 內容提取
- `/api/process-openai` - AI 處理
- `/api/upload` - 文件上傳
- `/api/save-markdown` - 保存文檔

#### 🔑 **內部 API**（API Key 認證）
```typescript
import { apiAuth } from '@/middleware/api-auth';

// 示例：文檔處理器 - 需要 API Key
export async function POST(request: Request) {
  // API 認證檢查 - 需要 API Key
  const authResponse = await apiAuth(request);
  if (authResponse) return authResponse;

  try {
    // 處理邏輯...
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleApiError(error);
  }
}
```

**內部 API 列表：**
- `/api/processors/process-pdf` - PDF 處理
- `/api/processors/process-docx` - DOCX 處理
- `/api/processors/process-gdocs` - Google Docs 處理

### 2. 認證實現模板

#### A. 用戶 API 模板
```typescript
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // 已被 Clerk middleware 保護，無需額外認證
  
  try {
    const requestData = await request.json();
    
    // 參數驗證
    if (!requestData.required_field) {
      return NextResponse.json(
        { error: '缺少必要參數', details: 'required_field is missing' },
        { status: 400 }
      );
    }
    
    // 處理邏輯
    const result = await processData(requestData);
    
    return NextResponse.json({
      success: true,
      fileId: result.fileId,
      publicUrl: result.publicUrl,
      status: 'completed'
    });
    
  } catch (error) {
    console.error('API處理錯誤:', error);
    return NextResponse.json(
      { 
        error: '處理失敗', 
        details: error instanceof Error ? error.message : '未知錯誤' 
      },
      { status: 500 }
    );
  }
}
```

#### B. 內部 API 模板
```typescript
import { NextResponse } from 'next/server';
import { apiAuth } from '@/middleware/api-auth';

export async function POST(request: Request) {
  // API Key 認證檢查
  const authResponse = await apiAuth(request);
  if (authResponse) return authResponse;

  try {
    const requestData = await request.json();
    
    // 處理邏輯
    const result = await processInternalData(requestData);
    
    return NextResponse.json({
      success: true,
      fileId: result.fileId,
      markdownKey: result.markdownKey,
      publicUrl: result.publicUrl,
      status: 'processed'
    });
    
  } catch (error) {
    console.error('內部API處理錯誤:', error);
    return NextResponse.json(
      { 
        error: '內部處理失敗', 
        details: error instanceof Error ? error.message : '未知錯誤' 
      },
      { status: 500 }
    );
  }
}
```

## API 響應標準

### 1. 統一響應格式

#### 成功響應
```typescript
{
  success: true,
  fileId: string,        // 文件唯一標識符
  publicUrl: string,     // 統一公開訪問 URL
  status: string,        // 處理狀態描述
  [其他字段]: any       // 可選的附加字段
}
```

#### 錯誤響應
```typescript
{
  success: false,        // 明確標識失敗
  error: string,         // 用戶友好的錯誤信息
  details?: string,      // 技術錯誤詳情（可選）
  code?: string         // 錯誤代碼（可選）
}
```

### 2. HTTP 狀態碼標準

| 狀態碼 | 使用場景 | 示例 |
|--------|----------|------|
| 200 | 成功處理 | 內容提取成功 |
| 400 | 客戶端錯誤 | 缺少必要參數 |
| 401 | 認證失敗 | 用戶未登錄或 API Key 無效 |
| 403 | 權限不足 | 用戶無權限訪問特定資源 |
| 500 | 服務器錯誤 | 內部處理異常 |

### 3. 響應頭標準

```typescript
// 必需的響應頭
const standardHeaders = {
  'Content-Type': 'application/json;charset=UTF-8',
  'Content-Encoding': 'identity'
};

return NextResponse.json(data, {
  status: 200,
  headers: standardHeaders
});
```

## 內部 API 調用標準

### 1. 調用工具函數

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

### 2. 內部調用錯誤處理

```typescript
// 標準的內部 API 調用模式
const callInternalApi = async (path: string, data: any) => {
  try {
    const response = await fetch(getApiUrl(path), {
      method: 'POST',
      headers: internalApiHeaders,
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.error || 
        `API調用失敗 (${response.status}): ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error(`調用 ${path} 失敗:`, error);
    throw error;
  }
};
```

## URL 字段統一規範

### 1. 字段命名標準

**✅ 標準字段：**
- `publicUrl` - 前端訪問的公開 URL（主要字段）
- `fileId` - 文件唯一標識符
- `markdownKey` - R2 存儲的內部 key（僅內部使用）

**❌ 已棄用字段：**
- `markdownUrl` - 改用 `publicUrl`
- `r2Url` - 改用 `publicUrl`
- `localPath` - 僅內部使用，不對外暴露

### 2. URL 處理最佳實踐

```typescript
// 前端 URL 處理標準
const handleApiResponse = (result: any) => {
  // 優先使用 publicUrl
  if (result.publicUrl) {
    setViewUrl(`/viewer/${encodeURIComponent(result.publicUrl)}?view=markdown`);
  } else if (result.markdownKey) {
    // 後備方案：從 markdownKey 構建 URL
    const key = result.markdownKey.split('/').pop() || '';
    setViewUrl(`/viewer/processed/${key}?view=markdown`);
  }
};
```

## 錯誤處理最佳實踐

### 1. 統一錯誤處理函數

```typescript
// src/utils/api-error-handler.ts
export function handleApiError(error: unknown): NextResponse {
  console.error('API錯誤:', error);
  
  const errorMessage = error instanceof Error ? error.message : '未知錯誤';
  
  return NextResponse.json(
    { 
      success: false,
      error: '處理請求時發生錯誤', 
      details: errorMessage 
    },
    { 
      status: 500,
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'Content-Encoding': 'identity'
      }
    }
  );
}

// 使用示例
export async function POST(request: Request) {
  try {
    // 處理邏輯...
  } catch (error) {
    return handleApiError(error);
  }
}
```

### 2. 錯誤日誌標準

```typescript
// 使用明確的錯誤前綴
console.error('[Extract Content] 文件處理失敗:', error);
console.error('[API Auth] 認證檢查失敗:', error);
console.error('[R2 Service] 文件上傳失敗:', error);

// 記錄關鍵上下文信息
console.error('處理文件失敗:', {
  fileId,
  fileType,
  error: error instanceof Error ? error.message : error
});
```

## 安全最佳實踐

### 1. 輸入驗證

```typescript
// 參數驗證示例
const validateRequest = (data: any) => {
  const requiredFields = ['fileUrl', 'fileType', 'fileId'];
  
  for (const field of requiredFields) {
    if (!data[field]) {
      throw new Error(`缺少必要參數: ${field}`);
    }
  }
  
  // URL 格式驗證
  if (data.fileUrl && !isValidUrl(data.fileUrl)) {
    throw new Error('無效的文件 URL 格式');
  }
};

const isValidUrl = (string: string): boolean => {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
};
```

### 2. 敏感信息處理

```typescript
// ✅ 正確：不暴露敏感信息
console.log('API Key 檢查:', apiKey ? `${apiKey.substring(0, 8)}...` : 'null');

// ❌ 錯誤：暴露完整 API Key
console.log('API Key:', apiKey);
```

## 開發工具與檢查

### 1. 部署前檢查清單

- ✅ 使用正確的認證模式（用戶 API vs 內部 API）
- ✅ 統一使用 `publicUrl` 字段
- ✅ 設置正確的響應頭
- ✅ 實現適當的錯誤處理
- ✅ 處理所有 ESLint 警告
- ✅ 本地生產模式測試 (`npm run build && npm start`)

### 2. API 測試標準

```typescript
// 測試用戶 API（需要登錄）
const testUserApi = async () => {
  const response = await fetch('/api/extract-content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testData)
  });
  
  console.log('狀態:', response.status);
  console.log('響應:', await response.json());
};

// 測試內部 API（需要 API Key）
const testInternalApi = async () => {
  const response = await fetch('/api/processors/process-docx', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.API_SECRET_KEY
    },
    body: JSON.stringify(testData)
  });
  
  console.log('狀態:', response.status);
  console.log('響應:', await response.json());
};
```

## 總結

遵循這些標準可以確保：

- **🔒 安全性**：適當的認證保護
- **🔄 一致性**：統一的 API 響應格式
- **🛠️ 可維護性**：清晰的錯誤處理和日誌
- **🚀 可擴展性**：標準化的開發模式

在開發新 API 時，請參考相應的模板和檢查清單，確保符合項目標準。 