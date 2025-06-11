# Strapi 架構配置指南

## 📋 **當前架構概述**

本文檔說明當前 Strapi 5 系統的完整架構和配置指南。

**當前內容類型：**
- ✅ `authors` - 作者管理
- ✅ `header-disclaimer-templates` - 開頭押註模板
- ✅ `footer-disclaimer-templates` - 末尾押註模板
- ✅ `article-type-presets` - 文稿類型預設配置
- ✅ `default-content-setting` - 預設內容設定（前情提要、背景補充、相關閱讀）

---

## 🏗️ **完整設置流程**

### **步驟 1：基礎組件 - Authors**

**用途：** 管理文章作者資訊

**Schema 位置：** 系統自動生成或手動創建

**必要欄位：**
```json
{
  "name": "string (required, unique)",
  "displayName": "string (required)",
  "wordpressId": "integer (optional)",
  "department": "string (optional)",
  "description": "text (optional)",
  "isActive": "boolean (default: true)"
}
```

**預設數據：**
- BTEditor - 廣編頻道專用帳號
- BTVerse - BT宙域頻道專用帳號

### **步驟 2：模板系統 - Header Disclaimer Templates**

**用途：** 管理文章開頭押註模板

**Schema 位置：** 需要手動創建

**必要欄位：**
```json
{
  "name": "string (required, unique)",
  "displayName": "string (required)", 
  "template": "richtext (required)",
  "description": "text (optional)",
  "isSystemDefault": "boolean (default: false)",
  "isActive": "boolean (default: true)"
}
```

**預設模板：**
- `none` - 無押註
- `sponsored` - 廣編稿開頭押註
- `press-release` - 新聞稿開頭押註

### **步驟 3：模板系統 - Footer Disclaimer Templates**

**用途：** 管理文章末尾押註模板

**Schema 結構：** 與 Header Disclaimer Templates 相同

**預設模板：**
- `none` - 無押註
- `sponsored` - 廣編稿免責聲明

### **步驟 4：組合配置 - Article Type Presets**

**用途：** 組合式文稿類型配置，關聯基礎元件

**必要欄位：**
```json
{
  "name": "string (required)",
  "code": "string (required, unique)",
  "description": "text (optional)",
  "defaultAuthor": "relation to Authors (optional)",
  "headerDisclaimerTemplate": "relation to Header Templates (optional)",
  "footerDisclaimerTemplate": "relation to Footer Templates (optional)",
  "requiresAdTemplate": "boolean (default: false)",
  "advancedSettings": "json (optional)",
  "isSystemDefault": "boolean (default: false)",
  "isActive": "boolean (default: true)",
  "sortOrder": "integer (default: 0)"
}
```

**預設配置：**
- 廣編稿（sponsored）
- 新聞稿（press-release）
- 一般文章（regular）

### **步驟 5：預設內容管理 - Default Content Settings**

**用途：** 管理前情提要、背景補充、相關閱讀的預設文章連結

**Schema 類型：** Single Type

**組件依賴：** Article Link Component

#### **5.1 創建 Article Link Component**

**文件位置：** `src/components/content/article-link.json`

```json
{
  "collectionName": "components_content_article_links",
  "info": {
    "displayName": "Article Link",
    "description": "文章連結組件"
  },
  "options": {},
  "attributes": {
    "title": {
      "type": "string",
      "required": true
    },
    "url": {
      "type": "string", 
      "required": true
    }
  }
}
```

#### **5.2 創建 Default Content Settings**

**文件位置：** `src/api/default-content-setting/content-types/default-content-setting/schema.json`

```json
{
  "kind": "singleType",
  "collectionName": "default_content_setting",
  "info": {
    "singularName": "default-content-setting",
    "pluralName": "default-content-settings", 
    "displayName": "Default Content Settings",
    "description": "預設內容設定 - 管理前情提要、背景補充、相關閱讀的預設文章"
  },
  "options": {
    "draftAndPublish": true
  },
  "pluginOptions": {},
  "attributes": {
    "contextArticle": {
      "type": "component",
      "component": "content.article-link",
      "required": false
    },
    "backgroundArticle": {
      "type": "component", 
      "component": "content.article-link",
      "required": false
    },
    "relatedReadingArticles": {
      "type": "component",
      "component": "content.article-link",
      "repeatable": true,
      "max": 5
    },
    "isActive": {
      "type": "boolean",
      "default": true,
      "required": false
    }
  }
}
```

---

## 🚀 **快速部署指南**

### **方法 1：Schema 文件創建（推薦）**

1. 創建必要的 Schema 文件（如上所示）
2. 重啟 Strapi：`npm run develop`
3. Strapi 會自動生成所有必要的 API 和數據庫表

### **方法 2：Admin Panel 手動創建**

1. 打開 Strapi Admin：`http://localhost:1337/admin`
2. 進入 Content-Type Builder
3. 按照上述 Schema 結構手動創建各內容類型

---

## 📊 **數據初始化**

### **使用 API 設置預設內容**

```bash
# 設置預設內容數據
curl -X PUT "http://localhost:1337/api/default-content-setting" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "contextArticle": {
        "title": "Bitcoin 基礎知識：什麼是比特幣？",
        "url": "https://www.blocktempo.com/guides/what-is-bitcoin/"
      },
      "backgroundArticle": {
        "title": "區塊鏈技術完整指南", 
        "url": "https://www.blocktempo.com/guides/blockchain-technology/"
      },
      "relatedReadingArticles": [
        {
          "title": "加密貨幣投資入門指南",
          "url": "https://www.blocktempo.com/guides/cryptocurrency-investment/"
        },
        {
          "title": "DeFi 去中心化金融全解析",
          "url": "https://www.blocktempo.com/guides/defi-guide/"
        },
        {
          "title": "NFT 非同質化代幣指南", 
          "url": "https://www.blocktempo.com/guides/nft-guide/"
        }
      ],
      "isActive": true
    }
  }'
```

---

## ✅ **驗證檢查清單**

### **架構完整性檢查**
- [ ] Authors 內容類型已創建並有預設數據
- [ ] Header Disclaimer Templates 已創建並有基礎模板
- [ ] Footer Disclaimer Templates 已創建並有基礎模板  
- [ ] Article Type Presets 已創建並正確關聯
- [ ] Article Link Component 已創建
- [ ] Default Content Settings Single Type 已創建
- [ ] 預設內容數據已設置並發布

### **API 端點檢查**
```bash
# 檢查所有核心 API
curl "http://localhost:1337/api/authors"
curl "http://localhost:1337/api/header-disclaimer-templates"
curl "http://localhost:1337/api/footer-disclaimer-templates"
curl "http://localhost:1337/api/article-type-presets?populate=*"
curl "http://localhost:1337/api/default-content-setting?populate=*"
```

### **前端集成檢查**
- [ ] Config Panel 可以正常讀取所有配置數據
- [ ] 預設內容管理功能正常運作
- [ ] 文稿類型選擇器正確顯示 Article Type Presets
- [ ] 作者選擇器正確顯示 Authors
- [ ] 押註模板選擇器正確顯示模板選項

---

## 🔗 **相關文件**

- **[Default Content Settings 設置指南](./default-content-settings-setup.md)** - 詳細的預設內容設定指南
- **[Schema 設計文件](./new-schema-design.md)** - 架構設計說明
- **[故障排除指南](./troubleshooting-invalid-id-errors.md)** - 常見問題解決方案
- **[種子資料](./seed-data.md)** - 預設數據參考

---

## 🚨 **重要注意事項**

1. **Strapi 5 嚴格驗證**：確保所有 PUT/PATCH 請求不包含系統字段
2. **關聯查詢**：使用 `?populate=*` 載入所有關聯數據
3. **Single Type**：Default Content Settings 只會有一條記錄
4. **組件複用**：Article Link Component 可在多個地方重複使用
5. **數據完整性**：確保所有關聯關係正確建立

**系統已完全部署並正常運行，這是當前的標準架構。** 