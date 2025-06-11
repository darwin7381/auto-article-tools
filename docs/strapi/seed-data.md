# Strapi 種子資料

## 概述

重構後需要建立的系統預設資料，用於初始化基礎元件和預設配置。

## 1. Authors 預設資料

```json
[
  {
    "name": "BTEditor",
    "displayName": "廣編頻道（BTEditor）",
    "wordpressId": 1,
    "department": "BTEditor",
    "description": "動區廣編頻道專用帳號",
    "isActive": true
  },
  {
    "name": "BTVerse",
    "displayName": "BT宙域（BTVerse）",
    "wordpressId": 2,
    "department": "BTVerse",
    "description": "動區宙域頻道專用帳號",
    "isActive": true
  }
]
```

## 2. Header Disclaimer Templates 預設資料

```json
[
  {
    "name": "none",
    "displayName": "無押註",
    "template": "",
    "description": "不顯示開頭押註",
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

## 3. Footer Disclaimer Templates 預設資料

```json
[
  {
    "name": "none",
    "displayName": "無押註",
    "template": "",
    "description": "不顯示末尾押註",
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
    "description": "投資相關內容的風險警告",
    "isSystemDefault": false,
    "isActive": true
  }
]
```

## 4. Article Type Presets 預設資料

**注意**：以下資料中的關聯 ID 需要根據實際建立的資料調整

```json
[
  {
    "name": "廣編稿",
    "code": "sponsored",
    "description": "商業合作內容，包含完整的免責聲明",
    "defaultAuthor": "[BTEditor的實際ID]",
    "headerDisclaimerTemplate": "[sponsored開頭押註的實際ID]",
    "footerDisclaimerTemplate": "[sponsored末尾押註的實際ID]",
    "requiresAdTemplate": true,
    "advancedSettings": {
      "dropcapEnabled": true,
      "relatedArticlesEnabled": true,
      "telegramBannerEnabled": true
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
      "telegramBannerEnabled": true
    },
    "isSystemDefault": true,
    "isActive": true,
    "sortOrder": 2
  },
  {
    "name": "一般文章",
    "code": "regular",
    "description": "標準的動區文章格式",
    "defaultAuthor": null,
    "headerDisclaimerTemplate": "[none開頭押註的實際ID]",
    "footerDisclaimerTemplate": "[none末尾押註的實際ID]",
    "requiresAdTemplate": false,
    "advancedSettings": {
      "dropcapEnabled": true,
      "relatedArticlesEnabled": true,
      "telegramBannerEnabled": true
    },
    "isSystemDefault": true,
    "isActive": true,
    "sortOrder": 3
  }
]
```

## 5. WordPress Settings 預設資料

```json
{
  "siteName": "動區 BlockTempo",
  "siteUrl": "https://blocktempo.com",
  "defaultCategory": "Blockchain Media",
  "defaultTags": "區塊鏈,加密貨幣,動區",
  "defaultStatus": "draft",
  "autoPublish": false,
  "featuredImageRequired": true,
  "customFooterHtml": "<a href=\"https://t.me/blocktemponews/\"><img class=\"alignnone wp-image-194701 size-full\" src=\"https://image.blocktempo.com/2022/11/動區官網tg-banner-1116.png\" alt=\"\" width=\"800\" height=\"164\" /></a>",
  "metaDescription": "動區 BlockTempo 是最具影響力的區塊鏈媒體",
  "seoSettings": {
    "enableAutoSEO": false,
    "defaultKeywords": "區塊鏈,加密貨幣,比特幣,以太坊"
  },
  "isActive": true
}
```

## 建立順序

1. **Authors** (先建立，因為會被其他內容類型關聯)
2. **Header Disclaimer Templates** (先建立基礎模板)
3. **Footer Disclaimer Templates** (先建立基礎模板)
4. **Article Type Presets** (最後建立，關聯前面的資料)
5. **WordPress Settings** (獨立建立)

## 關聯 ID 對應表

建立完成後，請記錄實際的 ID 對應關係：

```
Authors:
- BTEditor: ID = ___
- BTVerse: ID = ___

Header Disclaimer Templates:
- none: ID = ___
- sponsored: ID = ___
- press-release: ID = ___

Footer Disclaimer Templates:
- none: ID = ___
- sponsored: ID = ___
- investment-warning: ID = ___
``` 