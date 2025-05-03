# API URL 構建最佳實踐

## 問題背景

在部署到 Vercel 等雲平台時，我們發現了一個常見問題：某些 API 調用在本地環境運行正常，但在生產環境會出現以下錯誤：

```
Error: connect ECONNREFUSED 127.0.0.1:3000
```

這是因為代碼中使用了不適合生產環境的 URL 構建方式，試圖連接到 `localhost:3000`，而這在雲環境中是不可用的。

## 錯誤的做法

以下是不應該使用的 URL 構建方法：

```typescript
// ❌ 不要這樣做！
const apiUrl = new URL('/api/some-endpoint', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').toString();
const response = await fetch(apiUrl, {...});
```

問題在於：
1. 當 `NEXT_PUBLIC_APP_URL` 環境變量未設置時，默認使用 `http://localhost:3000`
2. 在雲環境（如 Vercel）中，這會導致 API 請求嘗試連接不存在的本地服務器
3. 結果是出現 `ECONNREFUSED` 錯誤

## 正確的做法

我們已在專案中實現了統一的 API URL 構建方法：

```typescript
// ✅ 正確的做法
import { getApiUrl } from '@/services/utils/apiHelpers';

const apiUrl = getApiUrl('/api/some-endpoint');
const response = await fetch(apiUrl, {...});
```

`getApiUrl` 函數會根據運行環境自動選擇正確的基礎 URL：
- 在 Vercel 等雲環境中，會使用相對路徑（例如 `/api/endpoint`）避免 localhost 問題
- 在本地開發環境中，會使用完整的 URL（例如 `http://localhost:3000/api/endpoint`）

### getApiUrl 實現細節

```typescript
export function getApiUrl(path: string): string {
  // 確保路徑以/開頭
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // 在Vercel環境中，優先使用相對路徑，避免localhost問題
  if (process.env.VERCEL) {
    return normalizedPath;
  }
  
  // 優先使用環境變數中的基礎URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                 (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  
  // 返回完整URL
  return `${baseUrl}${normalizedPath}`;
}
```

這個實現確保了 API URL 在不同環境中的正確構建，特別是在 Vercel 部署環境中不會嘗試連接到 localhost。

## 實施規則

1. **始終使用 `getApiUrl`**：對於所有 API 請求，無論是相對路徑還是絕對路徑，都應使用 `getApiUrl` 函數

2. **確保導入正確**：
   ```typescript
   import { getApiUrl } from '@/services/utils/apiHelpers';
   ```

3. **路徑格式**：傳給 `getApiUrl` 的路徑應該以 `/` 開頭，例如 `/api/some-endpoint`

4. **避免手動構建**：不要直接使用 `new URL()` 或字符串拼接來構建 API URL

## 常見問題

### 在開發環境和生產環境的行為不同

API URL 在不同環境中的構建方式：

- **開發環境**：`getApiUrl('/api/example')` → `http://localhost:3000/api/example`
- **生產環境**：`getApiUrl('/api/example')` → `/api/example` 或 `https://your-domain.com/api/example`

### 環境變量設置

為確保 URL 構建在所有環境中正常工作：

1. **本地開發**：在 `.env.local` 中設置 `NEXT_PUBLIC_APP_URL=http://localhost:3000`

2. **Vercel 生產環境**：在 Vercel 項目設置中添加:
   - `NEXT_PUBLIC_APP_URL=https://your-project.vercel.app`

## 注意事項

- API 路由之間的調用不應依賴於絕對 URL，應優先考慮直接導入和調用函數
- 僅在無法直接導入時才使用 `fetch` 和 API URL

## 文檔修訂

| 日期       | 版本 | 修訂人 | 修訂內容            |
|------------|------|--------|--------------------|
| 2023-05-03 | 1.0  | 系統   | 首次創建文檔        | 