# Strapi 5 種子資料

## 📋 **概述**

當前系統需要建立的預設資料，用於初始化基礎元件和預設配置。

**建立順序：**
1. Authors (先建立，因為會被其他內容類型關聯)
2. Header Disclaimer Templates (先建立基礎模板)
3. Footer Disclaimer Templates (先建立基礎模板)
4. Article Type Presets (最後建立，關聯前面的資料)
5. Default Content Settings (獨立建立，使用 Article Link Component)

---

## 🔧 **1. Authors 預設資料**

**用途：** 基礎作者帳號，供文稿類型預設配置使用

```json
[
  {
    "name": "BTEditor",
    "displayName": "廣編頻道（BTEditor）",
    "wordpressId": 1,
    "department": "BTEditor",
    "description": "動區廣編頻道專用帳號，負責商業合作內容",
    "isActive": true
  },
  {
    "name": "BTVerse",
    "displayName": "BT宙域（BTVerse）",
    "wordpressId": 2,
    "department": "BTVerse",
    "description": "動區宙域頻道專用帳號，負責元宇宙和 Web3 內容",
    "isActive": true
  }
]
```

---

## 🔧 **2. Header Disclaimer Templates 預設資料**

**用途：** 文章開頭押註模板

```json
[
  {
    "name": "none",
    "displayName": "無押註",
    "template": "",
    "description": "不顯示開頭押註，適用於一般文章",
    "isSystemDefault": true,
    "isActive": true
  },
  {
    "name": "sponsored",
    "displayName": "廣編稿開頭押註",
    "template": "<span style=\"color: #808080;\"><em>（本文為廣編稿，由［撰稿方名稱］ 撰文、提供，不代表動區立場，亦非投資建議、購買或出售建議。詳見文末責任警示。）</em></span>",
    "description": "廣編稿專用的開頭免責聲明",
    "isSystemDefault": true,
    "isActive": true
  },
  {
    "name": "press-release",
    "displayName": "新聞稿開頭押註",
    "template": "<span style=\"color: #808080;\"><em>本文為新聞稿，由［撰稿方名稱］ 撰文、提供，不代表動區立場。</em></span>",
    "description": "新聞稿專用的開頭聲明",
    "isSystemDefault": true,
    "isActive": true
  }
]
```

---

## 🔧 **3. Footer Disclaimer Templates 預設資料**

**用途：** 文章末尾押註模板

```json
[
  {
    "name": "none",
    "displayName": "無押註",
    "template": "",
    "description": "不顯示末尾押註，適用於一般文章和新聞稿",
    "isSystemDefault": true,
    "isActive": true
  },
  {
    "name": "sponsored",
    "displayName": "廣編稿免責聲明",
    "template": "<div class=\"alert alert-warning\">（廣編免責聲明：本文內容為供稿者提供之廣宣稿件，供稿者與動區並無任何關係，本文亦不代表動區立場。本文無意提供任何投資、資產建議或法律意見，也不應被視為購買、出售或持有資產的要約。廣宣稿件內容所提及之任何服務、方案或工具等僅供參考，且最終實際內容或規則以供稿方之公布或說明為準，動區不對任何可能存在之風險或損失負責，提醒讀者進行任何決策或行為前務必自行謹慎查核。）</div>",
    "description": "廣編稿專用的詳細免責聲明",
    "isSystemDefault": true,
    "isActive": true
  },
  {
    "name": "investment-warning",
    "displayName": "投資風險警告",
    "template": "<div class=\"alert alert-danger\">⚠️ 投資警示：本文內容僅供參考，不構成投資建議。加密貨幣投資具有高風險，可能導致本金全部損失。請在投資前充分了解風險，並根據自身財務狀況謹慎決策。</div>",
    "description": "投資相關內容的風險警告（可選用）",
    "isSystemDefault": false,
    "isActive": true
  }
]
```

---

## 🔧 **4. Article Type Presets 預設資料**

**用途：** 組合式文稿類型配置

**⚠️ 注意：** 以下資料中的關聯 ID 需要根據實際建立的資料調整

```json
[
  {
    "name": "廣編稿",
    "code": "sponsored",
    "description": "商業合作內容，包含完整的免責聲明和廣告模板",
    "defaultAuthor": "[BTEditor的實際ID]",
    "headerDisclaimerTemplate": "[sponsored開頭押註的實際ID]",
    "footerDisclaimerTemplate": "[sponsored末尾押註的實際ID]",
    "requiresAdTemplate": true,
    "advancedSettings": {
      "dropcapEnabled": true,
      "relatedArticlesEnabled": true,
      "telegramBannerEnabled": true,
      "autoSEO": false
    },
    "isSystemDefault": true,
    "isActive": true,
    "sortOrder": 1
  },
  {
    "name": "新聞稿",
    "code": "press-release",
    "description": "企業或機構發佈的官方新聞稿",
    "defaultAuthor": "[BTVerse的實際ID]",
    "headerDisclaimerTemplate": "[press-release開頭押註的實際ID]",
    "footerDisclaimerTemplate": "[none末尾押註的實際ID]",
    "requiresAdTemplate": false,
    "advancedSettings": {
      "dropcapEnabled": true,
      "relatedArticlesEnabled": true,
      "telegramBannerEnabled": true,
      "autoSEO": false
    },
    "isSystemDefault": true,
    "isActive": true,
    "sortOrder": 2
  },
  {
    "name": "一般文章",
    "code": "regular",
    "description": "標準的動區文章格式，無特殊押註",
    "defaultAuthor": null,
    "headerDisclaimerTemplate": "[none開頭押註的實際ID]",
    "footerDisclaimerTemplate": "[none末尾押註的實際ID]",
    "requiresAdTemplate": false,
    "advancedSettings": {
      "dropcapEnabled": true,
      "relatedArticlesEnabled": true,
      "telegramBannerEnabled": true,
      "autoSEO": true
    },
    "isSystemDefault": true,
    "isActive": true,
    "sortOrder": 3
  }
]
```

---

## 🔧 **5. Default Content Settings 預設資料**

**用途：** 管理前情提要、背景補充、相關閱讀的預設文章連結

**設置方式：** 使用 API 或 Admin Panel

### **API 設置方法：**

```bash
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

### **JSON 格式資料：**

```json
{
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
```

---

## 📋 **建立步驟指南**

### **步驟 1：進入 Strapi Admin**
```
http://localhost:1337/admin
```

### **步驟 2：建立 Authors**
1. 進入 **Content Manager** > **Authors**
2. 點擊 **Create new entry**
3. 填入上述 Authors 預設資料
4. **Save** 並 **Publish**

### **步驟 3：建立 Disclaimer Templates**
1. 建立 **Header Disclaimer Templates**
2. 建立 **Footer Disclaimer Templates**
3. 分別填入上述預設資料
4. **Save** 並 **Publish**

### **步驟 4：建立 Article Type Presets**
1. 進入 **Content Manager** > **Article Type Presets**
2. 建立時需要選擇對應的關聯項目：
   - **defaultAuthor**: 選擇對應的 Author
   - **headerDisclaimerTemplate**: 選擇對應的 Header Template
   - **footerDisclaimerTemplate**: 選擇對應的 Footer Template
3. **Save** 並 **Publish**

### **步驟 5：設置 Default Content Settings**
1. 進入 **Content Manager** > **Default Content Settings**
2. 填入預設的文章連結資料
3. **Save** 並 **Publish**

---

## 🔍 **關聯 ID 對應表**

建立完成後，請記錄實際的 ID 對應關係：

### **Authors**
```
BTEditor: ID = ___
BTVerse: ID = ___
```

### **Header Disclaimer Templates**
```
none: ID = ___
sponsored: ID = ___
press-release: ID = ___
```

### **Footer Disclaimer Templates**
```
none: ID = ___
sponsored: ID = ___
investment-warning: ID = ___
```

### **Article Type Presets**
```
廣編稿 (sponsored): ID = ___
新聞稿 (press-release): ID = ___
一般文章 (regular): ID = ___
```

---

## ✅ **驗證檢查清單**

### **數據完整性檢查**
- [ ] 所有 Authors 已建立並發布
- [ ] 所有 Header Disclaimer Templates 已建立並發布
- [ ] 所有 Footer Disclaimer Templates 已建立並發布
- [ ] 所有 Article Type Presets 已建立並正確關聯
- [ ] Default Content Settings 已設置並發布

### **API 測試**
```bash
# 測試所有 API 端點
curl "http://localhost:1337/api/authors"
curl "http://localhost:1337/api/header-disclaimer-templates"
curl "http://localhost:1337/api/footer-disclaimer-templates"
curl "http://localhost:1337/api/article-type-presets?populate=*"
curl "http://localhost:1337/api/default-content-setting?populate=*"
```

### **關聯關係檢查**
- [ ] Article Type Presets 能正確顯示關聯的 Authors
- [ ] Article Type Presets 能正確顯示關聯的 Disclaimer Templates
- [ ] Default Content Settings 正確顯示所有文章連結

---

## 🚨 **重要注意事項**

1. **建立順序很重要**：必須先建立基礎元件（Authors, Templates），再建立關聯配置（Article Type Presets）

2. **關聯 ID 記錄**：建立 Article Type Presets 時需要手動選擇關聯項目，或記錄 ID 用於 API 建立

3. **系統預設保護**：標記為 `isSystemDefault: true` 的項目是核心配置，不應隨意刪除

4. **發布狀態**：確保所有項目都已 **Published**，否則 API 無法正常讀取

5. **數據更新**：未來如需更新種子資料，建議使用 API 方式批量更新

**種子資料設置完成後，系統即可正常運行所有配置功能。** 