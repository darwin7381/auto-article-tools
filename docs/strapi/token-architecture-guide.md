# Strapi API Token 架構設計指南

## 📋 **Token 使用場景架構**

本指南說明在實際應用中如何正確配置和使用不同類型的 API Token。

---

## 🎯 **核心概念澄清**

### **API Token 的本質**
```
🔑 API Token 是應用程式的身份證明
├── 代表【應用程式組件】而非【用戶】
├── 權限固定，不因用戶狀態改變
├── 應基於【最小權限原則】選擇
└── 不同組件應使用不同 Token
```

### **Token vs 用戶認證**
```
📋 兩層認證機制：
├── 第一層：API Token（應用程式認證）
│   └── 決定應用程式可以訪問哪些 API
└── 第二層：用戶登入（用戶認證）  
    └── 決定用戶可以看到/操作哪些內容
```

---

## 🏗️ **具體架構設計**

### **場景 1：文章工具前端應用**

#### **前端配置（用戶直接訪問）**
```bash
# 前端 .env.local
STRAPI_URL=http://localhost:1337
STRAPI_API_TOKEN=frontend_read_token_here  # ✅ Read-only Token
```

```javascript
// 前端 API 調用
export async function getArticlePresets() {
  const response = await fetch(`${process.env.STRAPI_URL}/api/article-type-presets`, {
    headers: {
      'Authorization': `Bearer ${process.env.STRAPI_API_TOKEN}` // Read-only
    }
  });
  return response.json();
}
```

**權限範圍：**
- ✅ 讀取文稿類型選項
- ✅ 獲取作者列表  
- ✅ 查看預設內容
- ❌ 無法修改配置
- ❌ 無法創建/刪除內容

### **場景 2：配置管理面板**

#### **管理面板配置（僅管理員訪問）**
```bash
# 管理面板 .env
STRAPI_URL=http://localhost:1337
STRAPI_ADMIN_TOKEN=admin_full_token_here  # ✅ Full Access Token
```

```javascript
// 管理面板 API 調用
export async function updateArticlePreset(id, data) {
  const response = await fetch(`${process.env.STRAPI_URL}/api/article-type-presets/${id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${process.env.STRAPI_ADMIN_TOKEN}`, // Full Access
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  return response.json();
}
```

**權限範圍：**
- ✅ 完整 CRUD 權限
- ✅ 創建/修改文稿類型
- ✅ 管理作者資料
- ✅ 配置預設內容

---

## 🔒 **安全風險分析**

### **❌ 錯誤做法：前端使用 Full Token**

```bash
# ❌ 危險：前端使用管理員 Token
STRAPI_API_TOKEN=admin_full_access_token
```

**風險後果：**
```
🚨 安全漏洞：
├── 任何用戶都可以在瀏覽器開發工具中看到 Token
├── Token 可能被竊取並用於惡意操作
├── 攻擊者可以刪除或修改所有內容
└── 無法追蹤具體是哪個用戶的操作
```

### **✅ 正確做法：分層 Token 設計**

```
🛡️ 安全架構：
├── 前端：Read-only Token
│   ├── 用戶可見但權限有限
│   └── 最大風險：資料洩露（可控）
└── 後端：Full Access Token  
    ├── 僅在安全環境中使用
    └── 攻擊者無法直接獲取
```

---

## 📋 **實際應用場景對比**

### **您的文章工具系統建議配置**

#### **前端應用（用戶使用）**
```javascript
// 用戶介面配置
const FRONTEND_CONFIG = {
  token: 'frontend_read_token',
  permissions: [
    'authors:find',
    'article-type-presets:find',  
    'header-templates:find',
    'footer-templates:find',
    'default-content:find'
  ],
  riskLevel: 'LOW' // 即使洩露也只是讀取
};
```

#### **配置管理面板（管理員使用）**
```javascript
// 管理員介面配置
const ADMIN_CONFIG = {
  token: 'admin_full_token',
  permissions: ['*:*'], // 完整權限
  access: 'ADMIN_ONLY',
  riskLevel: 'HIGH'    // 需要嚴格保護
};
```

#### **後端 API 服務**
```javascript
// 伺服器端處理
const SERVER_CONFIG = {
  token: 'server_full_token',
  environment: 'SERVER_ONLY',
  permissions: ['*:*'],
  riskLevel: 'CONTROLLED' // 在安全環境中
};
```

---

## 🔄 **混合認證流程**

### **完整的用戶操作流程**

```
👤 用戶操作文章工具
    ↓
🌐 前端使用 Read Token 獲取配置選項
    ↓  
📝 用戶填寫文章內容和選項
    ↓
🔐 提交到後端 API（用戶身份驗證）
    ↓
🚀 後端使用 Full Token 執行實際操作
    ↓
✅ 操作完成，記錄用戶行為
```

### **程式碼實現範例**

```javascript
// 前端：獲取選項（Read Token）
async function loadPresets() {
  const presets = await fetch('/api/strapi/presets', {
    headers: { 'Authorization': `Bearer ${READ_TOKEN}` }
  });
  return presets.json();
}

// 後端 API：執行操作（Full Token + 用戶驗證）
export default async function handler(req, res) {
  // 1. 驗證用戶身份
  const user = await verifyUserToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  
  // 2. 使用 Full Token 執行 Strapi 操作
  const result = await fetch(`${STRAPI_URL}/api/articles`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ADMIN_TOKEN}`, // 伺服器端 Full Token
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ...req.body,
      author: user.id // 記錄真實用戶
    })
  });
  
  res.json(result.data);
}
```

---

## 📊 **Token 選擇決策表**

| 使用場景 | Token 類型 | 暴露風險 | 權限範圍 | 建議用途 |
|---------|-----------|---------|---------|---------|
| **前端網頁** | Read-only | 高（用戶可見） | 僅讀取 | 顯示內容 |
| **管理面板** | Custom | 中（管理員可見） | 特定權限 | 配置管理 |
| **後端 API** | Full Access | 低（服務端） | 完整權限 | 數據處理 |
| **自動化腳本** | Full Access | 低（服務端） | 完整權限 | 數據同步 |

---

## 🎯 **最佳實踐建議**

### **立即行動清單**

1. **🔄 重新配置 Token**
   ```bash
   # 為不同用途創建不同 Token
   Frontend_Token: Read-only (90天)
   Admin_Panel_Token: Custom (30天)  
   Server_API_Token: Full Access (Unlimited)
   ```

2. **📁 分離配置檔案**
   ```
   /frontend/.env.local     # Read Token
   /admin-panel/.env       # Custom Token  
   /api/.env              # Full Token (服務端)
   ```

3. **🛡️ 實施安全檢查**
   - [ ] 前端不使用 Full Access Token
   - [ ] 管理面板有額外的用戶認證
   - [ ] 敏感操作通過後端 API 執行
   - [ ] 定期輪換 Token

### **避免常見錯誤**

```
❌ 不要這樣做：
├── 前端直接使用 Full Access Token
├── 在客戶端暴露管理員權限
├── 所有組件使用同一個 Token
└── 忘記設定 Token 過期時間

✅ 應該這樣做：
├── 根據用途選擇適當的 Token 類型
├── 敏感操作放在服務端執行
├── 實施多層認證機制
└── 定期審查和更新 Token
```

---

## 🔍 **檢查清單**

### **安全配置驗證**

- [ ] **前端應用**
  - [ ] 使用 Read-only 或 Custom Token
  - [ ] Token 權限符合最小需求
  - [ ] 無法執行刪除或修改操作

- [ ] **管理面板**  
  - [ ] 有獨立的用戶認證機制
  - [ ] 使用適當權限的 Token
  - [ ] 僅管理員可以訪問

- [ ] **後端 API**
  - [ ] Full Token 僅在服務端使用
  - [ ] 實施用戶身份驗證
  - [ ] 記錄操作日誌

**正確的 Token 架構確保了系統安全性，同時保持了使用的便利性。** 