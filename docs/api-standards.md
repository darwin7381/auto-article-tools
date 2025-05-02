# API標準與Vercel部署規範

## 背景

我們的Next.js應用在本地開發環境正常運行，但部署到Vercel時出現了一系列問題，主要表現為內容解碼失敗和URL處理不一致。本文檔記錄了解決方案和未來開發應遵循的標準，避免再次出現類似問題。

## 常見錯誤案例

以下是我們在項目中實際遇到的問題，記錄在此以避免未來重複犯錯：

### 1. URL字段不一致問題

在代碼中，我們混用了多個不同的字段來表示相同的URL資源：

```typescript
// 🔴 錯誤示例：字段混亂
return NextResponse.json({
  success: true,
  fileId: fileId,
  markdownKey: processResult.r2Key,   // 字段名不一致
  markdownUrl: processResult.publicUrl // 多餘的重複字段
});

// 前端處理邏輯混亂
if (processResult.markdownUrl) {
  setMarkdownUrl(processResult.markdownUrl);
} else if (extractResult.markdownKey) {
  setMarkdownUrl(`/processed/${extractResult.markdownKey}`); // 構建邏輯不一致
}
```

這導致了以下問題：
- 前後端對URL字段理解不一致
- 構建訪問路徑時邏輯混亂
- Vercel環境中無法正確解析路徑

### 2. 內容編碼問題

我們沒有明確設置`Content-Encoding`頭信息，導致以下問題：

```typescript
// 🔴 錯誤示例：缺少編碼頭
return NextResponse.json({
  success: true,
  data: largeDataObject
}); // 缺少headers配置
```

錯誤表現：
- 本地環境正常顯示
- Vercel環境顯示"ERR_CONTENT_DECODING_FAILED"
- 網絡請求返回200但內容無法解析

### 3. ESLint錯誤導致部署失敗

```typescript
try {
  // 一些處理邏輯
} catch (error) {
  // 未使用的錯誤變量，但沒有處理ESLint警告
  const parseError = "解析失敗";  // 未使用變量導致構建失敗
  throw new Error("處理失敗");
}
```

## API響應標準

### 1. 響應頭設置

所有API響應**必須**包含以下響應頭：

```typescript
headers: {
  'Content-Type': 'application/json;charset=UTF-8',
  'Content-Encoding': 'identity'
}
```

特別說明：
- `Content-Encoding: identity` 顯式聲明內容未壓縮，解決Vercel環境中的解碼問題
- `Content-Type` 必須明確指定字符集，避免編碼問題

### 2. 統一響應結構

所有API響應必須遵循以下統一結構：

```typescript
// 成功響應
{
  success: true,
  fileId: string,        // 文件唯一標識符
  publicUrl: string,     // 統一公開URL (主要訪問路徑)
  status: string,        // 處理狀態描述
  [其他可選字段]
}

// 錯誤響應
{
  error: string,         // 錯誤簡短描述
  details: string,       // 錯誤詳細信息
  status: string         // 處理狀態
}
```

## URL字段統一規範

### 1. 字段命名統一

- 使用 `publicUrl` 作為前端訪問文件的唯一字段
- 棄用舊有的混淆字段：markdownUrl、markdownKey等
- 後端處理可保留 `r2Key` 等內部字段，但對外API必須轉換為 `publicUrl`

### 2. URL處理優先順序

前端獲取URL時必須遵循以下優先順序：

```typescript
// 優先使用publicUrl作為唯一訪問路徑
if (processResult.publicUrl) {
  setMarkdownUrl(`/viewer/${encodeURIComponent(processResult.publicUrl)}`);
} else if (extractResult.publicUrl) {
  setMarkdownUrl(`/viewer/${encodeURIComponent(extractResult.publicUrl)}`);
}
```

## 錯誤處理最佳實踐

### 1. 錯誤捕獲與日誌

```typescript
try {
  // 操作代碼
} catch (error) {
  console.error('明確的錯誤前綴:', error);
  
  const errorMessage = error instanceof Error ? error.message : '未知錯誤';
  
  return NextResponse.json(
    { error: '用戶友好的錯誤信息', details: errorMessage },
    { 
      status: 500,
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'Content-Encoding': 'identity'
      }
    }
  );
}
```

### 2. 錯誤日誌最佳實踐

- 使用明確的前綴標識錯誤來源
- 記錄詳細的錯誤對象或消息，不僅僅是錯誤文本
- 在複雜處理流程中記錄中間狀態

## Vercel部署注意事項

### 1. 環境差異

- Vercel環境比本地更嚴格遵循HTTP標準
- Vercel自動對響應進行壓縮，必須正確設置`Content-Encoding`
- 必須處理所有ESLint警告，否則會阻止生產部署

### 2. ESLint問題處理

對於功能正常但出現ESLint警告的代碼，可使用以下方式處理：

```typescript
// 方法一：禁用特定行的檢查
// eslint-disable-next-line @typescript-eslint/no-unused-vars
catch (error) {
  // 錯誤處理
}

// 方法二：重構代碼消除警告
// 例如將未使用變量改為_前綴
catch (_error) {
  // 錯誤處理
}
```

### 3. 部署前檢查清單

- ✅ 所有API響應設置了正確的Content-Type和Content-Encoding
- ✅ URL字段使用統一的publicUrl
- ✅ 處理所有ESLint警告
- ✅ 本地模擬生產環境測試 (`next build && next start`)

## 本地與Vercel環境差異說明

| 特性 | 本地開發環境 | Vercel生產環境 |
|------|------------|--------------|
| HTTP協議遵循 | 相對寬鬆 | 嚴格遵循標準 |
| 響應壓縮 | 通常不啟用 | 自動啟用 |
| ESLint檢查 | 警告不阻止運行 | 警告阻止構建 |
| 錯誤顯示 | 詳細錯誤信息 | 有限的錯誤日誌 |
| 緩存策略 | 開發模式無緩存 | 強緩存策略 |

## 總結

遵循上述規範可以避免在Vercel部署時遇到的常見問題。特別要注意的是本地開發環境和Vercel生產環境之間的差異，以及HTTP協議標準的嚴格遵循。

在任何API更改或添加後，應該確保進行完整的本地生產模式測試，以驗證在生產部署前的功能正常性。 