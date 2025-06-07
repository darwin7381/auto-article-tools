# 安全架構與風險防護指南

## 📋 **安全架構概述**

本系統採用**多層防護架構**，確保應用程序的全面安全性：

```
🛡️ 第一層：請求過濾與速率限制
   ↓
🔐 第二層：雙層認證系統
   ↓  
🛡️ 第三層：權限控制與角色檢查
   ↓
🔒 第四層：API 安全與數據保護
```

## 🛡️ **第一層：請求過濾與速率限制**

### 惡意請求檢測

系統自動檢測並阻止以下攻擊模式：

#### 🚫 **自動化工具檢測**
```typescript
// 檢測已知攻擊工具
const suspiciousUserAgents = [
  /sqlmap/i,     // SQL 注入工具
  /nikto/i,      // 網站掃描器
  /nmap/i,       // 端口掃描器
  /python-requests/i, // 自動化腳本
  /curl\/[0-9]/, // 命令行工具
  /wget/i        // 下載工具
];
```

#### 🚫 **路徑遍歷攻擊**
```typescript
// 檢測目錄遍歷嘗試
const pathTraversalPatterns = [
  /\.\.\//,              // ../
  /\.\.\\/,              // ..\
  /%2e%2e%2f/i,         // URL 編碼的 ../
  /%252e%252e%252f/i    // 雙重編碼的 ../
];
```

#### 🚫 **SQL 注入檢測**
```typescript
// 檢測 SQL 注入模式
const sqlInjectionPatterns = [
  /(\bUNION\b)|(\bSELECT\b)|(\bDROP\b)/i,
  /'(\s)*(or|and)(\s)*'/i,
  /(--|#|\/\*)/
];
```

### 速率限制策略

#### ⏱️ **分級速率限制**

| 類型 | 限制 | 時間窗口 | 說明 |
|------|------|----------|------|
| **認證嘗試** | 10次 | 10分鐘 | 防止暴力破解 |
| **文件上傳** | 20次 | 10分鐘 | 防止資源濫用 |
| **一般 API** | 100次 | 10分鐘 | 防止 DDoS 攻擊 |

#### 🔄 **動態 IP 識別**
```typescript
function getClientId(req: NextRequest): string {
  // 1. X-Forwarded-For (代理/CDN)
  const forwardedFor = req.headers.get('x-forwarded-for');
  
  // 2. X-Real-IP (負載均衡器)
  const realIp = req.headers.get('x-real-ip');
  
  // 3. 默認處理
  return forwardedFor?.split(',')[0].trim() || realIp || 'unknown';
}
```

## 🔐 **第二層：雙層認證系統**

### 認證架構

```
前端用戶請求 → Clerk Session 認證
內部 API 調用 → API Key 認證
```

### 🔑 **API Key 安全實踐**

#### ✅ **正確的 API Key 管理**
```typescript
// ✅ 正確：安全的環境變量檢查
const expectedApiKey = process.env.API_SECRET_KEY;
if (apiKey && expectedApiKey && apiKey === expectedApiKey) {
  // 認證成功
}
```

#### ❌ **避免的安全問題**
```typescript
// ❌ 錯誤：洩露 API Key 片段
console.log('API Key:', apiKey.substring(0, 8) + '...');

// ❌ 錯誤：暴露存在性
console.log('API_SECRET_KEY 是否設置:', !!process.env.API_SECRET_KEY);
```

### 🛡️ **會話安全**

#### Clerk 會話配置
- **會話過期**：自動處理
- **安全 Cookies**：自動設置
- **CSRF 保護**：內建支持

## 🛡️ **第三層：權限控制**

### 角色基礎訪問控制 (RBAC)

```typescript
// 用戶角色檢查（計劃實施）
const userRole = sessionClaims?.metadata?.role;
const allowedRoles = ['bd-editor', 'admin'];

if (!allowedRoles.includes(userRole)) {
  // 拒絕訪問
}
```

### 資源分級保護

#### 🔒 **高保護級別**
- 文件處理 API
- AI 處理服務
- 用戶數據操作

#### 🔓 **低保護級別**
- 狀態查詢 API
- URL 解析服務

## 🔒 **第四層：數據與傳輸安全**

### HTTP 安全頭部

系統自動添加以下安全頭部：

```typescript
// 防止點擊劫持
'X-Frame-Options': 'DENY'

// 防止 MIME 嗅探
'X-Content-Type-Options': 'nosniff'

// XSS 保護
'X-XSS-Protection': '1; mode=block'

// 引用者策略
'Referrer-Policy': 'strict-origin-when-cross-origin'

// 權限策略
'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'

// HSTS (生產環境)
'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
```

### 🔐 **環境變量安全**

#### ✅ **必需的安全配置**
```bash
# Clerk 認證
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxx
CLERK_SECRET_KEY=sk_live_xxx

# API 內部認證
API_SECRET_KEY=complex-random-key-here

# 生產環境
CLERK_TRUST_HOST=true
NODE_ENV=production
```

#### 🚨 **環境變量安全規則**
1. **永不提交**：`.env` 文件必須在 `.gitignore` 中
2. **強密鑰**：API_SECRET_KEY 至少 32 字符隨機字符串
3. **定期輪換**：每 90 天更換一次敏感密鑰
4. **訪問控制**：只有必要的人員可以訪問生產環境變量

## 📊 **安全監控與告警**

### 開發環境調試

```typescript
// 只在開發環境顯示安全信息
const isDevelopment = process.env.NODE_ENV === 'development';

if (isDevelopment) {
  console.log('安全檢查:', '通過');
}
```

### 生產環境監控

#### 🚨 **關鍵安全事件**
- 多次認證失敗
- 速率限制觸發
- 可疑活動檢測
- API Key 認證失敗

#### 📈 **建議的監控指標**
- 認證成功率
- API 調用頻率
- 錯誤響應比例
- 異常 IP 活動

## ⚠️ **已識別的風險點**

### 🟡 **中等風險**

1. **角色檢查未完全實施**
   - 狀態：暫時禁用
   - 計劃：角色系統配置完成後啟用

2. **內存速率限制器**
   - 問題：單機重啟會重置
   - 建議：生產環境使用 Redis

### 🟢 **已修復的高風險問題**

1. ✅ **敏感信息洩露** - 已移除生產環境調試信息
2. ✅ **缺少速率限制** - 已實施多級速率限制
3. ✅ **API Key 暴露** - 已使用安全的檢查方式
4. ✅ **缺少安全頭部** - 已自動添加所有必要頭部

## 🛠️ **安全部署檢查清單**

### 部署前檢查

- [ ] 所有環境變量已正確設置
- [ ] API_SECRET_KEY 使用強隨機字符串
- [ ] Clerk 域名配置正確
- [ ] HTTPS 強制啟用
- [ ] 安全頭部測試通過

### 部署後驗證

- [ ] 認證流程正常工作
- [ ] 速率限制正確觸發
- [ ] 可疑請求被正確阻止
- [ ] 安全頭部正確設置
- [ ] 錯誤信息不洩露敏感信息

## 🔄 **定期安全維護**

### 月度檢查
- 查看安全日誌
- 檢查異常訪問模式
- 更新安全規則

### 季度檢查
- 更換 API_SECRET_KEY
- 更新依賴版本
- 安全審計與測試

### 年度檢查
- 全面安全評估
- 更新安全策略
- 第三方安全審計

---

**最後更新**：2024年12月
**下次審查**：2025年3月 