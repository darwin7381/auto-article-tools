# Strapi Content Types 設計

## 1. Author (作者配置)

```json
{
  "kind": "collectionType",
  "collectionName": "authors",
  "info": {
    "singularName": "author",
    "pluralName": "authors",
    "displayName": "Author",
    "description": "文章作者配置"
  },
  "attributes": {
    "name": {
      "type": "string",
      "required": true,
      "unique": true
    },
    "displayName": {
      "type": "string",
      "required": true
    },
    "wordpressId": {
      "type": "integer",
      "required": false
    },
    "department": {
      "type": "enumeration",
      "enum": ["BTEditor", "BTVerse", "custom"],
      "default": "custom"
    },
    "isActive": {
      "type": "boolean",
      "default": true
    },
    "description": {
      "type": "text"
    }
  }
}
```

## 2. Article Template (文稿模板)

```json
{
  "kind": "collectionType",
  "collectionName": "article_templates",
  "info": {
    "singularName": "article-template",
    "pluralName": "article-templates",
    "displayName": "Article Template",
    "description": "文稿類型模板配置"
  },
  "attributes": {
    "name": {
      "type": "string",
      "required": true,
      "unique": true
    },
    "articleType": {
      "type": "enumeration",
      "enum": ["regular", "sponsored", "press-release"],
      "required": true
    },
    "headerDisclaimer": {
      "type": "richtext"
    },
    "footerDisclaimer": {
      "type": "richtext"
    },
    "footerHtml": {
      "type": "richtext"
    },
    "introQuoteTemplate": {
      "type": "richtext"
    },
    "tgBanner": {
      "type": "richtext"
    },
    "relatedArticlesHeader": {
      "type": "richtext"
    },
    "relatedArticleLinkTemplate": {
      "type": "string"
    },
    "fullTemplate": {
      "type": "richtext"
    },
    "requiresAdTemplate": {
      "type": "boolean",
      "default": false
    },
    "adTemplateUrl": {
      "type": "string"
    },
    "isActive": {
      "type": "boolean",
      "default": true
    },
    "defaultAuthor": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::author.author"
    }
  }
}
```

## 3. WordPress Settings (WordPress 設定)

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
    "defaultPublishStatus": {
      "type": "enumeration",
      "enum": ["draft", "pending", "publish", "private", "future"],
      "default": "draft"
    },
    "defaultCategories": {
      "type": "string",
      "description": "預設分類 ID，多個用逗號分隔"
    },
    "defaultTags": {
      "type": "string",
      "description": "預設標籤，多個用逗號分隔"
    },
    "imageUploadSettings": {
      "type": "json",
      "description": "圖片上傳設定"
    },
    "customFooterHtml": {
      "type": "richtext",
      "description": "自訂頁尾 HTML"
    }
  }
}
```

## 4. Processing Modes (處理模式配置)

```json
{
  "kind": "collectionType",
  "collectionName": "processing_modes",
  "info": {
    "singularName": "processing-mode",
    "pluralName": "processing-modes",
    "displayName": "Processing Mode",
    "description": "文件處理模式配置"
  },
  "attributes": {
    "name": {
      "type": "string",
      "required": true,
      "unique": true
    },
    "description": {
      "type": "text"
    },
    "isAutoMode": {
      "type": "boolean",
      "default": false
    },
    "enabledStages": {
      "type": "json",
      "description": "啟用的處理階段"
    },
    "defaultSettings": {
      "type": "json",
      "description": "預設處理設定"
    },
    "isDefault": {
      "type": "boolean",
      "default": false
    },
    "isActive": {
      "type": "boolean",
      "default": true
    }
  }
}
``` 