# Strapi Default Content Settings 設置指南

## 📋 **快速設置方法（推薦）**

直接創建 schema 文件，重啟 Strapi 自動生成！

---

## 🔧 **步驟 1：創建 Article Link Component Schema**

### **創建文件：** `src/components/content/article-link.json`

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

---

## 🔧 **步驟 2：創建 Default Content Settings Schema**

### **創建文件：** `src/api/default-content-setting/content-types/default-content-setting/schema.json`

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

## 🔧 **步驟 3：重啟 Strapi**

```bash
# 停止 Strapi (Ctrl+C)
# 重新啟動
npm run develop
```

**Strapi 會自動：**
- 創建 Component
- 創建 Single Type
- 生成相關 API 路由

---

## 📊 **步驟 3：設置預設資料**

### **3.1 進入 Content Manager**
- 路徑：`Content Manager` → `Single Types` → `Default Content Settings`

### **3.2 填寫預設資料**

**Context Article:**
```
Title: 範例前情文章標題
URL: https://www.blocktempo.com/sample-context-article/
```

**Background Article:**
```
Title: 範例背景文章標題
URL: https://www.blocktempo.com/sample-background-article/
```

**Related Reading Articles:**

*Article 1:*
```
Title: 範例相關文章標題一
URL: https://www.blocktempo.com/sample-article-1/
```

*Article 2:*
```
Title: 範例相關文章標題二
URL: https://www.blocktempo.com/sample-article-2/
```

*Article 3:*
```
Title: 範例相關文章標題三
URL: https://www.blocktempo.com/sample-article-3/
```

**Is Active:** ✅ 勾選

### **3.3 發布內容**
- 點擊右上角 `Save`
- 點擊 `Publish`

---

## ✅ **完成檢查清單**

- [ ] Article Link Component 已創建
- [ ] Default Content Settings Single Type 已創建
- [ ] 預設資料已填寫
- [ ] 內容已發布
- [ ] API 可以正常訪問：`GET /api/default-content-setting`

---

## 🔗 **API 端點**

```
GET /api/default-content-setting?populate=*
```

**回應格式預覽：**
```json
{
  "data": {
    "id": 1,
    "attributes": {
      "contextArticle": {
        "title": "範例前情文章標題",
        "url": "https://www.blocktempo.com/sample-context-article/"
      },
      "backgroundArticle": {
        "title": "範例背景文章標題", 
        "url": "https://www.blocktempo.com/sample-background-article/"
      },
      "relatedReadingArticles": [
        {
          "title": "範例相關文章標題一",
          "url": "https://www.blocktempo.com/sample-article-1/"
        }
      ],
      "isActive": true
    }
  }
}
```

---

## 📝 **注意事項**

1. **Single Type** 只會有一條記錄，用於儲存全局預設設定
2. **Component** 是可重複使用的結構，用於 title + url 組合
3. **API ID** 必須使用 kebab-case (用 `-` 連接)
4. 記得在查詢時使用 `?populate=*` 來載入所有關聯資料

---

## 🚨 **故障排除**

如果在使用過程中遇到 `"invalid key id"` 錯誤，請參考詳細的故障排除指南：

**📖 [Strapi 5 "Invalid Key ID" 錯誤故障排除指南](./troubleshooting-invalid-id-errors.md)**

常見問題：
- PUT/PATCH 請求包含系統字段（id, documentId 等）
- 表單數據初始化時未過濾 ID 字段
- 合併數據時保留了原始對象的完整結構

**快速解決：** 確保所有更新請求只包含業務字段（title, url, isActive），不包含任何 Strapi 系統字段。 