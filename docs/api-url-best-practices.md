# API URL 構建最佳實踐

## 問題背景

在構建同時支持前端和後端API調用的Next.js應用時，我們經常遇到API URL構建相關的問題。特別是在以下情況下:

1. 後端API路由之間的調用 (如`/api/route-a`調用`/api/route-b`)
2. 部署到Vercel等雲平台時的服務器端代碼
3. 在不同環境(開發、生產)中保持一致的行為

最常見的錯誤是在**服務器端**使用相對路徑進行API調用，這會導致錯誤：

```
TypeError: Failed to parse URL from /api/endpoint
[cause]: [TypeError: Invalid URL] {
  code: 'ERR_INVALID_URL',
  input: '/api/endpoint'
}
```

## 正確的解決方案

我們項目中實現了一套完整的API URL處理方案，核心是兩個關鍵函數：`getBaseUrl()`和`getApiUrl()`。

### 函數實現

```typescript
/**
 * 获取API基础URL
 */
export function getBaseUrl() {
  // 优先使用自定义API基础URL
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  
  // 其次使用Vercel自动分配的URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // 本地开发环境 - 使用相对URL
  if (process.env.NODE_ENV === 'development') {
    return ''; // 返回空字符串，这会使fetch使用相对URL
  }
  
  // 兜底方案
  return 'http://localhost:3000';
}

/**
 * 构建完整的API URL
 */
export function getApiUrl(path: string): string {
  const baseUrl = getBaseUrl();
  
  // 确保path以/开头
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // 确保在服务器端API路由中总是使用完整URL
  if (typeof window === 'undefined') {
    // 服务器端 - 总是使用完整URL
    if (baseUrl) {
      // 确保baseUrl包含协议前缀
      const urlWithProtocol = baseUrl.startsWith('http') 
        ? baseUrl 
        : `https://${baseUrl}`;
      
      return `${urlWithProtocol}${normalizedPath}`;
    }
    return `http://localhost:3000${normalizedPath}`;
  }
  
  // 客户端 - 可以使用相对URL
  return baseUrl ? (baseUrl.startsWith('http') ? `${baseUrl}${normalizedPath}` : `https://${baseUrl}${normalizedPath}`) : normalizedPath;
}
```

### 關鍵設計原則

1. **區分服務器端和客戶端環境**
   - 服務器端(`typeof window === 'undefined'`)：必須使用完整URL，包含域名和協議
   - 客戶端：可以使用相對URL，瀏覽器會基於當前域名解析

2. **優先級順序處理基礎URL**
   - 優先使用環境變量(`NEXT_PUBLIC_API_BASE_URL`)設置的自定義URL
   - 其次使用Vercel提供的自動部署URL(`VERCEL_URL`)
   - 在開發環境可以使用相對URL，讓瀏覽器自動處理
   - 最後才使用本地開發服務器地址(`http://localhost:3000`)作為兜底

3. **確保URL格式正確**
   - 路徑始終以`/`開頭
   - 域名部分確保包含協議前綴(`http://`或`https://`)

## 常見錯誤及避坑指南

### 錯誤1：在服務器端使用相對URL

```typescript
// ❌ 錯誤示例：在服務器端API路由中使用相對路徑
async function serverSideFunction() {
  const response = await fetch('/api/some-endpoint'); // 在服務器端會失敗!
}
```

**解決方法**：在服務器端始終使用完整URL

```typescript
// ✅ 正確做法
import { getApiUrl } from '@/services/utils/apiHelpers';

async function serverSideFunction() {
  const response = await fetch(getApiUrl('/api/some-endpoint'));
}
```

### 錯誤2：硬編碼localhost地址

```typescript
// ❌ 錯誤示例：直接使用localhost地址
const response = await fetch('http://localhost:3000/api/endpoint');
```

這在本地開發可能工作，但部署到生產環境後將失敗。

**解決方法**：使用`getApiUrl`函數，它會根據環境選擇正確的基礎URL。

### 錯誤3：誤用環境變量

```typescript
// ❌ 錯誤示例：直接依賴環境變量，沒有適當的後備方案
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const response = await fetch(`${baseUrl}/api/endpoint`);
```

**解決方法**：使用`getBaseUrl`函數，它實現了完整的環境檢測和後備邏輯。

### 錯誤4：忽略服務器端/客戶端差異

```typescript
// ❌ 錯誤示例：不區分服務器端和客戶端環境
function getUrl(path) {
  return `/api/${path}`; // 在服務器端會失敗，缺少完整URL
}
```

**解決方法**：明確區分服務器端和客戶端環境的處理邏輯：

```typescript
// ✅ 正確做法
function getUrl(path) {
  const isServer = typeof window === 'undefined';
  if (isServer) {
    return `https://your-domain.com/api/${path}`;
  }
  return `/api/${path}`;
}
```

## 實施指南

在整個專案中，應遵循以下規則：

1. **始終使用`getApiUrl`**：對於任何API請求，統一使用`getApiUrl`函數構建URL

   ```typescript
   import { getApiUrl } from '@/services/utils/apiHelpers';
   
   // 前端頁面
   const response = await fetch(getApiUrl('/api/data'));
   
   // API路由中
   const internalResponse = await fetch(getApiUrl('/api/another-route'));
   ```

2. **設置正確的環境變量**：
   - 開發環境：可以不設置，默認會正確處理
   - 生產環境：如需自定義域名，設置`NEXT_PUBLIC_API_BASE_URL`環境變量

3. **避免手動構建URL**：不要使用`new URL()`、模板字符串或字符串拼接來構建API URL

## 經驗教訓總結

1. **環境差異至關重要**：服務器端和客戶端在URL處理上有根本差異，服務器端需要完整URL
2. **不要假設環境變量存在**：總是提供合理的後備值，尤其是在不同的部署環境中
3. **避免過度簡化**：URL構建邏輯比看起來複雜，依賴工具函數而非自行處理
4. **統一標準很重要**：整個專案統一使用相同的URL構建方法，避免不一致
5. **徹底測試不同環境**：開發環境可能工作良好，但生產環境可能失敗，需要在實際部署環境中測試

通過遵循這些最佳實踐，可以避免在不同環境中遇到API URL相關的問題，確保應用在本地開發和生產部署中都能正常工作。

## 文檔修訂

| 日期       | 版本 | 修訂人 | 修訂內容            |
|------------|------|--------|--------------------|
| 2023-05-03 | 1.0  | 系統   | 首次創建文檔        | 