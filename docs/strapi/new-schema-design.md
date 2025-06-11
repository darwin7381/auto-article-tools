# Strapi Schema 重構設計

## 概述

重構 Strapi 內容類型以支援組合式配置系統：
- **基礎元件**：Authors, Header Disclaimers, Footer Disclaimers
- **組合配置**：Article Type Presets
- **全域設定**：WordPress Settings

## 1. Authors (保留，微調)

**用途**：管理文章作者資訊
**變更**：保持現有結構，微調欄位

```json
{
  "kind": "collectionType",
  "collectionName": "authors",
  "info": {
    "singularName": "author",
    "pluralName": "authors",
    "displayName": "Authors",
    "description": "文章作者管理"
  },
  "attributes": {
    "name": {
      "type": "string",
      "required": true,
      "unique": true,
      "description": "作者帳號名稱"
    },
    "displayName": {
      "type": "string", 
      "required": true,
      "description": "作者顯示名稱"
    },
    "wordpressId": {
      "type": "integer",
      "description": "WordPress 系統中的作者 ID"
    },
    "department": {
      "type": "string",
      "description": "所屬部門"
    },
    "description": {
      "type": "text",
      "description": "作者簡介"
    },
    "isActive": {
      "type": "boolean",
      "default": true,
      "description": "是否啟用"
    }
  }
}
```

## 2. Header Disclaimer Templates (新增)

**用途**：管理文章開頭押註模板
**功能**：可重複使用的開頭押註 HTML 模板

```json
{
  "kind": "collectionType",
  "collectionName": "header_disclaimer_templates",
  "info": {
    "singularName": "header-disclaimer-template",
    "pluralName": "header-disclaimer-templates",
    "displayName": "Header Disclaimer Templates",
    "description": "文章開頭押註模板管理"
  },
  "attributes": {
    "name": {
      "type": "string",
      "required": true,
      "unique": true,
      "description": "系統識別碼，例：sponsored-header"
    },
    "displayName": {
      "type": "string",
      "required": true,
      "description": "顯示名稱，例：廣編稿開頭押註"
    },
    "template": {
      "type": "richtext",
      "required": true,
      "description": "HTML 模板內容，支援變數替換 ［撰稿方名稱］"
    },
    "description": {
      "type": "text",
      "description": "模板說明"
    },
    "isSystemDefault": {
      "type": "boolean",
      "default": false,
      "description": "系統預設項目，不可刪除"
    },
    "isActive": {
      "type": "boolean",
      "default": true,
      "description": "是否啟用"
    }
  }
}
```

## 3. Footer Disclaimer Templates (新增)

**用途**：管理文章末尾押註模板
**功能**：可重複使用的末尾押註 HTML 模板

```json
{
  "kind": "collectionType",
  "collectionName": "footer_disclaimer_templates",
  "info": {
    "singularName": "footer-disclaimer-template",
    "pluralName": "footer-disclaimer-templates",
    "displayName": "Footer Disclaimer Templates",
    "description": "文章末尾押註模板管理"
  },
  "attributes": {
    "name": {
      "type": "string",
      "required": true,
      "unique": true,
      "description": "系統識別碼，例：sponsored-footer"
    },
    "displayName": {
      "type": "string",
      "required": true,
      "description": "顯示名稱，例：廣編稿免責聲明"
    },
    "template": {
      "type": "richtext",
      "required": true,
      "description": "HTML 模板內容"
    },
    "description": {
      "type": "text",
      "description": "模板說明"
    },
    "isSystemDefault": {
      "type": "boolean",
      "default": false,
      "description": "系統預設項目，不可刪除"
    },
    "isActive": {
      "type": "boolean",
      "default": true,
      "description": "是否啟用"
    }
  }
}
```

## 4. Article Type Presets (重構原 ArticleTemplate)

**用途**：組合式文稿類型配置
**功能**：關聯基礎元件，建立完整的文稿類型預設

```json
{
  "kind": "collectionType",
  "collectionName": "article_type_presets",
  "info": {
    "singularName": "article-type-preset",
    "pluralName": "article-type-presets",
    "displayName": "Article Type Presets",
    "description": "文稿類型組合配置管理"
  },
  "attributes": {
    "name": {
      "type": "string",
      "required": true,
      "description": "文稿類型顯示名稱，例：我的自訂廣編稿"
    },
    "code": {
      "type": "string",
      "required": true,
      "unique": true,
      "description": "系統識別碼，例：my-sponsored"
    },
    "description": {
      "type": "text",
      "description": "文稿類型說明"
    },
    "defaultAuthor": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::author.author",
      "required": false,
      "description": "預設作者，可為空"
    },
    "headerDisclaimerTemplate": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::header-disclaimer-template.header-disclaimer-template",
      "required": false,
      "description": "開頭押註模板，可為空"
    },
    "footerDisclaimerTemplate": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::footer-disclaimer-template.footer-disclaimer-template",
      "required": false,
      "description": "末尾押註模板，可為空"
    },
    "requiresAdTemplate": {
      "type": "boolean",
      "default": false,
      "description": "是否需要廣告模板"
    },
    "advancedSettings": {
      "type": "json",
      "description": "其他進階設定的 JSON 資料"
    },
    "isSystemDefault": {
      "type": "boolean",
      "default": false,
      "description": "系統預設類型，不可刪除"
    },
    "isActive": {
      "type": "boolean",
      "default": true,
      "description": "是否啟用"
    },
    "sortOrder": {
      "type": "integer",
      "default": 0,
      "description": "顯示順序"
    }
  }
}
```

## 5. WordPress Settings (保持不變)

**用途**：WordPress 發布全域設定
**變更**：保持現有結構

```json
{
  "kind": "singleType",
  "collectionName": "wordpress_setting",
  "info": {
    "singularName": "wordpress-setting",
    "pluralName": "wordpress-settings",
    "displayName": "WordPress Settings",
    "description": "WordPress 發布預設設定"
  },
  "attributes": {
    "siteName": {
      "type": "string",
      "description": "網站名稱"
    },
    "siteUrl": {
      "type": "string",
      "description": "網站 URL"
    },
    "defaultCategory": {
      "type": "string",
      "description": "預設分類"
    },
    "defaultTags": {
      "type": "string",
      "description": "預設標籤"
    },
    "defaultStatus": {
      "type": "enumeration",
      "enum": ["draft", "pending", "publish", "private"],
      "default": "draft",
      "description": "預設發布狀態"
    },
    "autoPublish": {
      "type": "boolean",
      "default": false,
      "description": "自動發布"
    },
    "featuredImageRequired": {
      "type": "boolean",
      "default": false,
      "description": "是否需要特色圖片"
    },
    "customFooterHtml": {
      "type": "richtext",
      "description": "自訂頁尾 HTML"
    },
    "metaDescription": {
      "type": "text",
      "description": "Meta 描述模板"
    },
    "seoSettings": {
      "type": "json",
      "description": "SEO 設定"
    },
    "isActive": {
      "type": "boolean",
      "default": true,
      "description": "是否啟用"
    }
  }
}
```

## 遷移計劃

### 需要刪除的舊內容類型
- `article-templates` (將由 `article-type-presets` 取代)

### 需要新增的內容類型
- `header-disclaimer-templates`
- `footer-disclaimer-templates` 
- `article-type-presets`

### 需要保留的內容類型
- `authors` (微調欄位)
- `wordpress-setting` (保持不變) 