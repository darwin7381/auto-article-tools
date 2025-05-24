# 廣編稿/新聞稿進階格式化功能設計方案

## 1. 現有架構分析

### 1.1 現有系統架構回顧
根據 `auto-params-design.md` 文檔，目前系統採用階段性流水線處理：
- **初步處理階段**：upload → extract → process
- **後期處理階段**：advanced-ai → format-conversion → copy-editing
- **上稿階段**：prep-publish → publish-news

### 1.2 現有功能優勢
- ✅ 基礎WordPress參數自動提取（標題、分類、標籤等）
- ✅ 標題與內容統一編輯體驗
- ✅ 特色圖片自動提取與處理
- ✅ 多層錯誤處理與回退機制
- ✅ 三種操作模式支援（全自動、半自動、手動）

### 1.3 現有架構限制
- ❌ 所有格式化邏輯集中在copy-editing階段
- ❌ AI負責處理嚴格格式要求（不可靠）
- ❌ 缺乏文稿分類機制
- ❌ 沒有模板化的格式應用系統

## 2. 新需求分析

### 2.1 廣編稿特殊需求
**押註要求**：
- 正文前方押註：
  ```html
  <span style="color: #808080;"><em>本文為廣編稿，由［撰稿方名稱］ 撰文、提供，不代表動區立場，亦非投資建議、購買或出售建議。詳見文末責任警示。</em></span>
  ```
- 正文文末押註：
  ```html
  <div class="alert alert-warning">廣編免責聲明：本文內容為供稿者提供之廣宣稿件，供稿者與動區並無任何關係，本文亦不代表動區立場。本文無意提供任何投資、資產建議或法律意見，也不應被視為購買、出售或持有資產的要約。廣宣稿件內容所提及之任何服務、方案或工具等僅供參考，且最終實際內容或規則以供稿方之公布或說明為準，動區不對任何可能存在之風險或損失負責，提醒讀者進行任何決策或行為前務必自行謹慎查核。</div>
  ```
- 作者設定：「廣編頻道（BTEditor）」
- 封面圖片：需要套入AD模板（右上角AD標示）
- AD模板連結：https://www.canva.com/design/DAFvcOqDOD8/msglmQ4I-dU3Pq8R9m2mlg/edit

**完整廣編稿HTML模板**：
```html
<p class="intro_quote">AI 摘要引言

（前情提要：<span style="color: #ff6600;"><a style="color: #ff6600;" href="[前情文章URL]" target="_blank" rel="noopener">[前情文章標題]</a></span>）

（背景補充：<span style="color: #ff6600;"><a style="color: #ff6600;" href="[背景文章URL]" target="_blank" rel="noopener">[背景文章標題]</a></span>）</p>

&nbsp;

<span style="color: #808080;"><em>本文為廣編稿，由［撰稿方名稱］ 撰文、提供，不代表動區立場，亦非投資建議、購買或出售建議。詳見文末責任警示。</em></span>

<hr />

<span class="dropcap " style="background-color: #ffffff; color: #000000; border-color: #ffffff;">[第一個字]</span> [正文內容]

[文章內容...]

＿＿＿

<div class="alert alert-warning">廣編免責聲明：本文內容為供稿者提供之廣宣稿件，供稿者與動區並無任何關係，本文亦不代表動區立場。本文無意提供任何投資、資產建議或法律意見，也不應被視為購買、出售或持有資產的要約。廣宣稿件內容所提及之任何服務、方案或工具等僅供參考，且最終實際內容或規則以供稿方之公布或說明為準，動區不對任何可能存在之風險或損失負責，提醒讀者進行任何決策或行為前務必自行謹慎查核。</div>

<a href="https://t.me/blocktemponews/"><img class="alignnone wp-image-194701 size-full" src="https://image.blocktempo.com/2022/11/動區官網tg-banner-1116.png" alt="" width="800" height="164" /></a>

<h5>📍相關報導📍</h5>
[2-4個相關文章連結，格式為粗體]
```

### 2.2 新聞稿特殊需求
**押註要求**：
- 僅需正文前方押註：
  ```html
  <span style="color: #808080;"><em>本文為新聞稿，由［撰稿方名稱］ 撰文、提供，不代表動區立場。</em></span>
  ```
- 無需文末免責聲明
- 作者設定：「BT宙域（BTVerse）」
- 封面圖片：不需要AD模板

**完整新聞稿HTML模板**：
```html
<p class="intro_quote">AI 摘要引言
（前情提要：<span style="color: #ff6600;"><a style="color: #ff6600;" href="[前情文章URL]" target="_blank" rel="noopener">[前情文章標題]</a></span>）
（背景補充：<span style="color: #ff6600;"><a style="color: #ff6600;" href="[背景文章URL]" target="_blank" rel="noopener">[背景文章標題]</a></span>）</p>

<span style="color: #808080;"><em>本文為新聞稿，由［撰稿方名稱］ 撰文、提供，不代表動區立場。</em></span>

<hr />

<span style="font-weight: 400;"><span class="dropcap " style="background-color: #ffffff; color: #000000; border-color: #ffffff;">[第一個字]</span> [正文內容]

[文章內容...]

<a href="https://t.me/blocktemponews/"><img class="alignnone wp-image-194701 size-full" src="https://image.blocktempo.com/2022/11/動區官網tg-banner-1116.png" alt="" width="800" height="164" /></a>
<h5>📍相關報導📍</h5>
[2-4個相關文章連結，格式為粗體]
```

### 2.3 共同格式要求
**內容格式要求**：
- 不要將發布時間解禁敘述抓取進正文（如：EMBARGOED TILL 9 MAY 2025, 11:00 AM GMT+8）
- 第一段開頭第一個字使用Dropcap格式：
  ```html
  <span class="dropcap " style="background-color: #ffffff; color: #000000; border-color: #ffffff;">[字]</span>
  ```
- 英文和數字前後要空半格（段首除外）
- 段落標題優先設為「標題三」
- 內文標題層級：標題三 > 標題四 > 段落/Text（粗體）
- 中國用語轉台灣用語：
  - 網絡 → 網路
  - 信息 → 資訊/訊息（依上下文判斷）

**引言與關聯文章要求**：
- 文章有副標題：直接將副標題作為引言
- 無副標題：AI摘要全文重點，不超過100字
- 引言區塊使用 `intro_quote` class
- 前情提要、背景補充：從BlockTempo搜尋相關文章
- 引言格式模板：
  ```html
  <p class="intro_quote">AI 摘要引言

  （前情提要：<span style="color: #ff6600;"><a style="color: #ff6600;" href="[URL]" target="_blank" rel="noopener">[標題]</a></span>）

  （背景補充：<span style="color: #ff6600;"><a style="color: #ff6600;" href="[URL]" target="_blank" rel="noopener">[標題]</a></span>）</p>
  ```

**文末連結規則**：
- 最多可放3個連結
- 需刪除Telegram（TG）、LINE社群連結
- 若超過3個，選擇排除TG/LINE的前三個連結
- 相關閱讀連結格式為粗體：
  ```html
  <strong><span style="color: #ff0000;"><a href="[URL]">[標題]</a></span></strong>
  <strong><a href="[URL]">[標題]</a></strong>
  ```

**圖片處理要求**：
- 封面首圖建議尺寸：750×375 px（2:1比例）
- 廣編稿需套入AD模板，右上角有AD標示
- 新聞稿不需要AD模板
- 圖片檔案大小須小於2MB
- PNG圖檔可轉為JPG減少檔案大小
- JPG仍過大需壓縮至2MB以下

**永久連結處理**：
- 將文章標題翻譯為英文
- 全部小寫，單字間用 `-` 連接
- 範例：`t-rex-raises-17m-to-reshape-web3s-attention-economy-layer`

## 3. 建議架構方案：多階段分層處理

### 3.1 核心設計原則
1. **AI智能分析** vs **模板化格式應用** 分離
2. **用戶控制決策點** vs **系統自動處理** 明確劃分
3. **可靠的格式模板** vs **靈活的內容編輯** 平衡

### 3.2 新架構流程圖
```
upload (文稿分類) → extract → process → advanced-ai → format-conversion → 
copy-editing (AI智能分析) → article-formatting (模板應用) → prep-publish → publish-news
```

### 3.3 各階段職責重新劃分

#### 階段1：文稿分類階段 (upload強化)
**位置**：upload階段增加文稿類型選擇
**職責**：
- 用戶選擇文稿類型：`廣編稿` / `新聞稿` / `一般文章`
- 記錄文稿分類資訊到處理狀態
- 初始化對應的處理設定

**資料結構**：
```typescript
interface ArticleClassification {
  articleType: 'sponsored' | 'press-release' | 'regular';
  author?: 'BTEditor' | 'BTVerse' | 'custom';
  requiresAdTemplate: boolean;
  templateVersion: string;
}
```

#### 階段2：AI智能分析階段 (copy-editing強化)
**位置**：現有copy-editing階段
**AI適合處理的任務**：
- ✅ 關聯文章搜尋（前情提要、背景補充、相關閱讀）
- ✅ 中文用語轉換（網絡→網路、信息→資訊）
- ✅ 內容摘要生成
- ✅ 永久連結英文翻譯
- ✅ 基礎WordPress參數提取
- ✅ 撰稿方名稱識別

**AI不應處理的任務**：
- ❌ 嚴格格式的押註插入
- ❌ 免責聲明模板
- ❌ Dropcap格式化
- ❌ HTML結構模板應用

**輸出結構**：
```typescript
interface EnhancedCopyEditingResult {
  wordpress_params: WordPressParams;
  article_classification: ArticleClassification;
  content_analysis: {
    author_name?: string;
    chinese_terminology_fixes: string[];
    suggested_slug: string;
    excerpt: string;
  };
  related_articles: {
    background: Article[];
    previous_context: Article[];
    related_reading: Article[];
  };
}
```

#### 階段3：格式模板應用階段 (新增 article-formatting)
**位置**：prep-publish之前新增獨立階段
**職責**：
- 根據文稿類型應用對應HTML模板
- 插入押註和免責聲明（預定義模板）
- 應用Dropcap格式到第一段
- 插入關聯文章連結區塊
- 設定對應作者
- 應用品牌特殊樣式

**模板系統**：
```typescript
const ArticleTemplates = {
  sponsored: {
    name: '廣編稿',
    author: 'BTEditor',
    authorDisplayName: '廣編頻道（BTEditor）',
    requiresAdTemplate: true,
    adTemplateUrl: 'https://www.canva.com/design/DAFvcOqDOD8/msglmQ4I-dU3Pq8R9m2mlg/edit',
    
    headerDisclaimer: '<span style="color: #808080;"><em>本文為廣編稿，由［撰稿方名稱］ 撰文、提供，不代表動區立場，亦非投資建議、購買或出售建議。詳見文末責任警示。</em></span>',
    
    footerDisclaimer: '<div class="alert alert-warning">廣編免責聲明：本文內容為供稿者提供之廣宣稿件，供稿者與動區並無任何關係，本文亦不代表動區立場。本文無意提供任何投資、資產建議或法律意見，也不應被視為購買、出售或持有資產的要約。廣宣稿件內容所提及之任何服務、方案或工具等僅供參考，且最終實際內容或規則以供稿方之公布或說明為準，動區不對任何可能存在之風險或損失負責，提醒讀者進行任何決策或行為前務必自行謹慎查核。</div>',
    
    dropcapStyle: '<span class="dropcap " style="background-color: #ffffff; color: #000000; border-color: #ffffff;">',
    
    introQuoteTemplate: `<p class="intro_quote">{excerpt}

（前情提要：<span style="color: #ff6600;"><a style="color: #ff6600;" href="{backgroundUrl}" target="_blank" rel="noopener">{backgroundTitle}</a></span>）

（背景補充：<span style="color: #ff6600;"><a style="color: #ff6600;" href="{contextUrl}" target="_blank" rel="noopener">{contextTitle}</a></span>）</p>`,

    tgBanner: '<a href="https://t.me/blocktemponews/"><img class="alignnone wp-image-194701 size-full" src="https://image.blocktempo.com/2022/11/動區官網tg-banner-1116.png" alt="" width="800" height="164" /></a>',
    
    relatedArticlesHeader: '<h5>📍相關報導📍</h5>',
    
    relatedArticleLinkTemplate: '<strong><span style="color: #ff0000;"><a href="{url}">{title}</a></span></strong>',
    
    fullTemplate: `{introQuote}

&nbsp;

{headerDisclaimer}

<hr />

{dropcapContent}

{mainContent}

＿＿＿

{footerDisclaimer}

{tgBanner}

{relatedArticlesHeader}
{relatedArticles}`,

    relatedArticlesCount: { min: 2, max: 4 },
    maxExternalLinks: 3,
    excludeLinkTypes: ['telegram', 'line'],
    imageSize: { width: 750, height: 375 }, // 2:1 ratio
    maxImageSizeMB: 2
  },
  
  pressRelease: {
    name: '新聞稿',
    author: 'BTVerse',
    authorDisplayName: 'BT宙域（BTVerse）',
    requiresAdTemplate: false,
    
    headerDisclaimer: '<span style="color: #808080;"><em>本文為新聞稿，由［撰稿方名稱］ 撰文、提供，不代表動區立場。</em></span>',
    
    footerDisclaimer: null,
    
    dropcapStyle: '<span class="dropcap " style="background-color: #ffffff; color: #000000; border-color: #ffffff;">',
    
    introQuoteTemplate: `<p class="intro_quote">{excerpt}
（前情提要：<span style="color: #ff6600;"><a style="color: #ff6600;" href="{backgroundUrl}" target="_blank" rel="noopener">{backgroundTitle}</a></span>）
（背景補充：<span style="color: #ff6600;"><a style="color: #ff6600;" href="{contextUrl}" target="_blank" rel="noopener">{contextTitle}</a></span>）</p>`,

    tgBanner: '<a href="https://t.me/blocktemponews/"><img class="alignnone wp-image-194701 size-full" src="https://image.blocktempo.com/2022/11/動區官網tg-banner-1116.png" alt="" width="800" height="164" /></a>',
    
    relatedArticlesHeader: '<h5>📍相關報導📍</h5>',
    
    relatedArticleLinkTemplate: '<strong><a href="{url}">{title}</a></strong>',
    
    fullTemplate: `{introQuote}

{headerDisclaimer}

<hr />

<span style="font-weight: 400;">{dropcapContent}

{mainContent}

{tgBanner}
{relatedArticlesHeader}
{relatedArticles}`,

    relatedArticlesCount: { min: 2, max: 4 },
    maxExternalLinks: 3,
    excludeLinkTypes: ['telegram', 'line'],
    imageSize: { width: 750, height: 375 }, // 2:1 ratio
    maxImageSizeMB: 2
  },
  
  regular: {
    name: '一般文章',
    author: 'custom',
    authorDisplayName: null,
    requiresAdTemplate: false,
    
    headerDisclaimer: null,
    footerDisclaimer: null,
    
    dropcapStyle: '<span class="dropcap " style="background-color: #ffffff; color: #000000; border-color: #ffffff;">',
    
    introQuoteTemplate: `<p class="intro_quote">{excerpt}

（前情提要：<span style="color: #ff6600;"><a style="color: #ff6600;" href="{backgroundUrl}" target="_blank" rel="noopener">{backgroundTitle}</a></span>）

（背景補充：<span style="color: #ff6600;"><a style="color: #ff6600;" href="{contextUrl}" target="_blank" rel="noopener">{contextTitle}</a></span>）</p>`,

    tgBanner: '<a href="https://t.me/blocktemponews/"><img class="alignnone wp-image-194701 size-full" src="https://image.blocktempo.com/2022/11/動區官網tg-banner-1116.png" alt="" width="800" height="164" /></a>',
    
    relatedArticlesHeader: '<h5>📍相關報導📍</h5>',
    
    relatedArticleLinkTemplate: '<strong><a href="{url}">{title}</a></strong>',
    
    fullTemplate: `{introQuote}

{dropcapContent}

{mainContent}

{tgBanner}
{relatedArticlesHeader}
{relatedArticles}`,

    relatedArticlesCount: { min: 2, max: 4 },
    maxExternalLinks: 3,
    excludeLinkTypes: ['telegram', 'line'],
    imageSize: { width: 750, height: 375 }, // 2:1 ratio
    maxImageSizeMB: 2
  }
};
```

**內容處理規則**：
```typescript
const ContentProcessingRules = {
  // 中文用語轉換規則
  terminologyMap: {
    '網絡': '網路',
    '信息': '資訊', // 預設為資訊，可依上下文調整為訊息
    '數據': '資料',
    '網站': '網站',
    '服務器': '伺服器',
    '用戶': '使用者',
    '軟件': '軟體',
    '數字': '數位'
  },
  
  // 標題層級規則
  headingHierarchy: ['h3', 'h4', 'strong'], // 標題三 > 標題四 > 粗體
  
  // 需要排除的內容
  excludePatterns: [
    /EMBARGOED\s+TILL\s+.+/gi, // 發布時間解禁敘述
    /禁止轉載\s+.+/gi,
    /版權所有\s+.+/gi
  ],
  
  // 文末連結處理
  linkFiltering: {
    maxLinks: 3,
    excludePatterns: [
      /telegram/gi,
      /line/gi,
      /t\.me/gi,
      /line\.me/gi
    ]
  },
  
  // 圖片處理規則
  imageProcessing: {
    maxSizeMB: 2,
    recommendedDimensions: { width: 750, height: 375 },
    supportedFormats: ['jpg', 'jpeg', 'png', 'webp'],
    compressionSettings: {
      quality: 0.8,
      format: 'jpg' // PNG轉JPG減少檔案大小
    }
  }
};
```

#### 階段4：圖片處理階段 (publish-news強化)
**位置**：現有publish-news階段
**新增功能**：
- 自動檢測是否需要AD模板（根據文稿類型）
- 圖片尺寸檢查和壓縮建議
- 特色圖片模板應用
- 圖片alt文字優化

## 4. 具體實施建議

### 4.1 前端UI改進

#### 文稿分類選擇器 (upload階段)
```typescript
const ArticleTypeSelector = () => (
  <div className="article-type-selection mb-4">
    <label className="block text-sm font-medium mb-2">文稿類型：</label>
    <select className="w-full p-2 border rounded">
      <option value="regular">一般文章</option>
      <option value="sponsored">廣編稿</option>
      <option value="press-release">新聞稿</option>
    </select>
    <p className="text-xs text-gray-500 mt-1">
      選擇文稿類型將自動應用對應的格式模板和發布設定
    </p>
  </div>
);
```

#### 格式預覽界面 (article-formatting階段)
```typescript
const FormattingPreview = () => (
  <div className="formatting-preview">
    <h3>格式化預覽</h3>
    <div className="preview-sections">
      <div className="disclaimer-preview">押註預覽</div>
      <div className="content-preview">內容預覽</div>
      <div className="related-articles-preview">關聯文章預覽</div>
    </div>
  </div>
);
```

### 4.2 後端處理邏輯

#### CopyEditorAgent擴展
```typescript
class EnhancedCopyEditorAgent {
  async analyzeContent(content: string, classification: ArticleClassification) {
    // 1. 基礎參數提取（現有功能）
    const basicParams = await this.extractBasicParams(content);
    
    // 2. 關聯文章搜尋
    const relatedArticles = await this.searchRelatedArticles(content);
    
    // 3. 內容分析與改進
    const contentAnalysis = await this.analyzeContentQuality(content);
    
    // 4. 撰稿方識別
    const authorInfo = await this.identifyAuthor(content);
    
    return {
      wordpress_params: basicParams,
      article_classification: classification,
      content_analysis: contentAnalysis,
      related_articles: relatedArticles,
      author_info: authorInfo
    };
  }
}
```

#### 文章格式化處理器
```typescript
class ArticleFormattingProcessor {
  async formatArticle(content: string, classification: ArticleClassification, analysisResult: EnhancedCopyEditingResult) {
    // 1. 選擇對應模板
    const template = ArticleTemplates[classification.articleType];
    
    // 2. 應用內容處理規則
    content = this.applyContentProcessingRules(content);
    
    // 3. 應用Dropcap格式到第一段
    content = this.applyDropcap(content, template.dropcapStyle);
    
    // 4. 構建引言區塊
    const introQuote = this.buildIntroQuote(template, analysisResult);
    
    // 5. 插入押註
    const headerDisclaimer = this.insertHeaderDisclaimer(template, analysisResult.author_info);
    
    // 6. 插入關聯文章
    const relatedArticles = this.buildRelatedArticles(template, analysisResult.related_articles);
    
    // 7. 使用完整模板組合內容
    const formattedContent = template.fullTemplate
      .replace('{introQuote}', introQuote)
      .replace('{headerDisclaimer}', headerDisclaimer || '')
      .replace('{dropcapContent}', content)
      .replace('{mainContent}', '')
      .replace('{footerDisclaimer}', template.footerDisclaimer || '')
      .replace('{tgBanner}', template.tgBanner)
      .replace('{relatedArticlesHeader}', template.relatedArticlesHeader)
      .replace('{relatedArticles}', relatedArticles);
    
    return {
      formattedContent,
      template: template,
      metadata: {
        author: template.authorDisplayName,
        requiresAdTemplate: template.requiresAdTemplate,
        adTemplateUrl: template.adTemplateUrl
      }
    };
  }
  
  private applyContentProcessingRules(content: string): string {
    // 應用中文用語轉換
    for (const [chinese, taiwanese] of Object.entries(ContentProcessingRules.terminologyMap)) {
      content = content.replace(new RegExp(chinese, 'g'), taiwanese);
    }
    
    // 移除發布時間解禁敘述
    for (const pattern of ContentProcessingRules.excludePatterns) {
      content = content.replace(pattern, '');
    }
    
    // 處理英文和數字前後空格
    content = this.addSpacesAroundEnglishAndNumbers(content);
    
    // 處理標題層級
    content = this.normalizeHeadings(content);
    
    return content;
  }
  
  private applyDropcap(content: string, dropcapStyle: string): string {
    // 找到第一段的第一個字並應用Dropcap
    const firstParagraph = content.match(/<p[^>]*>(.*?)<\/p>/i);
    if (firstParagraph && firstParagraph[1]) {
      const firstChar = firstParagraph[1].charAt(0);
      if (firstChar && /[\u4e00-\u9fa5a-zA-Z]/.test(firstChar)) {
        const dropcapHtml = `${dropcapStyle}${firstChar}</span>`;
        const remainingText = firstParagraph[1].substring(1);
        const newParagraph = `<p>${dropcapHtml}${remainingText}</p>`;
        content = content.replace(firstParagraph[0], newParagraph);
      }
    }
    return content;
  }
  
  private buildIntroQuote(template: any, analysisResult: EnhancedCopyEditingResult): string {
    const { content_analysis, related_articles } = analysisResult;
    
    return template.introQuoteTemplate
      .replace('{excerpt}', content_analysis.excerpt || 'AI摘要引言')
      .replace('{backgroundUrl}', related_articles.background[0]?.url || '#')
      .replace('{backgroundTitle}', related_articles.background[0]?.title || '背景文章')
      .replace('{contextUrl}', related_articles.previous_context[0]?.url || '#')
      .replace('{contextTitle}', related_articles.previous_context[0]?.title || '前情文章');
  }
  
  private insertHeaderDisclaimer(template: any, authorInfo: any): string | null {
    if (!template.headerDisclaimer) return null;
    
    const authorName = authorInfo?.name || '撰稿方名稱';
    return template.headerDisclaimer.replace('［撰稿方名稱］', authorName);
  }
  
  private buildRelatedArticles(template: any, relatedArticles: any): string {
    const articles = relatedArticles.related_reading || [];
    const maxCount = template.relatedArticlesCount.max;
    
    return articles
      .slice(0, maxCount)
      .map((article: any) => 
        template.relatedArticleLinkTemplate
          .replace('{url}', article.url)
          .replace('{title}', article.title)
      )
      .join('\n\n');
  }
  
  private addSpacesAroundEnglishAndNumbers(content: string): string {
    // 在中文與英文/數字之間添加空格，但段首除外
    content = content.replace(/([\u4e00-\u9fa5])([a-zA-Z0-9])/g, '$1 $2');
    content = content.replace(/([a-zA-Z0-9])([\u4e00-\u9fa5])/g, '$1 $2');
    
    // 移除段首的多餘空格
    content = content.replace(/(<p[^>]*>)\s+/g, '$1');
    
    return content;
  }
  
  private normalizeHeadings(content: string): string {
    // 將標題標籤正規化為指定層級
    const hierarchy = ContentProcessingRules.headingHierarchy;
    
    // 這裡可以添加標題層級正規化邏輯
    // 例如：將所有h1, h2轉為h3，h5, h6轉為h4等
    content = content.replace(/<h[12]([^>]*)>/gi, '<h3$1>');
    content = content.replace(/<\/h[12]>/gi, '</h3>');
    content = content.replace(/<h[56]([^>]*)>/gi, '<h4$1>');
    content = content.replace(/<\/h[56]>/gi, '</h4>');
    
    return content;
  }
  
  private filterExternalLinks(content: string, maxLinks: number, excludePatterns: RegExp[]): string {
    // 處理文末連結過濾邏輯
    // 這裡需要實現移除TG/LINE連結並限制連結數量的邏輯
    
    // 找到所有外部連結
    const linkMatches = content.match(/<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi) || [];
    
    // 過濾掉不需要的連結
    const filteredLinks = linkMatches.filter(link => {
      return !excludePatterns.some(pattern => pattern.test(link));
    });
    
    // 限制連結數量
    const limitedLinks = filteredLinks.slice(0, maxLinks);
    
    // 重建內容（這裡需要更複雜的邏輯來替換原始連結）
    return content;
  }
}
```

#### 圖片處理器擴展
```typescript
class ImageProcessor {
  async processFeatureImage(imageUrl: string, articleType: string): Promise<ProcessedImageResult> {
    const template = ArticleTemplates[articleType];
    
    if (template.requiresAdTemplate) {
      return await this.applyAdTemplate(imageUrl, template.adTemplateUrl);
    }
    
    return await this.optimizeImage(imageUrl, template.imageSize, template.maxImageSizeMB);
  }
  
  private async applyAdTemplate(imageUrl: string, adTemplateUrl: string): Promise<ProcessedImageResult> {
    // 實現AD模板應用邏輯
    // 1. 下載原始圖片
    // 2. 應用AD模板（右上角AD標示）
    // 3. 調整尺寸為750x375
    // 4. 壓縮到2MB以下
    
    return {
      processedImageUrl: `${imageUrl}?ad_template=applied`,
      originalSize: 0,
      compressedSize: 0,
      dimensions: { width: 750, height: 375 },
      hasAdTemplate: true
    };
  }
  
  private async optimizeImage(imageUrl: string, targetSize: any, maxSizeMB: number): Promise<ProcessedImageResult> {
    // 實現圖片優化邏輯
    // 1. 檢查檔案大小
    // 2. 如果是PNG，轉為JPG
    // 3. 壓縮到指定大小以下
    // 4. 調整尺寸
    
    return {
      processedImageUrl: imageUrl,
      originalSize: 0,
      compressedSize: 0,
      dimensions: targetSize,
      hasAdTemplate: false
    };
  }
}

interface ProcessedImageResult {
  processedImageUrl: string;
  originalSize: number;
  compressedSize: number;
  dimensions: { width: number; height: number };
  hasAdTemplate: boolean;
}
```

### 4.3 設定檔管理

#### 模板設定檔
```typescript
// src/config/article-templates.ts
export const ArticleTemplates = {
  sponsored: {
    name: '廣編稿',
    author: 'BTEditor',
    authorDisplayName: '廣編頻道（BTEditor）',
    requiresAdTemplate: true,
    adTemplateUrl: 'https://www.canva.com/design/DAFvcOqDOD8/msglmQ4I-dU3Pq8R9m2mlg/edit',
    
    headerDisclaimer: '<span style="color: #808080;"><em>本文為廣編稿，由［撰稿方名稱］ 撰文、提供，不代表動區立場，亦非投資建議、購買或出售建議。詳見文末責任警示。</em></span>',
    
    footerDisclaimer: '<div class="alert alert-warning">廣編免責聲明：本文內容為供稿者提供之廣宣稿件，供稿者與動區並無任何關係，本文亦不代表動區立場。本文無意提供任何投資、資產建議或法律意見，也不應被視為購買、出售或持有資產的要約。廣宣稿件內容所提及之任何服務、方案或工具等僅供參考，且最終實際內容或規則以供稿方之公布或說明為準，動區不對任何可能存在之風險或損失負責，提醒讀者進行任何決策或行為前務必自行謹慎查核。</div>',
    
    dropcapStyle: '<span class="dropcap " style="background-color: #ffffff; color: #000000; border-color: #ffffff;">',
    
    introQuoteTemplate: `<p class="intro_quote">{excerpt}

（前情提要：<span style="color: #ff6600;"><a style="color: #ff6600;" href="{backgroundUrl}" target="_blank" rel="noopener">{backgroundTitle}</a></span>）

（背景補充：<span style="color: #ff6600;"><a style="color: #ff6600;" href="{contextUrl}" target="_blank" rel="noopener">{contextTitle}</a></span>）</p>`,

    tgBanner: '<a href="https://t.me/blocktemponews/"><img class="alignnone wp-image-194701 size-full" src="https://image.blocktempo.com/2022/11/動區官網tg-banner-1116.png" alt="" width="800" height="164" /></a>',
    
    relatedArticlesHeader: '<h5>📍相關報導📍</h5>',
    
    relatedArticleLinkTemplate: '<strong><span style="color: #ff0000;"><a href="{url}">{title}</a></span></strong>',
    
    fullTemplate: `{introQuote}

&nbsp;

{headerDisclaimer}

<hr />

{dropcapContent}

{mainContent}

＿＿＿

{footerDisclaimer}

{tgBanner}

{relatedArticlesHeader}
{relatedArticles}`,

    relatedArticlesCount: { min: 2, max: 4 },
    maxExternalLinks: 3,
    excludeLinkTypes: ['telegram', 'line'],
    imageSize: { width: 750, height: 375 }, // 2:1 ratio
    maxImageSizeMB: 2
  },
  
  pressRelease: {
    name: '新聞稿',
    author: 'BTVerse',
    authorDisplayName: 'BT宙域（BTVerse）',
    requiresAdTemplate: false,
    
    headerDisclaimer: '<span style="color: #808080;"><em>本文為新聞稿，由［撰稿方名稱］ 撰文、提供，不代表動區立場。</em></span>',
    
    footerDisclaimer: null,
    
    dropcapStyle: '<span class="dropcap " style="background-color: #ffffff; color: #000000; border-color: #ffffff;">',
    
    introQuoteTemplate: `<p class="intro_quote">{excerpt}
（前情提要：<span style="color: #ff6600;"><a style="color: #ff6600;" href="{backgroundUrl}" target="_blank" rel="noopener">{backgroundTitle}</a></span>）
（背景補充：<span style="color: #ff6600;"><a style="color: #ff6600;" href="{contextUrl}" target="_blank" rel="noopener">{contextTitle}</a></span>）</p>`,

    tgBanner: '<a href="https://t.me/blocktemponews/"><img class="alignnone wp-image-194701 size-full" src="https://image.blocktempo.com/2022/11/動區官網tg-banner-1116.png" alt="" width="800" height="164" /></a>',
    
    relatedArticlesHeader: '<h5>📍相關報導📍</h5>',
    
    relatedArticleLinkTemplate: '<strong><a href="{url}">{title}</a></strong>',
    
    fullTemplate: `{introQuote}

{headerDisclaimer}

<hr />

<span style="font-weight: 400;">{dropcapContent}

{mainContent}

{tgBanner}
{relatedArticlesHeader}
{relatedArticles}`,

    relatedArticlesCount: { min: 2, max: 4 },
    maxExternalLinks: 3,
    excludeLinkTypes: ['telegram', 'line'],
    imageSize: { width: 750, height: 375 }, // 2:1 ratio
    maxImageSizeMB: 2
  },
  
  regular: {
    name: '一般文章',
    author: 'custom',
    authorDisplayName: null,
    requiresAdTemplate: false,
    
    headerDisclaimer: null,
    footerDisclaimer: null,
    
    dropcapStyle: '<span class="dropcap " style="background-color: #ffffff; color: #000000; border-color: #ffffff;">',
    
    introQuoteTemplate: `<p class="intro_quote">{excerpt}

（前情提要：<span style="color: #ff6600;"><a style="color: #ff6600;" href="{backgroundUrl}" target="_blank" rel="noopener">{backgroundTitle}</a></span>）

（背景補充：<span style="color: #ff6600;"><a style="color: #ff6600;" href="{contextUrl}" target="_blank" rel="noopener">{contextTitle}</a></span>）</p>`,

    tgBanner: '<a href="https://t.me/blocktemponews/"><img class="alignnone wp-image-194701 size-full" src="https://image.blocktempo.com/2022/11/動區官網tg-banner-1116.png" alt="" width="800" height="164" /></a>',
    
    relatedArticlesHeader: '<h5>📍相關報導📍</h5>',
    
    relatedArticleLinkTemplate: '<strong><a href="{url}">{title}</a></strong>',
    
    fullTemplate: `{introQuote}

{dropcapContent}

{mainContent}

{tgBanner}
{relatedArticlesHeader}
{relatedArticles}`,

    relatedArticlesCount: { min: 2, max: 4 },
    maxExternalLinks: 3,
    excludeLinkTypes: ['telegram', 'line'],
    imageSize: { width: 750, height: 375 }, // 2:1 ratio
    maxImageSizeMB: 2
  }
};
```

### 4.4 狀態管理擴展

#### 處理狀態結構
```typescript
interface EnhancedProcessingState {
  // 現有欄位
  stage: ProcessingStage;
  status: ProcessingStatus;
  
  // 新增欄位
  article_classification?: ArticleClassification;
  formatting_applied?: boolean;
  template_version?: string;
  related_articles_found?: number;
  content_analysis_completed?: boolean;
  
  // 階段結果
  copy_editing_result?: EnhancedCopyEditingResult;
  formatting_result?: ArticleFormattingResult;
}
```

## 5. 實施階段規劃

### 5.1 第一階段：基礎架構 (優先級：高)
**目標**：建立文稿分類和基礎模板系統
**任務**：
- [ ] 在upload界面增加文稿類型選擇
- [ ] 建立ArticleClassification資料結構
- [ ] 創建基礎模板設定檔
- [ ] 修改ProcessingState支援新欄位

**預估時間**：3-5天

### 5.2 第二階段：AI分析強化 (優先級：高)
**目標**：增強CopyEditorAgent的智能分析能力
**任務**：
- [ ] 實現關聯文章搜尋功能
- [ ] 加強中文用語轉換邏輯
- [ ] 實現撰稿方名稱識別
- [ ] 優化永久連結英文翻譯

**預估時間**：5-7天

### 5.3 第三階段：格式化處理器 (優先級：中)
**目標**：實現article-formatting階段
**任務**：
- [ ] 建立ArticleFormattingProcessor類
- [ ] 實現模板化押註插入
- [ ] 實現Dropcap自動應用
- [ ] 實現關聯文章區塊插入

**預估時間**：4-6天

### 5.4 第四階段：圖片處理強化 (優先級：中)
**目標**：實現AD模板和圖片優化
**任務**：
- [ ] 實現廣編稿AD模板應用
- [ ] 圖片尺寸檢查和壓縮建議
- [ ] 特色圖片模板處理
- [ ] 圖片alt文字優化

**預估時間**：3-4天

### 5.5 第五階段：UI優化與測試 (優先級：低)
**目標**：完善用戶體驗和系統穩定性
**任務**：
- [ ] 格式預覽界面開發
- [ ] 錯誤處理和降級策略
- [ ] 全流程整合測試
- [ ] 使用者體驗優化

**預估時間**：4-5天

## 6. 技術考量與風險

### 6.1 技術挑戰
1. **模板與動態內容整合**：如何平衡固定模板與靈活編輯
2. **關聯文章搜尋準確性**：需要優化搜尋算法和相關性判斷
3. **圖片處理效能**：AD模板應用和壓縮處理的效能優化
4. **向後相容性**：確保現有功能不受影響

### 6.2 風險評估
1. **AI分析準確性**：關聯文章搜尋可能不夠準確
   - 緩解：提供手動調整選項
2. **模板維護複雜性**：模板變更可能影響多個流程
   - 緩解：版本化管理和測試覆蓋
3. **使用者學習成本**：新的分類選擇可能造成困惑
   - 緩解：提供清楚的說明和預設選項

## 7. 成功指標

### 7.1 功能指標
- [ ] 廣編稿/新聞稿格式100%符合規範
- [ ] 關聯文章搜尋準確率達到80%以上
- [ ] 圖片處理成功率達到95%以上
- [ ] 中文用語轉換準確率達到90%以上

### 7.2 體驗指標
- [ ] 完整流程處理時間不增加超過20%
- [ ] 用戶手動調整步驟減少50%以上
- [ ] 發布錯誤率降低70%以上

## 8. 後續擴展可能

### 8.1 進階功能
- SEO優化建議
- 多語言支援
- 更多文稿類型支援
- 自動化測試覆蓋

### 8.2 整合機會
- WordPress外掛深度整合
- 社群媒體同步發布
- 內容分析報告
- 編輯工作流程優化

---

**文檔版本**：v1.0
**建立日期**：2024-01-XX
**最後更新**：2024-01-XX
**負責人**：開發團隊