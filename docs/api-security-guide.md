# API 安全認證指南

本文檔詳細說明當前 API 安全認證架構的實現方法和最佳實踐。

## 當前認證架構概述

我們採用**多層防護的雙層認證架構**，確保 API 安全的同時支持不同的使用場景：

### 🛡️ **第一層：安全防護**
- **惡意請求檢測**：自動識別和阻止攻擊模式
- **速率限制**：防止 DDoS 和暴力破解攻擊
- **安全頭部**：自動添加所有必要的安全頭部

### 🔒 **第二層：Clerk Middleware 保護**
- **保護範圍**：所有非公開的 API 路由
- **認證方式**：Clerk 用戶會話
- **適用場景**：前端用戶訪問

### 🔑 **第三層：API Key 認證**
- **保護範圍**：需要內部調用的 API
- **認證方式**：`x-api-key` header + `API_SECRET_KEY`
- **適用場景**：API 間的服務器通信

## 安全防護層

### 🚫 **自動威脅檢測**

系統自動檢測並阻止以下攻擊：

```typescript
// 攻擊工具檢測
const suspiciousUserAgents = [
  /sqlmap/i,           // SQL 注入工具  
  /nikto/i,            // 網站掃描器
  /nmap/i,             // 端口掃描器
  /python-requests/i,  // 自動化腳本
];

// 路徑遍歷攻擊
const pathTraversal = [
  /\.\.\//,            // 目錄遍歷
  /%2e%2e%2f/i         // URL 編碼攻擊
];

// SQL 注入檢測  
const sqlInjection = [
  /(\bUNION\b)|(\bSELECT\b)|(\bDROP\b)/i,
  /'(\s)*(or|and)(\s)*'/i
];
```

### ⏱️ **智能速率限制**

| 請求類型 | 限制次數 | 時間窗口 | 防護目標 |
|----------|----------|----------|----------|
| 認證嘗試 | 10次 | 10分鐘 | 暴力破解 |
| 文件上傳 | 20次 | 10分鐘 | 資源濫用 |
| 一般API | 100次 | 10分鐘 | DDoS攻擊 |

## 認證流程

```
請求 → 安全檢查 → 速率限制 → Clerk Middleware → API 處理邏輯
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
  'x-api-key': process.env.API_SECRET_KEY, // 服務器間認證
};

const response = await fetch('/api/processors/process-pdf', {
  method: 'POST',
  headers: internalApiHeaders,
  body: JSON.stringify(data)
});
```

## API 分類與安全等級

### 🔓 **公開 API**（無需認證）

只有真正應該公開的查詢型 API：

```typescript
const publicRoutes = [
  '/api/parse-url',        // URL 解析 - 預覽功能
  '/api/process-status',   // 狀態查詢 - 處理進度
  '/api/clerk-webhook',    // Clerk webhooks
];
```

### 🔒 **用戶 API**（需要登錄）

消耗資源或處理敏感數據的 API：

```typescript
// 這些 API 被 Clerk middleware 保護
const protectedRoutes = [
  '/api/extract-content',      // 內容提取
  '/api/process-file',         // 文件處理
  '/api/upload',              // 文件上傳
  '/api/process-openai',      // AI 處理
  '/api/save-markdown',       // 文件保存
  '/api/processors/*',        // 處理器服務
  '/api/generate-cover-image' // 封面圖生成
];
```

### 🔐 **內部 API**（雙重認證）

支持內部調用的 API 同時支持兩種認證方式：

```typescript
export async function POST(request: Request) {
  // 檢查 API Key（內部調用）
  const apiKey = request.headers.get('x-api-key');
  if (apiKey === process.env.API_SECRET_KEY) {
    // 內部認證成功，直接處理
    return handleRequest(request);
  }
  
  // 檢查 Clerk 會話（前端調用）
  const { userId } = await auth();
  if (userId) {
    // 用戶認證成功，處理請求
    return handleRequest(request);
  }
  
  // 認證失敗
  return new Response('未授權', { status: 401 });
}
```

## 安全頭部自動設置

所有響應自動包含以下安全頭部：

```typescript
const securityHeaders = {
  // 防止點擊劫持
  'X-Frame-Options': 'DENY',
  
  // 防止 MIME 類型嗅探  
  'X-Content-Type-Options': 'nosniff',
  
  // XSS 保護
  'X-XSS-Protection': '1; mode=block',
  
  // 引用者策略
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // 權限策略
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  
  // HSTS (生產環境)
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
};
```

## 錯誤處理與安全響應

### ✅ **安全的錯誤響應**

```typescript
// ✅ 正確：不洩露敏感信息
return new Response(JSON.stringify({
  error: '未授權訪問',
  message: '請確保您已登錄並有權限訪問此資源'
}), {
  status: 401,
  headers: { 
    'Content-Type': 'application/json',
    'WWW-Authenticate': 'Bearer'
  }
});
```

### ❌ **避免的安全問題**

```typescript
// ❌ 錯誤：洩露系統細節
return new Response(JSON.stringify({
  error: '認證失敗',
  message: '無效的 API Key 或未登入', // 暴露認證方式
  debug: process.env.API_SECRET_KEY  // 洩露敏感信息
}), { status: 401 });
```

## 開發與生產環境差異

### 🔧 **開發環境**

```typescript
const isDevelopment = process.env.NODE_ENV === 'development';

if (isDevelopment) {
  // 只在開發環境顯示調試信息
  console.log('認證狀態:', userId ? '已登錄' : '未登錄');
}
```

### 🏭 **生產環境**

- **無調試信息**：不輸出任何敏感信息
- **HSTS 啟用**：強制 HTTPS 連接
- **錯誤監控**：記錄安全事件但不暴露細節

## 環境變量安全配置

### 📋 **必需的環境變量**

```bash
# Clerk 認證配置
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxx
CLERK_SECRET_KEY=sk_live_xxx

# API 內部調用密鑰（至少 32 字符）
API_SECRET_KEY=your-complex-random-key-here

# 生產環境配置
CLERK_TRUST_HOST=true
NODE_ENV=production
```

### 🔐 **API Key 安全要求**

1. **長度**：至少 32 字符
2. **複雜性**：包含大小寫字母、數字、特殊字符  
3. **隨機性**：使用密碼學安全的隨機數生成器
4. **輪換**：每 90 天更換一次

### ⚠️ **安全注意事項**

1. **永不提交**：`.env` 文件必須在 `.gitignore` 中
2. **訪問控制**：只有必要人員可訪問生產環境變量
3. **傳輸安全**：使用安全渠道共享密鑰
4. **監控告警**：設置 API Key 使用異常告警

## 安全最佳實踐

### ✅ **推薦做法**

1. **最小權限原則**：只開放必要的 API 端點
2. **深度防禦**：多層安全檢查
3. **安全編碼**：輸入驗證、輸出編碼  
4. **定期審計**：定期檢查安全配置

### ❌ **避免的做法**

1. **在日誌中洩露敏感信息**
2. **使用弱 API Key 或默認密碼**
3. **忽略速率限制和訪問控制**
4. **在錯誤消息中暴露系統細節**

## 故障排除指南

### 🔍 **常見問題**

#### 問題：API 調用返回 429 錯誤
```json
{
  "error": "請求過於頻繁",
  "message": "請在 600 秒後重試",
  "code": "RATE_LIMIT_EXCEEDED"
}
```
**解決**：等待速率限制重置，或聯繫管理員調整限制

#### 問題：API 調用返回 400 錯誤
```json
{
  "error": "請求被拒絕", 
  "message": "檢測到可疑活動",
  "code": "SUSPICIOUS_ACTIVITY"
}
```
**解決**：檢查請求格式，確保使用正常的用戶代理

#### 問題：內部 API 調用失敗
**檢查**：
1. API_SECRET_KEY 是否正確設置
2. 請求頭中是否包含正確的 x-api-key
3. 網絡連接是否正常

---

**最後更新**：2024年12月  
**相關文檔**：[安全架構指南](./security-architecture.md) | [Clerk 認證指南](./clerk-auth-methods.md) 