# WordPress測試腳本使用指南

> **文檔版本**: 1.0  
> **最後更新**: 2025年5月18日

## 概述

本文檔介紹了用於測試WordPress API集成的各種腳本工具。這些工具可幫助開發人員測試和驗證WordPress發布系統的功能，特別是在處理媒體和圖片上傳方面。

## 可用腳本

系統包含以下測試腳本：

### 1. 測試媒體URL上傳

**文件**: `src/test-external-image-upload.ts` / `src/test-external-image-upload.js`

**功能**: 測試從外部URL上傳圖片到WordPress媒體庫，並獲取媒體ID。

**使用方法**:
```bash
# 使用TypeScript版本
npx ts-node src/test-external-image-upload.ts <image_url>

# 或使用編譯後的JavaScript版本
node src/test-external-image-upload.js <image_url>
```

**示例**:
```bash
npx ts-node src/test-external-image-upload.ts https://example.com/image.jpg
```

**環境變量依賴**:
- `NEXT_PUBLIC_WORDPRESS_API_URL`: WordPress網站URL
- `WORDPRESS_API_USER`: WordPress用戶名
- `WORDPRESS_API_PASSWORD`: WordPress密碼

### 2. 測試媒體文件上傳

**文件**: `src/test-wp-media-upload.ts` / `src/test-wp-media-upload.js`

**功能**: 測試將本地圖片文件上傳到WordPress媒體庫。

**使用方法**:
```bash
# 使用TypeScript版本
npx ts-node src/test-wp-media-upload.ts <image_url>

# 或使用編譯後的JavaScript版本
node src/test-wp-media-upload.js <image_url>
```

### 3. WordPress API測試

**文件**: `src/test-wp-api.ts`

**功能**: 測試WordPress API的基本連接和認證。

**使用方法**:
```bash
npx ts-node src/test-wp-api.ts
```

## 問題排查

### 常見錯誤

1. **認證失敗 (401)**:
   - 檢查環境變量中的用戶名和密碼是否正確
   - 確認用戶是否有足夠的權限

2. **URL格式錯誤**:
   - 確保URL格式完整，包含http://或https://
   - 檢查URL是否可公開訪問

3. **編譯錯誤**:
   - 確保安裝了所有依賴: `npm install`
   - TypeScript版本問題時，可嘗試使用JavaScript版本

### 調試技巧

- 添加環境變量`DEBUG=true`啟用詳細日誌
- 檢查WordPress媒體庫，確認圖片是否成功上傳
- 使用基本認證直接測試WordPress API:
  ```bash
  curl -X POST \
    -H "Authorization: Basic $(echo -n username:password | base64)" \
    -H "Content-Type: application/json" \
    https://your-wordpress-site.com/wp-json/wp/v2/posts
  ```

## 注意事項

- 這些測試腳本僅用於開發和測試目的
- 避免在生產環境中使用，以防泄露敏感信息
- 測試後，建議清理上傳的測試媒體文件

## 結語

這些測試腳本是開發和故障排除的重要工具。通過它們，可以直接測試WordPress API的各個功能，確保系統的正常運行。在處理特色圖片、媒體上傳等功能時，這些工具尤其有用。 