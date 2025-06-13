# Strapi 5 安全與權限配置指南

## 📋 **安全架構概述**

本指南提供 Strapi 5 生產環境的安全配置最佳實踐，確保 API 的安全性和可控性。

---

## 🚨 **安全風險分析**

### **Public 權限的危險性**
```
❌ 錯誤配置（開發環境可用）
├── Public Role: 所有 CRUD 權限開放
├── 結果：任何人都可以無限制訪問 API
└── 風險：數據洩露、惡意攻擊、資源濫用

✅ 正確配置（生產環境必須）
├── Public Role: 僅必要的 READ 權限
├── API Tokens: 用於系統間通信
└── 認證機制: 保護敏感操作
```

---

## 🔐 **API Tokens 機制詳解**

### **什麼是 API Tokens？**
API Tokens 是 Strapi 5 提供的**無狀態認證機制**，用於：
- 系統間 API 通信
- 前端應用程式認證
- 第三方服務整合
- 自動化腳本訪問

### **API Token 類型**

| Token 類型 | 權限範圍 | 使用場景 |
|-----------|---------|---------|
| **Read-only** | 僅 `find` 和 `findOne` | 前端讀取數據 |
| **Full access** | 完整 CRUD 權限 | 管理工具、同步腳本 |
| **Custom** | 自定義權限組合 | 特定業務需求 |

### **Token 生命週期**
- **7 天** - 短期使用
- **30 天** - 中期專案
- **90 天** - 長期整合
- **Unlimited** - 生產系統（需謹慎使用）

---

## 🏗️ **生產環境權限設計**

### **第一階段：關閉 Public 權限**

#### **步驟 1：檢查現有 Public 權限**
```
Settings > Users & Permissions Plugin > Roles > Public
```

#### **步驟 2：關閉不必要的權限**
```
對於每個 Content Type：
├── Create: ❌ 關閉
├── Delete: ❌ 關閉  
├── Update: ❌ 關閉
└── Find/FindOne: ⚠️ 根據需求決定
```

#### **步驟 3：保留必要的公開端點**
```javascript
// 建議保留的 Public 權限
{
  "authors": {
    "find": true,      // 作者列表（公開）
    "findOne": true    // 作者詳情（公開）
  },
  "article-type-presets": {
    "find": true       // 文稿類型（公開選項）
  },
  "default-content-setting": {
    "find": true       // 預設內容（如果需要）
  }
}
```

### **第二階段：設定 API Tokens**

#### **為前端應用創建 Custom Token**
```
Token 配置建議：
├── Name: "Frontend App Token"  
├── Type: Custom
├── Duration: 90 days
└── 權限設定：
    ├── Authors: find, findOne
    ├── Article Type Presets: find, findOne  
    ├── Header/Footer Templates: find, findOne
    └── Default Content Settings: find, findOne
```

#### **為管理系統創建 Full Access Token**
```
Token 配置建議：
├── Name: "Admin Management Token"
├── Type: Full Access  
├── Duration: 30 days (定期更新)
└── 使用場景：配置管理、數據同步
```

### **第三階段：實施認證機制**

#### **前端應用整合範例**
```javascript
// Next.js API 路由範例
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

export async function fetchArticlePresets() {
  const response = await fetch(
    `${process.env.STRAPI_URL}/api/article-type-presets?populate=*`,
    {
      headers: {
        'Authorization': `Bearer ${STRAPI_TOKEN}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch data');
  }
  
  return response.json();
}
```

#### **環境變數配置**
```bash
# .env.local (前端)
STRAPI_URL=https://your-strapi-domain.com
STRAPI_API_TOKEN=your_custom_token_here

# .env (Strapi)
API_TOKEN_SALT=your_unique_salt_here
ENCRYPTION_KEY=your_encryption_key_here
```

---

## 🔧 **進階安全配置**

### **1. 啟用 Token 加密可見性**
```javascript
// config/admin.js
module.exports = ({ env }) => ({
  apiToken: {
    secrets: {
      encryptionKey: env('ENCRYPTION_KEY'),
    },
  },
});
```

### **2. 配置 CORS**
```javascript
// config/middlewares.js
module.exports = [
  'strapi::cors': {
    enabled: true,
    origin: [
      'https://your-frontend-domain.com',
      'https://admin.your-domain.com'
    ],
    headers: ['Content-Type', 'Authorization'],
  },
];
```

### **3. 實施 Rate Limiting**
```javascript
// config/middlewares.js
module.exports = [
  'strapi::ratelimit': {
    enabled: true,
    config: {
      interval: 60000, // 1 minute
      max: 100,        // 100 requests per minute
    },
  },
];
```

---

## 📊 **權限矩陣表**

### **內容類型權限建議**

| Content Type | Public | Authenticated | Custom Token | Full Access Token |
|-------------|--------|---------------|--------------|-------------------|
| **Authors** | find, findOne | find, findOne | find, findOne | All |
| **Article Type Presets** | find | find, findOne | find, findOne, update | All |
| **Header Templates** | - | find | find, findOne | All |
| **Footer Templates** | - | find | find, findOne | All |
| **Default Content** | - | find | find, update | All |

### **使用場景對應**

| 使用場景 | 推薦方案 | Token 類型 |
|---------|---------|-----------|
| **網站前端顯示** | Custom Token | Read-only 權限 |
| **內容管理面板** | Full Access Token | 完整權限 |
| **第三方整合** | Custom Token | 特定權限 |
| **自動化腳本** | Full Access Token | 有限期限 |

---

## 🚀 **遷移步驟**

### **從 Public 權限遷移到 Token 認證**

#### **步驟 1：創建 API Tokens**
1. 進入 `Settings > API Tokens`
2. 點擊 `Create new API Token`
3. 根據上述建議創建不同類型的 Token

#### **步驟 2：更新前端代碼**
```javascript
// 舊方式（不安全）
fetch('/api/strapi-endpoint') // 依賴 Public 權限

// 新方式（安全）
fetch('/api/strapi-endpoint', {
  headers: {
    'Authorization': `Bearer ${process.env.STRAPI_API_TOKEN}`
  }
})
```

#### **步驟 3：逐步關閉 Public 權限**
1. 先更新所有前端調用
2. 測試 Token 認證是否正常
3. 逐個關閉 Public 權限
4. 監控錯誤日誌

#### **步驟 4：驗證安全性**
```bash
# 測試未認證請求應該失敗
curl https://your-strapi.com/api/authors
# 應該返回 403 Forbidden

# 測試認證請求應該成功
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://your-strapi.com/api/authors
# 應該返回數據
```

---

## 📝 **安全檢查清單**

### **生產環境部署前檢查**

- [ ] **Public 權限已最小化**
  - [ ] 僅保留真正需要公開的端點
  - [ ] 關閉所有 Create/Update/Delete 權限
  
- [ ] **API Tokens 已正確配置**
  - [ ] 創建了適當類型的 Token
  - [ ] Token 權限符合最小權限原則
  - [ ] 設定了合理的過期時間
  
- [ ] **環境變數已安全配置**
  - [ ] API_TOKEN_SALT 已設定
  - [ ] ENCRYPTION_KEY 已設定
  - [ ] 敏感資訊不在代碼中硬編碼
  
- [ ] **網路安全已配置**
  - [ ] CORS 已正確設定
  - [ ] HTTPS 已啟用
  - [ ] Rate Limiting 已實施
  
- [ ] **監控已設置**
  - [ ] API 訪問日誌
  - [ ] 錯誤監控
  - [ ] 安全事件警報

---

## 🔍 **故障排除**

### **常見問題**

#### **問題 1：Token 無法使用**
```
可能原因：
├── Token 已過期
├── Token 權限不足
├── API_TOKEN_SALT 改變
└── 請求標頭格式錯誤

解決方案：
├── 重新生成 Token
├── 檢查權限設定
├── 確認環境變數
└── 驗證 Authorization header 格式
```

#### **問題 2：前端無法獲取數據**
```
檢查步驟：
├── 確認 Token 是否正確設定
├── 檢查 CORS 配置
├── 驗證 API 端點權限
└── 查看 Strapi 錯誤日誌
```

#### **問題 3：Token 在 Admin Panel 中不可見**
```
解決方案：
├── 設定 ENCRYPTION_KEY 環境變數
├── 重新啟動 Strapi
└── 重新生成 Token
```

---

## 📚 **參考資料**

- [Strapi 5 API Tokens 官方文檔](https://docs.strapi.io/cms/features/api-tokens)
- [Strapi 安全最佳實踐](https://strapi.io/blog/strapi-security-checklist)
- [Users & Permissions 插件](https://docs.strapi.io/cms/features/users-permissions)

**當前安全配置已完成，系統已準備好用於生產環境部署。** 