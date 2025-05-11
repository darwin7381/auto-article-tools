# API 安全認證指南

本文檔詳細說明 API 安全認證的最佳實踐和實現方法，適用於本項目的所有 API 端點。

## 混合認證方案概述

我們採用「會話 + API Key 混合認證」方案，同時支持兩種認證方式：

1. **會話認證**：基於 Clerk 用戶會話，用於前端用戶訪問
2. **API Key 認證**：基於預設密鑰，用於服務器間通信（如 n8n）

這種混合方案確保 API 既可以安全地被前端用戶調用，也可以被其他系統和服務訪問，同時不會在前端暴露敏感密鑰。

### 降級認證機制

本系統實現了自動降級認證機制，認證流程如下：

1. **優先嘗試 API Key 認證**：首先檢查請求頭中的 `x-api-key` 是否與環境變量 `API_SECRET_KEY` 匹配
2. **自動降級到會話認證**：若 API Key 認證失敗，則嘗試使用 Clerk 會話認證
3. **雙重保障**：只有當兩種認證方式都失敗時，才會返回 401 未授權錯誤

這種降級機制的好處：
- 即使未設置 `API_SECRET_KEY` 環境變量，已登入的用戶仍可正常使用 API
- 無需為每種認證方式建立不同的端點
- 前端和服務器調用可使用相同的 API 路徑，簡化了整體架構

實際運用中，這也解釋了為什麼在部署環境中沒有設置 `API_SECRET_KEY` 的情況下，系統仍能正常運作—登入用戶的請求會自動通過 Clerk 會話認證。

## 實現步驟

### 1. 建立 API 認證中間件

首先，創建一個專用的 API 認證中間件，用於驗證所有 API 請求：

```typescript
// src/middleware/api-auth.ts
import { auth } from '@clerk/nextjs/server';

export async function apiAuth(req: Request) {
  // 方法1: 檢查 API Key (用於服務器間通信)
  const apiKey = req.headers.get('x-api-key');
  if (apiKey === process.env.API_SECRET_KEY) {
    return null; // API Key 有效，允許請求
  }
  
  // 方法2: 檢查用戶會話 (用於前端用戶請求)
  try {
    const { userId } = await auth();
    if (userId) {
      return null; // 用戶已登入，允許請求
    }
  } catch (error) {
    // 會話檢查失敗，繼續處理
  }
  
  // 所有認證方式都失敗，返回 401 未授權
  return new Response(JSON.stringify({ 
    error: '未授權訪問',
    message: '需要有效的用戶會話或 API Key'
  }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### 2. 在 API 路由中使用

在每個需要保護的 API 路由中整合認證中間件：

```typescript
// src/app/api/extract-content/route.ts
import { apiAuth } from '@/middleware/api-auth';

export async function POST(req: Request) {
  // 驗證請求
  const authResponse = await apiAuth(req);
  if (authResponse) return authResponse; // 未通過認證，返回錯誤響應
  
  // 通過認證，繼續處理請求
  try {
    // 請求處理邏輯...
    
    return Response.json({ success: true, data: result });
  } catch (error) {
    console.error('API 處理錯誤:', error);
    return Response.json({ 
      error: '處理請求失敗',
      message: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 });
  }
}
```

### 3. 環境變量配置

在項目根目錄下的 `.env.local` 文件中配置 API 密鑰（**永遠不要**以 `NEXT_PUBLIC_` 開頭）：

```
# API 密鑰 (僅服務器端，不暴露給前端)
API_SECRET_KEY=your-strong-random-key-here

# 可選：為不同環境設置不同密鑰
PRODUCTION_API_KEY=your-production-only-key
DEVELOPMENT_API_KEY=your-development-only-key

# 可選：為特定服務設置專用密鑰
N8N_API_KEY=specific-key-for-n8n-integration
```

### 4. 前端請求實現

前端代碼不需要任何 API Key，只依賴 Clerk 會話進行認證：

```typescript
// 例如在 useProcessingFlow.tsx 或其他前端代碼中
const callApi = async (endpoint: string, data: any) => {
  try {
    const response = await fetch(`/api/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // 不需要 API Key，Clerk 會自動處理會話認證
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.message || 
        `API 請求失敗 (${response.status}): ${response.statusText}`
      );
    }
    
    return response.json();
  } catch (error) {
    console.error(`調用 ${endpoint} API 失敗:`, error);
    throw error;
  }
};
```

### 5. 服務器間通信實現

對於 n8n 或其他服務器的調用，使用 API Key 進行認證：

```javascript
// n8n HTTP 請求節點配置示例
{
  "url": "https://yourdomain.com/api/extract-content",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json",
    "x-api-key": "{{$env.API_KEY}}"  // 使用 n8n 環境變量
  },
  "body": {
    "url": "https://example.com/article",
    "options": { /* 其他參數 */ }
  }
}
```

## 安全考量

### 最佳實踐

1. **密鑰輪換**：定期更換 API 密鑰，特別是在人員變動或懷疑密鑰洩露時
2. **密鑰分離**：為不同環境和服務使用不同的 API 密鑰
3. **最小權限**：可以根據不同的 API 密鑰賦予不同的訪問權限
4. **日誌記錄**：記錄所有 API 訪問，包括認證方式、訪問時間和來源 IP
5. **監控異常**：設置監控系統，檢測異常的 API 調用模式

### 安全警告

- **絕不** 在前端代碼中硬編碼 API 密鑰
- **絕不** 使用 `NEXT_PUBLIC_` 前綴存儲 API 密鑰
- **絕不** 在公共代碼庫中提交 API 密鑰
- **始終** 通過 HTTPS 傳輸 API 請求
- **考慮** 為高敏感度 API 添加請求速率限制

## 使用範例

### 案例 1: 前端調用文件處理 API

```typescript
// 前端代碼
async function processDocument(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await fetch('/api/process-file', {
      method: 'POST',
      body: formData
      // 不需要 API Key，使用 Clerk 會話
    });
    
    if (!response.ok) throw new Error('處理失敗');
    return await response.json();
  } catch (error) {
    console.error('文件處理錯誤:', error);
    throw error;
  }
}
```

### 案例 2: n8n 自動化工作流調用 API

```json
{
  "node": "HTTP Request",
  "parameters": {
    "url": "https://yourdomain.com/api/extract-content",
    "method": "POST",
    "authentication": "headerAuth",
    "headerAuth": {
      "x-api-key": "{{$env.API_KEY}}"
    },
    "contentType": "json",
    "bodyParameters": {
      "url": "https://example.com/article"
    }
  }
}
```

## 故障排除

### 常見錯誤

1. **401 未授權**
   - 檢查用戶是否已登入
   - 確認 API Key 是否正確
   - 驗證環境變量是否正確設置

2. **會話驗證失敗**
   - 檢查 Clerk 配置
   - 確保 .env.local 包含正確的 Clerk 密鑰
   - 嘗試重新登入

3. **API Key 不生效**
   - 確認環境變量名稱拼寫正確
   - 檢查 API Key 是否被正確添加到請求頭
   - 重啟開發服務器以刷新環境變量

## 總結

這種混合認證方案為 API 提供了靈活而強大的安全保護，同時支持多種訪問場景。前端用戶可以通過 Clerk 會話無縫訪問 API，而服務器間通信則使用安全的 API Key。這種方法既確保了安全性，又保持了使用的簡便性。 