# 廣編稿/新聞稿進階格式化功能設計方案

## 📋 需求實現進度追蹤

### 🎯 核心功能需求 Checklist

#### 1. 文稿分類與押註系統
- [x] **廣編稿押註** - 正文前方押註模板
- [x] **廣編稿免責聲明** - 正文文末押註模板  
- [x] **新聞稿押註** - 僅正文前方押註（無文末聲明）
- [x] **作者設定邏輯** - 廣編稿：「廣編頻道（BTEditor）」/ 新聞稿：「BT宙域（BTVerse）」
- [ ] **押註內容自動替換** - 動態替換撰稿方名稱
- [ ] **模板自動應用** - 根據文稿類型自動套用對應模板

#### 2. 正文格式處理
- [x] **發布時間解禁敘述過濾** - 移除 "EMBARGOED TILL" 等敘述（✅ 已歸屬AI階段處理）
- [x] **Dropcap 格式應用** - 第一段開頭第一個字自動設為 Dropcap
- [x] **英文數字空格處理** - 英文和數字前後空半格（段首除外）（✅ 已歸屬AI階段處理）
- [x] **標題層級正規化** - 段落標題優先設為「標題三」，層級：標題三 > 標題四 > 段落（粗體）✅ 已修復連鎖替換問題

#### 3. 引言與關聯文章系統
- [x] **引言自動生成** - 有副標題直接使用，無副標題用 AI 摘要（≤100字）✅ 已修復數據傳遞問題
- [x] **引言格式套用** - 使用 `intro_quote` class 格式
- [ ] **前情提要文章搜尋** - 從 BlockTempo 搜尋相關文章
- [ ] **背景補充文章搜尋** - 從 BlockTempo 搜尋相關文章
- [x] **引言區塊HTML生成** - 自動生成包含前情提要和背景補充的完整HTML（使用預設模板）
- [x] **文末相關閱讀** - 自動添加2-4篇相關文章連結（粗體格式，使用預設模板）
- [x] **TG Banner自動插入** - 在相關閱讀前插入官方TG橫幅

#### 4. 文末連結處理
- [x] **連結數量限制** - 最多3個連結（✅ 已歸屬AI階段處理）
- [x] **TG/LINE連結過濾** - 自動刪除 Telegram、LINE 社群連結（✅ 已歸屬AI階段處理）
- [x] **連結優先級排序** - 選擇排除TG/LINE後的前三個連結（✅ 已歸屬AI階段處理）
- [x] **連結格式標準化** - 確保連結格式符合要求


#### 6. WordPress 發布參數
- [ ] **作者ID設定** - 根據文稿類型自動設定對應作者

### 🏗️ 技術架構實現進度

#### 階段1：基礎架構（已完成 ✅）
- [x] 在upload界面增加文稿類型選擇
- [x] 建立ArticleClassification資料結構  
- [x] 創建基礎模板設定檔
- [x] 修改ProcessingState支援新欄位

#### 階段2：AI分析強化（已完成 ✅）
- [x] 實現關聯文章搜尋功能 (使用預設模板)
- [x] 加強中文用語轉換邏輯 (歸屬AI階段)
- [x] 實現撰稿方名稱識別 (歸屬AI階段)
- [x] 優化永久連結英文翻譯 (歸屬AI階段)

#### 階段3：格式化處理器（已完成 ✅）
- [x] 建立ArticleFormattingProcessor類
- [x] 實現模板化押註插入
- [x] 實現Dropcap自動應用
- [x] 實現關聯文章區塊插入
- [x] 實現共用模板統一管理
- [x] 完成架構清理和職責分離

#### 階段4：圖片處理強化（已歸屬AI階段 ✅）
- [x] 實現廣編稿AD模板應用 (歸屬AI階段)
- [x] 圖片尺寸檢查和壓縮建議 (歸屬AI階段)
- [x] 特色圖片模板處理 (歸屬AI階段)
- [x] 圖片alt文字優化 (歸屬AI階段)

#### 階段5：UI優化與測試（進行中 🔄）
- [x] 格式預覽界面開發
- [x] 錯誤處理和降級策略
- [x] 全流程整合測試
- [ ] 使用者體驗優化

#### 階段6：架構優化（已完成 ✅）
- [x] 實現共用模板統一管理 (CommonTemplates)
- [x] 移除重複模板定義 (DRY原則)
- [x] 清理AI階段配置項 (職責分離)
- [x] 優化模板繼承和覆蓋機制

### 完成度統計
- **總體進度**: 42% (11/26 主要任務) → **48%** (12/25 主要任務，移除1個無用任務) → **52%** (13/25 主要任務) → **56%** (14/25 主要任務) → **60%** (15/25 主要任務) → **64%** (16/25 主要任務)
- **基礎架構**: 100% ✅ 
- **核心功能**: 64% 🔄 (16/25個功能項目已完成)
- **技術集成**: 95% 🔄 (新增智能字符處理改進)
- **架構優化**: 95% ✅ (新增：職責分離和配置清理)
- **錯誤修復**: 100% ✅ (新增：Unicode編碼、Dropcap定位、模板重複定義、AI摘要數據傳遞、競態條件、Dropcap智能字符處理等問題)

---

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
- ~~不要將發布時間解禁敘述抓取進正文（如：EMBARGOED TILL 9 MAY 2025, 11:00 AM GMT+8）~~（已在前面AI流程實現）
- 第一段開頭第一個字使用Dropcap格式：
  ```html
  <span class="dropcap " style="background-color: #ffffff; color: #000000; border-color: #ffffff;">[字]</span>
  ```
- ~~英文和數字前後要空半格（段首除外）~~（已在前面AI流程實現）
- 段落標題優先設為「標題三」
- 內文標題層級：標題三 > 標題四 > 段落/Text（粗體）
- ~~中國用語轉台灣用語：~~（已在前面AI流程實現）
  - ~~網絡 → 網路~~
  - ~~信息 → 資訊/訊息（依上下文判斷）~~

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

**永久連結處理**：（已在前面AI流程實現）
- ~~將文章標題翻譯為英文~~
- ~~全部小寫，單字間用 `-` 連接~~
- ~~範例：`t-rex-raises-17m-to-reshape-web3s-attention-economy-layer`~~

## 3. 建議架構方案：參數驅動的靈活處理

### 3.1 核心設計原則
1. **參數驅動** vs **類型驅動**：處理邏輯基於具體的進階設定參數，而非文稿類型
2. **預設便利性** vs **用戶自由度**：文稿類型提供預設設定，但用戶可完全自訂
3. **模板化執行** vs **AI智能分析**：嚴格格式用模板，智能內容用AI

### 3.2 新架構流程圖
```
upload (文稿分類+進階設定) → extract → process → advanced-ai → format-conversion → 
copy-editing (AI智能分析) → article-formatting (參數驅動模板應用) → prep-publish → publish-news
```

### 3.3 各階段職責重新劃分

#### 階段1：文稿分類與進階設定 (upload強化)
**位置**：upload階段增加文稿類型選擇和進階設定
**職責**：
- 用戶選擇文稿類型：`廣編稿` / `新聞稿` / `一般文章`
- 系統提供對應的預設進階設定
- 用戶可調整任何進階設定，不受文稿類型限制
- 記錄最終確定的進階設定到處理狀態

**核心概念**：
```typescript
// ❌ 錯誤的類型驅動方式
if (articleType === 'sponsored') {
  addHeaderDisclaimer(); // 硬編碼邏輯
}

// ✅ 正確的參數驅動方式  
if (advancedSettings.headerDisclaimer === 'sponsored') {
  addHeaderDisclaimer(); // 基於用戶設定
}
```

**進階設定結構**：
```typescript
interface AdvancedArticleSettings {
  headerDisclaimer: DisclaimerType; // 'none' | 'sponsored' | 'press-release'
  footerDisclaimer: DisclaimerType; // 'none' | 'sponsored' | 'press-release'  
  authorName?: string; // 供稿方名稱，用於動態替換
}

// 使用範例：廣編稿但不押註
const customSettings: AdvancedArticleSettings = {
  headerDisclaimer: 'none',    // 用戶選擇不押註
  footerDisclaimer: 'none',    // 用戶選擇不押註
  authorName: '某某公司'       // 仍可設定供稿方
};
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

**重要**：AI階段不處理任何格式模板，只負責內容分析和準備數據

#### 階段3：參數驅動格式模板應用階段 (新增 article-formatting)
**位置**：prep-publish之前新增獨立階段
**核心邏輯**：完全基於 `AdvancedArticleSettings` 參數決定處理

```typescript
class ParameterDrivenFormattingProcessor {
  async formatArticle(
    content: string, 
    advancedSettings: AdvancedArticleSettings,
    analysisResult: EnhancedCopyEditingResult
  ) {
    let formattedContent = content;
    
    // 1. 根據 headerDisclaimer 參數決定開頭押註
    if (advancedSettings.headerDisclaimer !== 'none') {
      const disclaimerTemplate = this.getDisclaimerTemplate(
        advancedSettings.headerDisclaimer,
        'header'
      );
      if (disclaimerTemplate && advancedSettings.authorName) {
        const disclaimer = disclaimerTemplate.replace(
          '［撰稿方名稱］', 
          advancedSettings.authorName
        );
        formattedContent = this.insertHeaderDisclaimer(formattedContent, disclaimer);
      }
    }
    
    // 2. 根據 footerDisclaimer 參數決定結尾押註
    if (advancedSettings.footerDisclaimer !== 'none') {
      const disclaimerTemplate = this.getDisclaimerTemplate(
        advancedSettings.footerDisclaimer,
        'footer'
      );
      if (disclaimerTemplate) {
        formattedContent = this.insertFooterDisclaimer(formattedContent, disclaimerTemplate);
      }
    }
    
    // 3. 其他格式處理（Dropcap、關聯文章等）
    formattedContent = this.applyOtherFormatting(formattedContent, analysisResult);
    
    return {
      formattedContent,
      appliedSettings: advancedSettings,
      metadata: {
        hasHeaderDisclaimer: advancedSettings.headerDisclaimer !== 'none',
        hasFooterDisclaimer: advancedSettings.footerDisclaimer !== 'none',
        authorName: advancedSettings.authorName,
        processingTime: Date.now()
      }
    };
  }
  
  private getDisclaimerTemplate(type: DisclaimerType, position: 'header' | 'footer'): string | null {
    const templates = {
      sponsored: {
        header: '<span style="color: #808080;"><em>本文為廣編稿，由［撰稿方名稱］ 撰文、提供，不代表動區立場，亦非投資建議、購買或出售建議。詳見文末責任警示。</em></span>',
        footer: '<div class="alert alert-warning">廣編免責聲明：本文內容為供稿者提供之廣宣稿件，供稿者與動區並無任何關係，本文亦不代表動區立場。本文無意提供任何投資、資產建議或法律意見，也不應被視為購買、出售或持有資產的要約。廣宣稿件內容所提及之任何服務、方案或工具等僅供參考，且最終實際內容或規則以供稿方之公布或說明為準，動區不對任何可能存在之風險或損失負責，提醒讀者進行任何決策或行為前務必自行謹慎查核。</div>'
      },
      'press-release': {
        header: '<span style="color: #808080;"><em>本文為新聞稿，由［撰稿方名稱］ 撰文、提供，不代表動區立場。</em></span>',
        footer: null
      }
    };
    
    return templates[type]?.[position] || null;
  }
}
```

### 3.4 參數驅動的預設配置

#### 文稿類型預設值（可被用戶覆蓋）
```typescript
export const DefaultAdvancedSettings: Record<ArticleType, AdvancedArticleSettings> = {
  regular: {
    headerDisclaimer: 'none',           // 預設不押註
    footerDisclaimer: 'none',           // 預設不押註
    authorName: undefined               // 無預設供稿方
  },
  sponsored: {
    headerDisclaimer: 'sponsored',      // 預設廣編稿押註
    footerDisclaimer: 'sponsored',      // 預設廣編稿押註
    authorName: undefined               // 等待用戶輸入
  },
  'press-release': {
    headerDisclaimer: 'press-release',  // 預設新聞稿押註
    footerDisclaimer: 'none',           // 預設不押註
    authorName: undefined               // 等待用戶輸入
  }
};

// 用戶自訂範例：廣編稿但選擇不押註
const userCustomSettings: AdvancedArticleSettings = {
  headerDisclaimer: 'none',      // 用戶改為不押註
  footerDisclaimer: 'none',      // 用戶改為不押註
  authorName: '某某科技公司'     // 用戶填入供稿方
};
```

#### 押註模板庫（支援擴展）
```typescript
export const DisclaimerTemplates = {
  sponsored: {
    name: '廣編稿押註',
    header: '<span style="color: #808080;"><em>本文為廣編稿，由［撰稿方名稱］ 撰文、提供，不代表動區立場，亦非投資建議、購買或出售建議。詳見文末責任警示。</em></span>',
    footer: '<div class="alert alert-warning">廣編免責聲明：本文內容為供稿者提供之廣宣稿件，供稿者與動區並無任何關係，本文亦不代表動區立場。本文無意提供任何投資、資產建議或法律意見，也不應被視為購買、出售或持有資產的要約。廣宣稿件內容所提及之任何服務、方案或工具等僅供參考，且最終實際內容或規則以供稿方之公布或說明為準，動區不對任何可能存在之風險或損失負責，提醒讀者進行任何決策或行為前務必自行謹慎查核。</div>',
    authorPlaceholder: '［撰稿方名稱］'
  },
  'press-release': {
    name: '新聞稿押註',
    header: '<span style="color: #808080;"><em>本文為新聞稿，由［撰稿方名稱］ 撰文、提供，不代表動區立場。</em></span>',
    footer: null,
    authorPlaceholder: '［撰稿方名稱］'
  },
  none: {
    name: '不押註',
    header: null,
    footer: null,
    authorPlaceholder: null
  }
};
```

### 3.5 靈活性展示範例

#### 範例1：標準廣編稿
```typescript
const standardSponsored: AdvancedArticleSettings = {
  headerDisclaimer: 'sponsored',    // 廣編稿開頭押註
  footerDisclaimer: 'sponsored',    // 廣編稿結尾押註
  authorName: 'ABC科技公司'         // 供稿方名稱
};
// 結果：完整的廣編稿格式，包含開頭和結尾押註
```

#### 範例2：簡化廣編稿（不要結尾押註）
```typescript
const simplifiedSponsored: AdvancedArticleSettings = {
  headerDisclaimer: 'sponsored',    // 保留開頭押註
  footerDisclaimer: 'none',         // 不要結尾押註
  authorName: 'ABC科技公司'         // 供稿方名稱
};
// 結果：只有開頭押註的簡化廣編稿
```

#### 範例3：無押註廣編稿（純內容）
```typescript
const noBrandingSponsored: AdvancedArticleSettings = {
  headerDisclaimer: 'none',         // 不要開頭押註
  footerDisclaimer: 'none',         // 不要結尾押註
  authorName: 'ABC科技公司'         // 僅記錄供稿方
};
// 結果：純粹的文章內容，無任何押註
```

#### 範例4：混合押註（廣編稿用新聞稿押註）
```typescript
const hybridSponsored: AdvancedArticleSettings = {
  headerDisclaimer: 'press-release', // 使用新聞稿押註
  footerDisclaimer: 'none',          // 不要結尾押註
  authorName: 'ABC科技公司'          // 供稿方名稱
};
// 結果：使用新聞稿押註格式的廣編稿
```

## 4. 具體實施建議

### 4.1 前端UI改進

#### 進階文稿設定選擇器 (upload階段)
```typescript
const AdvancedArticleSelector = () => (
  <div className="article-settings mb-4">
    <div className="flex items-center space-x-4 flex-wrap gap-y-3">
      {/* 文稿類型選擇 - 提供預設值 */}
      <div className="flex items-center space-x-2">
        <label className="block text-sm font-medium mb-2">文稿類型：</label>
        <select 
          value={selectedType}
          onChange={handleTypeChange} // 觸發預設值載入
          className="w-full p-2 border rounded"
        >
          <option value="regular">一般文章</option>
          <option value="sponsored">廣編稿</option>
          <option value="press-release">新聞稿</option>
        </select>
      </div>

      {/* 開頭押註選擇 - 可自由調整 */}
      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium">正文開頭押註：</label>
        <select 
          value={advancedSettings.headerDisclaimer}
          onChange={handleHeaderDisclaimerChange}
          className="rounded-md border px-3 py-1.5 text-sm"
        >
          <option value="none">不押註</option>
          <option value="sponsored">廣編稿押註</option>
          <option value="press-release">新聞稿押註</option>
        </select>
      </div>

      {/* 結尾押註選擇 - 可自由調整 */}
      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium">正文末尾押註：</label>
        <select 
          value={advancedSettings.footerDisclaimer}
          onChange={handleFooterDisclaimerChange}
          className="rounded-md border px-3 py-1.5 text-sm"
        >
          <option value="none">不押註</option>
          <option value="sponsored">廣編稿押註</option>
          <option value="press-release">新聞稿押註</option>
        </select>
      </div>
    </div>

    {/* 供稿方輸入 - 獨立一行 */}
    <div className="flex items-center space-x-2 mt-3">
      <label className="text-sm font-medium">供稿方：</label>
      <input
        type="text"
        value={advancedSettings.authorName || ''}
        onChange={handleAuthorNameChange}
        placeholder="輸入供稿方名稱（選填）"
        className="rounded-md border px-3 py-1.5 text-sm min-w-[200px]"
      />
      <span className="text-xs text-gray-500">
        用於自動替換押註中的［撰稿方名稱］
      </span>
    </div>

    {/* 實時預覽當前設定 */}
    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
      <p className="text-sm text-gray-600">
        <strong>當前設定預覽：</strong>
        {advancedSettings.headerDisclaimer !== 'none' && (
          <span className="text-blue-600"> 開頭押註：{getDisclaimerName(advancedSettings.headerDisclaimer)}</span>
        )}
        {advancedSettings.footerDisclaimer !== 'none' && (
          <span className="text-blue-600"> 結尾押註：{getDisclaimerName(advancedSettings.footerDisclaimer)}</span>
        )}
        {advancedSettings.headerDisclaimer === 'none' && advancedSettings.footerDisclaimer === 'none' && (
          <span className="text-gray-500"> 無押註，純內容格式</span>
        )}
        {advancedSettings.authorName && (
          <span className="text-green-600"> 供稿方：{advancedSettings.authorName}</span>
        )}
      </p>
    </div>
  </div>
);
```

### 4.2 後端處理邏輯重構

#### 參數驅動的文章格式化處理器
```typescript
class ParameterDrivenArticleFormatter {
  /**
   * 核心格式化邏輯 - 完全基於參數決定
   */
  async formatArticle(
    content: string,
    advancedSettings: AdvancedArticleSettings,
    analysisResult: EnhancedCopyEditingResult
  ): Promise<ArticleFormattingResult> {
    
    let formattedContent = content;
    const appliedRules: string[] = [];
    
    // 1. 處理開頭押註 - 基於 headerDisclaimer 參數
    if (advancedSettings.headerDisclaimer !== 'none') {
      const headerResult = await this.applyHeaderDisclaimer(
        formattedContent, 
        advancedSettings.headerDisclaimer,
        advancedSettings.authorName
      );
      formattedContent = headerResult.content;
      appliedRules.push(headerResult.rule);
    }
    
    // 2. 處理結尾押註 - 基於 footerDisclaimer 參數
    if (advancedSettings.footerDisclaimer !== 'none') {
      const footerResult = await this.applyFooterDisclaimer(
        formattedContent,
        advancedSettings.footerDisclaimer
      );
      formattedContent = footerResult.content;
      appliedRules.push(footerResult.rule);
    }
    
    // 3. 應用其他格式處理（Dropcap、關聯文章等）
    formattedContent = await this.applyOtherFormatting(
      formattedContent, 
      analysisResult
    );
    
    return {
      formattedContent,
      appliedSettings: advancedSettings,
      metadata: {
        hasHeaderDisclaimer: advancedSettings.headerDisclaimer !== 'none',
        hasFooterDisclaimer: advancedSettings.footerDisclaimer !== 'none',
        authorName: advancedSettings.authorName,
        appliedRules,
        processingTime: Date.now()
      }
    };
  }
  
  /**
   * 應用開頭押註 - 參數驅動
   */
  private async applyHeaderDisclaimer(
    content: string, 
    disclaimerType: DisclaimerType,
    authorName?: string
  ): Promise<{content: string, rule: string}> {
    
    const template = DisclaimerTemplates[disclaimerType]?.header;
    if (!template) {
      return { content, rule: `跳過開頭押註：未找到 ${disclaimerType} 模板` };
    }
    
    let disclaimer = template;
    if (authorName && template.includes('［撰稿方名稱］')) {
      disclaimer = template.replace(/［撰稿方名稱］/g, authorName);
    }
    
    // 插入邏輯：在引言區塊後、第一個分隔線前
    const insertedContent = this.insertHeaderDisclaimer(content, disclaimer);
    
    return {
      content: insertedContent,
      rule: `應用開頭押註：${disclaimerType}${authorName ? ` (供稿方: ${authorName})` : ''}`
    };
  }
  
  /**
   * 應用結尾押註 - 參數驅動
   */
  private async applyFooterDisclaimer(
    content: string,
    disclaimerType: DisclaimerType
  ): Promise<{content: string, rule: string}> {
    
    const template = DisclaimerTemplates[disclaimerType]?.footer;
    if (!template) {
      return { content, rule: `跳過結尾押註：${disclaimerType} 類型無結尾模板` };
    }
    
    // 插入邏輯：在 TG Banner 前插入
    const insertedContent = this.insertFooterDisclaimer(content, template);
    
    return {
      content: insertedContent,
      rule: `應用結尾押註：${disclaimerType}`
    };
  }
  
  /**
   * 驗證參數合法性
   */
  validateSettings(settings: AdvancedArticleSettings): string[] {
    const warnings: string[] = [];
    
    // 檢查押註參數合法性
    if (!['none', 'sponsored', 'press-release'].includes(settings.headerDisclaimer)) {
      warnings.push(`無效的開頭押註類型：${settings.headerDisclaimer}`);
    }
    
    if (!['none', 'sponsored', 'press-release'].includes(settings.footerDisclaimer)) {
      warnings.push(`無效的結尾押註類型：${settings.footerDisclaimer}`);
    }
    
    // 檢查邏輯合理性
    if (settings.headerDisclaimer !== 'none' && !settings.authorName) {
      warnings.push('設定押註時建議填寫供稿方名稱，否則將顯示佔位符');
    }
    
    if (settings.headerDisclaimer === 'sponsored' && settings.footerDisclaimer === 'none') {
      warnings.push('廣編稿通常建議包含結尾免責聲明以符合法規要求');
    }
    
    return warnings;
  }
}
```

#### Enhanced CopyEditorAgent - 專注內容分析
```typescript
class EnhancedCopyEditorAgent {
  /**
   * 核心分析功能 - 不處理格式模板
   */
  async analyzeContent(
    content: string, 
    articleClassification: ArticleClassification
  ): Promise<EnhancedCopyEditingResult> {
    
    // 1. 基礎WordPress參數提取
    const basicParams = await this.extractBasicParams(content);
    
    // 2. 智能內容分析
    const contentAnalysis = await this.analyzeContentIntelligently(content);
    
    // 3. 關聯文章搜尋
    const relatedArticles = await this.searchRelatedArticles(content);
    
    // 4. 撰稿方資訊識別
    const authorInfo = await this.identifyAuthorInfo(content);
    
    // 注意：不處理任何格式模板，只分析和提取資訊
    return {
      wordpress_params: basicParams,
      article_classification: articleClassification,
      content_analysis: contentAnalysis,
      related_articles: relatedArticles,
      author_info: authorInfo
    };
  }
  
  /**
   * 智能內容分析 - AI擅長的任務
   */
  private async analyzeContentIntelligently(content: string): Promise<ContentAnalysis> {
    return {
      // 中文用語自動轉換
      chinese_terminology_fixes: await this.fixChineseTerminology(content),
      
      // 智能slug生成
      suggested_slug: await this.generateEnglishSlug(content),
      
      // 摘要生成
      excerpt: await this.generateExcerpt(content),
      
      // 閱讀時間估算
      estimated_reading_time: this.calculateReadingTime(content),
      
      // 撰稿方名稱識別
      author_name: await this.extractAuthorName(content)
    };
  }
  
  /**
   * 關聯文章搜尋 - AI擅長的任務
   */
  private async searchRelatedArticles(content: string): Promise<RelatedArticles> {
    // 使用AI分析內容主題，搜尋BlockTempo相關文章
    const keywords = await this.extractKeywords(content);
    
    return {
      background: await this.searchBlockTempoArticles(keywords, 'background'),
      previous_context: await this.searchBlockTempoArticles(keywords, 'context'),
      related_reading: await this.searchBlockTempoArticles(keywords, 'reading')
    };
  }
}
```

### 4.3 設定檔管理重構

#### 參數驅動的模板配置
```typescript
// src/config/parameter-driven-templates.ts

/**
 * 押註模板庫 - 支援參數化和擴展
 */
export const DisclaimerTemplates: Record<DisclaimerType, DisclaimerTemplate> = {
  none: {
    name: '不押註',
    description: '純內容，不添加任何押註',
    header: null,
    footer: null,
    authorPlaceholder: null,
    useCases: ['一般文章', '內部文章', '純技術內容']
  },
  
  sponsored: {
    name: '廣編稿押註',
    description: '完整的廣編稿免責聲明',
    header: '<span style="color: #808080;"><em>本文為廣編稿，由［撰稿方名稱］ 撰文、提供，不代表動區立場，亦非投資建議、購買或出售建議。詳見文末責任警示。</em></span>',
    footer: '<div class="alert alert-warning">廣編免責聲明：本文內容為供稿者提供之廣宣稿件，供稿者與動區並無任何關係，本文亦不代表動區立場。本文無意提供任何投資、資產建議或法律意見，也不應被視為購買、出售或持有資產的要約。廣宣稿件內容所提及之任何服務、方案或工具等僅供參考，且最終實際內容或規則以供稿方之公布或說明為準，動區不對任何可能存在之風險或損失負責，提醒讀者進行任何決策或行為前務必自行謹慎查核。</div>',
    authorPlaceholder: '［撰稿方名稱］',
    useCases: ['贊助內容', '合作文章', '商業推廣']
  },
  
  'press-release': {
    name: '新聞稿押註',
    description: '簡化的新聞稿聲明',
    header: '<span style="color: #808080;"><em>本文為新聞稿，由［撰稿方名稱］ 撰文、提供，不代表動區立場。</em></span>',
    footer: null,
    authorPlaceholder: '［撰稿方名稱］',
    useCases: ['企業新聞稿', '產品發佈', '官方聲明']
  }
};

/**
 * 文稿類型預設配置 - 僅作為便利性預設值
 */
export const ArticleTypeDefaults: Record<ArticleType, AdvancedArticleSettings> = {
  regular: {
    headerDisclaimer: 'none',
    footerDisclaimer: 'none',
    authorName: undefined
  },
  sponsored: {
    headerDisclaimer: 'sponsored',
    footerDisclaimer: 'sponsored', 
    authorName: undefined
  },
  'press-release': {
    headerDisclaimer: 'press-release',
    footerDisclaimer: 'none',
    authorName: undefined
  }
};

/**
 * 參數組合驗證規則
 */
export const SettingsValidationRules = {
  // 推薦的參數組合
  recommendedCombinations: [
    {
      name: '標準廣編稿',
      settings: { headerDisclaimer: 'sponsored', footerDisclaimer: 'sponsored' },
      description: '完整的廣編稿格式，包含開頭和結尾押註'
    },
    {
      name: '簡化廣編稿', 
      settings: { headerDisclaimer: 'sponsored', footerDisclaimer: 'none' },
      description: '僅開頭押註的廣編稿，適合簡短內容'
    },
    {
      name: '標準新聞稿',
      settings: { headerDisclaimer: 'press-release', footerDisclaimer: 'none' },
      description: '標準新聞稿格式，僅開頭押註'
    },
    {
      name: '純內容',
      settings: { headerDisclaimer: 'none', footerDisclaimer: 'none' },
      description: '無押註的純內容格式'
    }
  ],
  
  // 警告規則
  warningRules: [
    {
      condition: (s: AdvancedArticleSettings) => s.headerDisclaimer === 'sponsored' && s.footerDisclaimer === 'none',
      warning: '廣編稿通常建議包含結尾免責聲明以符合法規要求'
    },
    {
      condition: (s: AdvancedArticleSettings) => (s.headerDisclaimer !== 'none' || s.footerDisclaimer !== 'none') && !s.authorName,
      warning: '設定押註時建議填寫供稿方名稱，否則將顯示佔位符'
    }
  ]
};
```

### 4.4 API設計更新

#### 處理流程API
```typescript
// API: /api/process-article (參數驅動版本)
interface ProcessArticleRequest {
  content: string;
  advancedSettings: AdvancedArticleSettings; // 核心：基於參數而非類型
  articleType?: ArticleType; // 可選：僅用於記錄和統計
  mode: 'auto' | 'manual';
}

interface ProcessArticleResponse {
  success: boolean;
  data: {
    formattedContent: string;
    appliedSettings: AdvancedArticleSettings;
    appliedRules: string[];
    wordpress_params: WordPressPublishData;
    warnings: string[];
  };
  metadata: {
    processingTime: number;
    hasHeaderDisclaimer: boolean;
    hasFooterDisclaimer: boolean;
    authorName?: string;
  };
}
```

### 4.5 用戶體驗優化

#### 設定預覽和驗證
```typescript
const SettingsPreview = ({ settings }: { settings: AdvancedArticleSettings }) => {
  const warnings = validateSettings(settings);
  const preview = generateSettingsPreview(settings);
  
  return (
    <div className="settings-preview">
      <h4>設定預覽</h4>
      <div className="preview-content">
        {preview.headerDisclaimer && (
          <div className="preview-header">
            <strong>開頭押註：</strong>
            <div dangerouslySetInnerHTML={{ __html: preview.headerDisclaimer }} />
          </div>
        )}
        
        {preview.footerDisclaimer && (
          <div className="preview-footer">
            <strong>結尾押註：</strong>
            <div dangerouslySetInnerHTML={{ __html: preview.footerDisclaimer }} />
          </div>
        )}
        
        {!preview.headerDisclaimer && !preview.footerDisclaimer && (
          <div className="preview-none">
            <em>純內容格式，無押註</em>
          </div>
        )}
      </div>
      
      {warnings.length > 0 && (
        <div className="warnings">
          <h5>建議：</h5>
          <ul>
            {warnings.map((warning, index) => (
              <li key={index} className="warning-item">{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
```

## 8. ArticleFormattingProcessor 功能範圍限制與修正記錄

### 8.1 問題背景
在初始實現中，ArticleFormattingProcessor 錯誤地重複實現了多個應該在前面 AI Agent 階段完成的功能，導致處理流程混亂和功能重複。

### 8.2 已刪除的錯誤功能
以下功能已從 ArticleFormattingProcessor 中完全移除，因為它們應該在前面的 AI Agent 階段處理：

1. **移除發布解禁敘述** (`removeEmbargoStatements`)
   - 原因：應該在前面的 AI Agent 階段完成
   - 刪除方法：完全移除相關代碼和邏輯

2. **中文用語轉換** (`applyChineseTerminologyConversion`)
   - 原因：應該在前面的 AI Agent 階段完成
   - 刪除方法：完全移除 terminologyMap 和轉換邏輯

3. **英文和數字前後空格處理** (`addSpacesAroundEnglishAndNumbers`)
   - 原因：應該在前面的 AI Agent 階段完成
   - 刪除方法：完全移除空格添加邏輯

4. **生成英文永久連結** (`generateEnglishSlug` 和 `translateToEnglish`)
   - 原因：應該在前面的 AI Agent 階段完成
   - 刪除方法：完全移除相關靜態方法

### 8.3 修正的功能
**標題層級正規化** (`normalizeHeadings`)
- **修正前**：將 h1, h2 轉為 h3；將 h5, h6 轉為 h4
- **修正後**：保持 h1 不變，只進行 h2→h3, h3→h4, h4→h5 的轉換
- **修正原因**：避免影響文章主標題結構

### 8.4 ArticleFormattingProcessor 當前職責範圍
經過修正後，ArticleFormattingProcessor 現在只負責以下核心功能：

1. **參數驅動的模板應用** - 基於用戶設定的 AdvancedArticleSettings 進行格式化
2. **押註模板插入** - 根據 headerDisclaimer 和 footerDisclaimer 參數插入對應模板
3. **Dropcap 格式應用** - 為文章首段第一個字符應用 Dropcap 樣式
4. **標題層級正規化** - 僅調整 h2-h4 標題層級，不動 h1
5. **引言區塊處理** - 應用 intro_quote 樣式和關聯文章連結
6. **相關閱讀區塊插入** - 添加 TG Banner 和相關文章連結

## 9. 技術實現問題修復記錄

### 9.1 文稿分類初始化問題
**問題描述**：組件初始化時設置了預設文稿分類值，但沒有調用 `setArticleClassification`，導致 ProcessingContext 中的文稿分類為 undefined。

**錯誤訊息**：`缺少文稿分類或進階設定，無法進行格式化處理`

**解決方案**：在 IntegratedFileProcessor 中添加 useEffect 來初始化文稿分類：
```typescript
// 初始化文稿分類設定
useEffect(() => {
  const template = getArticleTemplate(selectedArticleType);
  const classification: ArticleClassification = {
    articleType: selectedArticleType,
    author: template.author as 'BTEditor' | 'BTVerse' | 'custom',
    authorDisplayName: template.authorDisplayName || undefined,
    authorId: template.authorId,
    requiresAdTemplate: selectedArticleType === 'sponsored',
    templateVersion: 'v1.0',
    timestamp: Date.now(),
    advancedSettings
  };
  
  setArticleClassification(classification);
}, []); // 只在組件初始化時執行一次
```

### 9.2 UI 階段顯示不完整問題
**問題描述**：雖然 ProcessingContext 中定義了 `article-formatting` 階段，但 UI 上沒有顯示該階段。

**根本原因**：IntegratedFileProcessor 中的 stageGroups 定義與 ProcessingContext 不一致：
- ProcessingContext：`['advanced-ai', 'format-conversion', 'copy-editing', 'article-formatting']`
- IntegratedFileProcessor：`['advanced-ai', 'format-conversion', 'copy-editing']` ❌

**解決方案**：
1. 修正 IntegratedFileProcessor 中的 stageGroups 定義，確保包含 `article-formatting`
2. 在 `getStageTitle` 函數中添加缺失的階段標題映射
3. 在 `formatStageResult` 函數中添加對 `article-formatting` 階段的支持
4. 在 `getStageViewerUrl` 函數中添加對 `article-formatting` 階段的查看支持

### 9.3 防止再次出錯的檢查清單
在修改處理流程時，請確保以下一致性：

1. **階段定義一致性**：
   - ProcessingContext.tsx 中的 `defaultStages`
   - ProcessingContext.tsx 中的 `stageGroups`
   - IntegratedFileProcessor.tsx 中的 ProgressDisplay `stageGroups`
   - 各階段處理器的 Hook 中的階段 ID

2. **階段標題映射完整性**：
   - IntegratedFileProcessor.tsx 中的 `getStageTitle` 函數
   - 確保所有階段都有對應的中文顯示名稱

3. **階段結果處理完整性**：
   - `formatStageResult` 函數支援所有階段的結果格式
   - `getStageViewerUrl` 函數支援所有可查看階段的 URL 生成

4. **文稿分類初始化**：
   - 確保組件初始化時正確調用 `setArticleClassification`
   - 確保 `getArticleClassification` 能返回有效的分類數據

### 9.4 修復確認
✅ 文稿分類初始化問題已修復
✅ UI 階段顯示問題已修復  
✅ 階段標題映射問題已修復
✅ 階段結果查看功能已完善
✅ 標題層級正規化連鎖替換問題已修復
✅ 開頭押註位置錯誤已修復
✅ Article Formatting 六大核心功能已完成
✅ 設計文檔已更新記錄修復內容

### 9.5 標題層級正規化連鎖替換問題修復
**問題描述**：用戶反映進階格式化轉換後，h2或h3標題變成h5或丟失標題格式。

**根本原因分析**：
`normalizeHeadings` 方法存在連鎖替換問題，原始邏輯按以下順序進行：
```typescript
// ❌ 錯誤的替換順序（從低到高）
normalized = normalized.replace(/<h2([^>]*)>/gi, '<h3$1>');  // h2 → h3
normalized = normalized.replace(/<h3([^>]*)>/gi, '<h4$1>');  // h3 → h4 (包括剛轉換的h3)
normalized = normalized.replace(/<h4([^>]*)>/gi, '<h5$1>');  // h4 → h5 (包括剛轉換的h4)
```

**連鎖替換影響**：
- h2 → h3（第一步）
- 剛轉換的 h3 → h4（第二步）
- 剛轉換的 h4 → h5（第三步）
- **結果**：h2 最終變成 h5（下降3級），h3 變成 h5（下降2級）

**解決方案**：
改為從高層級往低層級進行替換，避免影響已處理的標籤：
```typescript
// ✅ 正確的替換順序（從高到低）
// 先處理 h4 → h5
normalized = normalized.replace(/<h4([^>]*)>/gi, '<h5$1>');
normalized = normalized.replace(/<\/h4>/gi, '</h5>');

// 再處理 h3 → h4  
normalized = normalized.replace(/<h3([^>]*)>/gi, '<h4$1>');
normalized = normalized.replace(/<\/h3>/gi, '</h4>');

// 最後處理 h2 → h3
normalized = normalized.replace(/<h2([^>]*)>/gi, '<h3$1>');
normalized = normalized.replace(/<\/h2>/gi, '</h3>');
```

**修復結果**：
- h2 → h3（只下降1級）✅
- h3 → h4（只下降1級）✅ 
- h4 → h5（只下降1級）✅
- h1 保持不變 ✅

**學習到的教訓**：
1. **字符串替換順序很重要**：在進行多步驟字符串替換時，必須考慮替換的順序，避免前面的替換影響後面的邏輯
2. **正則表達式要全面測試**：特別是涉及HTML標籤處理的正則表達式，需要測試各種標籤組合和嵌套情況
3. **要有明確的處理目標**：標題正規化的目標是讓每個標題只下降1級，而不是連續處理
4. **代碼註釋要明確警示**：對於容易出錯的邏輯，要添加詳細註釋說明正確的處理順序

**防錯檢查清單**：
□ 多步驟字符串替換必須從高層級往低層級進行
□ 每個替換步驟只影響目標層級，不影響已處理的層級  
□ 添加詳細註釋說明替換順序的重要性
□ 測試邊界情況（如連續的同級標題）

### 9.6 開頭押註位置錯誤修復
**問題描述**：用戶反映正文開頭押註並沒有出現在正文開頭的正確位置，而是出現在正文尾端、末尾押註之前。

**根本原因分析**：
在 `applyHeaderDisclaimer` 方法中，開頭押註被錯誤地加到內容的末尾：
```typescript
// ❌ 錯誤的插入邏輯
const disclaimerWithSeparator = `${disclaimer}\n\n<hr />`;
const insertedContent = content + '\n\n' + disclaimerWithSeparator;  // 加到末尾
```

**錯誤的處理順序**：
1. 引言區塊
2. 正文內容  
3. 開頭押註（❌ 錯誤地放在這裡）
4. 結尾押註

**正確的處理順序應該是**：
1. 引言區塊
2. 開頭押註（✅ 應該在這裡）
3. 正文內容
4. 結尾押註

**解決方案**：
修改插入邏輯，智能尋找引言區塊的結束位置，並在其後正確插入開頭押註：
```typescript
// ✅ 正確的插入邏輯
const disclaimerBlock = disclaimer;  // 移除分隔線

// 尋找引言區塊的結束位置
const introQuoteMatch = content.match(/(<p class="intro_quote">[\s\S]*?<\/p>)/);

if (introQuoteMatch) {
  // 如果找到引言區塊，在其後插入押註（用兩個br分隔）
  const introQuote = introQuoteMatch[1];
  const restContent = content.substring(content.indexOf(introQuote) + introQuote.length);
  const insertedContent = introQuote + '<br><br>' + disclaimerBlock + '<br><br>' + restContent.trim();
} else {
  // 如果沒有引言區塊，直接在內容開頭插入押註
  const insertedContent = disclaimerBlock + '<br><br>' + content;
}
```

**進一步修復分隔線位置**：
用戶反映分隔線位置不正確，需要進一步調整：
```typescript
// ✅ 修復末尾押註，分隔線在押註前
const footerWithSeparator = `\n\n<hr />\n\n${template}`;
```

**修復結果**：
- 引言區塊在最前面 ✅
- 用兩個 `<br>` 分隔引言和開頭押註 ✅
- 開頭押註緊跟在引言區塊後 ✅
- 用兩個 `<br>` 分隔開頭押註和正文內容 ✅
- 正文內容在押註之後 ✅
- `<hr />` 分隔線在末尾押註前 ✅
- 結尾押註在文章末尾 ✅

**學習到的教訓**：
1. **內容插入要考慮上下文**：插入內容時要分析現有結構，找到正確的插入位置
2. **字符串操作要精確**：簡單的字符串拼接往往不足以處理複雜的HTML結構
3. **正則表達式要處理換行**：處理HTML內容時，要考慮跨行的情況（使用 `[\s\S]*?` 而非 `.*?`）
4. **要有降級策略**：當找不到預期結構時，要有備選的處理方案
5. **HTML格式要精確**：`<br>` 標籤和 `\n\n` 在顯示效果上有差異，需要根據需求選擇
6. **分隔線位置要邏輯正確**：開頭押註後不需要分隔線，末尾押註前才需要分隔線

**防錯檢查清單**：
□ 插入內容前先分析目標位置的上下文結構
□ 使用正則表達式精確定位插入點
□ 考慮換行和多行內容的處理
□ 提供找不到預期結構時的降級策略
□ 測試有無引言區塊的兩種情況
□ 確認HTML標籤和換行符的正確使用
□ 驗證分隔線出現在邏輯正確的位置

### 9.7 模板重複定義問題重構
**問題描述**：用戶發現 `article-templates.ts` 和 `ArticleFormattingProcessor.ts` 兩個文件中都有重複的模板定義，造成維護困難和不一致的風險。

**根本原因分析**：
系統中存在多處模板定義的重複：

1. **押註模板重複**：
   - `article-templates.ts` 中的 `headerDisclaimer` 和 `footerDisclaimer`
   - `ArticleFormattingProcessor.ts` 中的 `getDisclaimerTemplates()`

2. **引言區塊重複**：
   - `article-templates.ts` 中的 `introQuoteTemplate`
   - `ArticleFormattingProcessor.ts` 中的 `buildIntroQuote()`

3. **TG Banner 和相關閱讀重複**：
   - `article-templates.ts` 中的 `tgBanner` 和 `relatedArticlesHeader`
   - `ArticleFormattingProcessor.ts` 中的硬編碼HTML

4. **Dropcap 樣式重複**：
   - `article-templates.ts` 中的 `dropcapStyle`
   - `ArticleFormattingProcessor.ts` 中的硬編碼樣式

**造成的問題**：
- ❌ **代碼重複**：違反 DRY（Don't Repeat Yourself）原則
- ❌ **維護困難**：修改時需要在兩個地方同步
- ❌ **不一致風險**：用戶修改了一處但另一處未同步
- ❌ **混淆性**：開發者不知道該修改哪個文件

**解決方案**：
進行架構重構，將 `ArticleFormattingProcessor.ts` 修改為使用統一的模板配置：

```typescript
// ✅ 重構前：重複定義
private getDisclaimerTemplates() {
  return {
    sponsored: {
      header: '<span>...</span>', // 硬編碼
      footer: '<div>...</div>'    // 硬編碼
    }
  };
}

// ✅ 重構後：使用統一配置
import { ArticleTemplates } from '@/config/article-templates';

private getDisclaimerTemplates() {
  return {
    sponsored: {
      header: ArticleTemplates.sponsored.headerDisclaimer,
      footer: ArticleTemplates.sponsored.footerDisclaimer
    },
    'press-release': {
      header: ArticleTemplates['press-release'].headerDisclaimer,
      footer: ArticleTemplates['press-release'].footerDisclaimer
    }
  };
}
```

**重構範圍**：
1. **押註模板** - 使用 `ArticleTemplates.*.headerDisclaimer` 和 `footerDisclaimer`
2. **引言區塊** - 使用 `ArticleTemplates.*.introQuoteTemplate` 並進行參數替換
3. **TG Banner** - 使用 `ArticleTemplates.*.tgBanner`
4. **相關閱讀** - 使用 `ArticleTemplates.*.relatedArticlesHeader` 和 `relatedArticleLinkTemplate`
5. **Dropcap 樣式** - 使用 `ArticleTemplates.*.dropcapStyle`

**重構結果**：
- 單一真實來源（Single Source of Truth）✅
- 移除所有重複定義 ✅
- 統一在 `article-templates.ts` 管理模板 ✅
- 同步用戶的自訂修改（加括號）✅
- 保持功能完整性 ✅
- 統一預設值配置管理 ✅

**進一步改進 - 預設值統一管理**：
用戶發現前情文章和背景文章的預設值都是硬編碼的，建議統一到配置文件中：

```typescript
// ✅ 改進前：硬編碼預設值
return template
  .replace('{excerpt}', defaultExcerpt)
  .replace('{backgroundUrl}', 'https://www.blocktempo.com/sample-background-article/') // 硬編碼
  .replace('{backgroundTitle}', '範例背景文章標題') // 硬編碼
  .replace('{contextUrl}', 'https://www.blocktempo.com/sample-context-article/') // 硬編碼
  .replace('{contextTitle}', '範例前情文章標題'); // 硬編碼

// ✅ 改進後：使用統一配置
const defaults = ArticleTemplates.sponsored.defaultRelatedArticles;
return template
  .replace('{excerpt}', defaultExcerpt)
  .replace('{contextUrl}', defaults.contextUrl)
  .replace('{contextTitle}', defaults.contextTitle)
  .replace('{backgroundUrl}', defaults.backgroundUrl)
  .replace('{backgroundTitle}', defaults.backgroundTitle);
```

**新增配置結構**：
```typescript
// ArticleTemplate 介面新增
defaultRelatedArticles?: {
  contextUrl: string;          // 前情提要連結
  contextTitle: string;        // 前情提要標題
  backgroundUrl: string;       // 背景補充連結
  backgroundTitle: string;     // 背景補充標題
};

defaultRelatedReading?: Array<{
  url: string;                 // 相關閱讀連結
  title: string;               // 相關閱讀標題
}>;
```

**學習到的教訓**：
1. **DRY 原則很重要**：Don't Repeat Yourself，避免在多個地方定義相同的內容
2. **統一配置管理**：應該有單一的配置文件作為真實來源
3. **重構要謹慎**：確保功能不遺失，並同步所有自訂修改
4. **架構設計要前瞻**：初期設計時就應該考慮配置的統一管理
5. **代碼審查的重要性**：定期審查是否有重複定義的問題
6. **預設值也需要統一管理**：不只是模板，連預設值也應該在配置文件中管理

**防錯檢查清單**：
□ 新增模板時檢查是否已有相同定義
□ 修改模板時確認只有一個來源
□ 定期審查代碼中的重複定義
□ 使用統一的配置文件管理模板
□ 重構時保持功能完整性
□ 同步所有自訂修改到統一配置中
□ 預設值應該在配置文件中定義，而非硬編碼
□ 修改預設值時只需要在一個地方修改

## 10. Article Formatting 階段當前功能總結

### 10.1 已實現的核心功能

基於參數驅動的設計，`ArticleFormattingProcessor` 目前提供以下6個主要轉換功能：

#### 1. 標題層級正規化 ✅
- **功能**：調整HTML標題層級，從 h2→h3, h3→h4, h4→h5
- **特點**：保持 h1 主標題不變，確保標題層級結構合理
- **技術要點**：採用從高層級往低層級的替換順序，避免連鎖替換問題

#### 2. 引言區塊構建 ✅  
- **功能**：自動插入 intro_quote 樣式的引言區塊
- **內容包含**：
  - AI摘要引言（來自copy-editing階段或預設文字）
  - 前情提要連結（目前使用預設範例）
  - 背景補充連結（目前使用預設範例）
- **HTML格式**：`<p class="intro_quote">...</p>`

#### 3. 開頭押註處理 ✅
- **功能**：根據 `headerDisclaimer` 參數插入對應的開頭聲明
- **支援類型**：
  - `sponsored`: 廣編稿押註（含投資建議警示）
  - `press-release`: 新聞稿押註（簡化版本）
  - `none`: 不插入押註
- **特點**：支援動態替換撰稿方名稱

#### 4. Dropcap格式應用 ✅
- **功能**：為文章第一段的第一個字符應用 Dropcap 樣式
- **樣式**：白底黑字的放大首字母效果
- **技術**：智能識別中文字符和英文字母

#### 5. 結尾押註處理 ✅
- **功能**：根據 `footerDisclaimer` 參數插入結尾免責聲明
- **支援類型**：
  - `sponsored`: 完整的廣編稿免責聲明
  - `press-release`: 無結尾押註
  - `none`: 不插入押註
- **格式**：使用 `alert alert-warning` 樣式

#### 6. TG Banner和相關閱讀 ✅
- **功能**：在文章末尾自動添加固定元素
- **包含內容**：
  - 動區官方 Telegram 橫幅圖片
  - 相關閱讀標題（📍相關報導📍）
  - 2-3篇相關文章連結（目前使用預設範例）
- **連結格式**：紅色粗體樣式

### 10.2 參數驅動的靈活性

系統的核心優勢在於參數驅動的設計，用戶可以：

```typescript
// 範例：自訂廣編稿（只要開頭押註）
const customSettings: AdvancedArticleSettings = {
  headerDisclaimer: 'sponsored',    // 廣編稿開頭押註
  footerDisclaimer: 'none',         // 不要結尾押註
  authorName: 'ABC科技公司'         // 供稿方名稱
};

// 範例：混合模式（廣編稿用新聞稿押註）
const hybridSettings: AdvancedArticleSettings = {
  headerDisclaimer: 'press-release', // 使用新聞稿押註
  footerDisclaimer: 'none',          // 不要結尾押註
  authorName: 'XYZ公司'              // 供稿方名稱
};
```

### 10.3 待完善功能

以下功能已規劃但尚未實現，目前使用預設內容：

1. **智能關聯文章搜尋** - 目前使用預設連結，未來需整合 BlockTempo 搜尋API
2. **撰稿方名稱自動識別** - 目前需手動輸入，未來可由AI從內容中提取
3. **文章連結過濾邏輯** - 目前使用預設連結，未來需實現TG/LINE連結過濾
4. **動態內容長度適配** - 目前固定格式，未來可根據文章長度調整

### 10.4 技術架構優勢

1. **參數驅動 vs 類型驅動**：基於具體設定而非文稿類型，提供更大靈活性
2. **模板化處理**：嚴格格式使用模板，確保一致性和可維護性
3. **錯誤容忍性**：即使處理失敗也會返回原始內容，確保系統穩定性
4. **擴展性設計**：新的押註類型或格式可輕鬆添加到模板庫
5. **單一真實來源**：統一的模板配置管理，避免重複定義問題
6. **職責分離明確**：AI階段負責智能分析，格式化階段負責模板應用
7. **共用模板統一管理**：透過 `CommonTemplates` 實現DRY原則，一處修改全域生效
8. **配置架構清理**：移除不應在格式化階段處理的AI功能配置，架構更清晰
9. **Unicode編碼安全**：正確處理中文字符和特殊字符，避免編碼錯誤
10. **國際化友好**：支援多語言文件名和內容處理

### 10.5 架構清理成果

#### 移除的AI階段配置
經過架構清理，以下配置已從 Article Formatting 移除並歸屬到 AI 階段：
- **中文用語轉換** (`terminologyMap`) - 40+ 轉換規則
- **內容過濾模式** (`excludePatterns`) - EMBARGOED等敘述過濾  
- **連結過濾邏輯** (`linkFiltering`) - TG/LINE連結處理
- **圖片處理規則** (`imageProcessing`) - 壓縮、格式轉換等
- **標題層級配置** (`headingHierarchy`) - 實際未使用的配置

#### 統一的共用模板管理
透過 `CommonTemplates` 對象統一管理所有類型相同的模板：
- **11個共用模板**：dropcapStyle, introQuoteTemplate, tgBanner等
- **一處修改全域生效**：修改引言模板時三種文稿類型同步更新
- **特殊化支援**：廣編稿可覆蓋共用模板（如紅色連結樣式）
- **維護簡化**：減少60+行重複代碼

#### 清晰的職責邊界
```typescript
// ✅ 現在的清晰分工
AI Agent (copy-editing): {
  智能內容分析,
  中文用語轉換,
  連結過濾,
  圖片處理,
  撰稿方識別,
  關聯文章搜尋
}

Article Formatting: {
  參數驅動的模板應用,
  押註插入,
  Dropcap樣式,
  引言區塊構建,
  TG Banner添加,
  標題層級正規化
}
```

### 9.9 架構清理：移除應在AI階段處理的配置
**問題描述**：`article-templates.ts` 中包含了許多應該在前面AI階段處理的配置項，造成職責混淆和架構不清晰。

**移除的配置項**：
1. **`terminologyMap`** - 中文用語轉換規則（網絡→網路等）
2. **`excludePatterns`** - 內容排除模式（EMBARGOED敘述過濾等）
3. **`linkFiltering`** - 連結過濾規則（TG/LINE連結刪除等）
4. **`imageProcessing`** - 圖片處理規則（壓縮、格式轉換等）
5. **`headingHierarchy`** - 標題層級規則（實際未使用，硬編碼處理）
6. **整個 `ContentProcessingRules` 配置對象**
7. **`ContentProcessingConfig` TypeScript 接口定義**

**移除原因分析**：
```typescript
// ❌ 錯誤的職責分配
Article Formatting: {
  模板格式應用 + 中文轉換 + 連結過濾 + 圖片處理 + 內容過濾...
}

// ✅ 正確的職責分配  
AI Agent (copy-editing): {
  智能內容分析 + 中文轉換 + 連結過濾 + 圖片處理 + 內容過濾
}
Article Formatting: {
  純粹的模板應用 + 格式化
}
```

**具體移除內容**：
```typescript
// ❌ 已移除：不應在格式化階段處理
export const ContentProcessingRules = {
  terminologyMap: {
    '網絡': '網路',
    '信息': '資訊',
    // ... 40+ 轉換規則
  },
  excludePatterns: [
    /EMBARGOED[\s\S]*?GMT\+8\)/gi,
    // ... 更多過濾模式
  ],
  // ... 其他AI階段功能
};
```

**架構清理效果**：
- **代碼行數減少**：移除60+行無用配置
- **職責邊界清晰**：AI階段負責智能分析，格式化階段負責模板應用
- **配置管理簡化**：減少混淆，提高維護性
- **功能歸屬正確**：智能功能歸屬AI，格式功能歸屬格式化

### 9.10 Dropcap錯誤應用到引言區塊修復
**問題描述**：用戶對引言模板進行格式調整後，Dropcap功能錯誤地應用到了前言區塊的第一個字，而不是正文內容的第一個字。

**根本原因分析**：
在 `applyDropcap` 方法中，原始邏輯使用簡單的查找來定位第一個段落：
```typescript
// ❌ 錯誤的查找邏輯
const firstParagraphMatch = content.match(/<p[^>]*>(.*?)<\/p>/i);
```

**問題成因**：
1. 引言區塊被插入到內容的最前面（正確的邏輯）
2. `applyDropcap` 找到的第一個 `<p>` 標籤是引言區塊（`<p class="intro_quote">`）
3. Dropcap 被錯誤地應用到引言文字，而不是正文

**預期處理順序**：
1. 引言區塊（不應應用 Dropcap）
2. 開頭押註
3. **正文第一段**（✅ 應該應用 Dropcap 的位置）
4. 其他正文內容

**解決方案**：
修改 `applyDropcap` 方法，實現智能段落識別：
```typescript
// ✅ 正確的查找邏輯
const paragraphMatches = content.match(/<p[^>]*>.*?<\/p>/gi);

// 遍歷所有段落，跳過引言區塊
let targetParagraph = null;
for (let i = 0; i < paragraphMatches.length; i++) {
  const paragraph = paragraphMatches[i];
  // 跳過引言區塊（class="intro_quote"）
  if (!paragraph.includes('class="intro_quote"')) {
    targetParagraph = paragraph;
    break;
  }
}
```

**修復效果**：
- **智能段落識別**：自動跳過引言區塊
- **精確定位**：找到真正的正文第一段
- **向前兼容**：沒有引言區塊時也能正常工作
- **錯誤容忍**：找不到合適段落時安全返回原始內容

### 9.11 Unicode字符編碼問題修復
**問題描述**：用戶在上傳包含中文字符的圖片時遇到錯誤：`Cannot convert argument to a ByteString because the character at index 22 has a value of 21205 which is greater than 255`

**錯誤分析**：
- **錯誤位置**：`uploadMediaFromUrl` 函數中的 `useSimplifiedWPIntegration.tsx:92`
- **根本原因**：處理包含Unicode字符（如中文）的圖片URL時，字符編碼處理不當
- **技術細節**：字符21205是中文字符的Unicode碼點，超出ByteString的0-255範圍

**問題成因**：
1. **文件名提取**：從URL提取的文件名包含中文字符
2. **HTTP頭設置**：`Content-Disposition` 頭中的Unicode字符沒有正確編碼
3. **認證字符串**：`Buffer.from()` 處理包含Unicode的認證信息時出錯

**解決方案1：安全文件名處理**
```typescript
// ✅ 修復文件名Unicode字符問題
let safeFilename = filename;
try {
  // 移除非ASCII字符，避免ByteString轉換錯誤
  safeFilename = filename.replace(/[^\x00-\x7F]/g, '');
  
  // 如果文件名太短，生成安全的替代文件名
  if (safeFilename.length < 3) {
    const timestamp = Date.now();
    const extension = filename.includes('.') ? filename.split('.').pop() : 'jpg';
    safeFilename = `image-${timestamp}.${extension}`;
  }
  
  // 確保只包含安全字符
  safeFilename = safeFilename.replace(/[^a-zA-Z0-9.\-_]/g, '-');
} catch (filenameError) {
  safeFilename = `image-${Date.now()}.jpg`;
}
```

**解決方案2：安全認證字符串處理**
```typescript
// ✅ 修復認證字符串Unicode編碼問題
let base64Auth;
try {
  // 使用TextEncoder確保正確的UTF-8編碼
  const encoder = new TextEncoder();
  const authBytes = encoder.encode(authString);
  base64Auth = Buffer.from(authBytes).toString('base64');
} catch (authError) {
  // 回退方案
  base64Auth = Buffer.from(authString, 'utf8').toString('base64');
}
```

**修復效果**：
- **字符編碼安全**：正確處理Unicode字符，避免ByteString轉換錯誤
- **文件名標準化**：將包含中文的文件名轉換為安全的ASCII文件名
- **錯誤容忍**：提供回退方案，確保在異常情況下也能繼續工作
- **向前兼容**：不影響現有的ASCII文件名處理

**學習到的教訓**：
1. **國際化要提早考慮**：處理文件上傳時要考慮Unicode字符的情況
2. **字符編碼要明確**：在不同環境間傳遞數據時，要明確編碼格式
3. **錯誤處理要完善**：提供回退方案，避免單一失敗導致整個流程中斷
4. **測試要包含邊界情況**：要測試包含特殊字符的情況

**防錯檢查清單**：
□ 處理URL和文件名時考慮Unicode字符
□ HTTP頭設置時使用安全的字符編碼
□ 提供字符編碼失敗時的回退方案
□ 測試包含中文字符的文件名和URL
□ 確保 `Buffer.from()` 正確處理UTF-8編碼
□ 記錄文件名轉換過程，便於調試

### 9.12 AI摘要數據傳遞問題修復
**問題描述**：用戶發現引言部分顯示的是預設內容「AI 摘要引言，簡述本篇文章重點內容。」，而不是 Copy Editing 階段 AI 生成的真實摘要。

**根本原因分析**：
1. **數據結構不匹配**：Article Formatting 期望 `EnhancedCopyEditingResult.content_analysis.excerpt`，但 Copy Editing 實際返回 `CopyEditResult.wordpressParams.excerpt`
2. **錯誤的數據傳遞**：在 `useArticleFormattingStage.tsx` 中，`analysisResult` 被設置為 `copyEditingResult.wordpressParams`，而不是完整的分析結果
3. **數據流程缺失**：Copy Editing 生成的 AI 摘要存在於 `wordpressParams.excerpt`，但沒有正確傳遞到 Article Formatting

**數據流程分析**：
```typescript
// ❌ 錯誤的數據流程
Copy Editing → wordpressParams.excerpt (AI生成的摘要)
       ↓
Article Formatting ← analysisResult: wordpressParams (錯誤結構)
       ↓
buildIntroQuote(analysisResult?.content_analysis?.excerpt) → undefined
       ↓
使用預設文字：「AI 摘要引言，簡述本篇文章重點內容。」

// ✅ 修復後的數據流程
Copy Editing → wordpressParams.excerpt (AI生成的摘要)
       ↓
Article Formatting ← analysisResult: { content_analysis: { excerpt: wordpressParams.excerpt } }
       ↓
buildIntroQuote(analysisResult?.content_analysis?.excerpt) → AI生成的摘要
       ↓
顯示真實的AI摘要內容
```

**解決方案1：修復數據傳遞結構**
在 `useArticleFormattingStage.tsx` 中重構 `analysisResult` 數據：
```typescript
// ✅ 修復：構建正確的數據結構
analysisResult: {
  wordpress_params: copyEditingResult.wordpressParams,
  content_analysis: {
    excerpt: copyEditingResult.wordpressParams.excerpt || '', // 🔧 關鍵修復
    author_name: copyEditingResult.wordpressParams.author ? String(copyEditingResult.wordpressParams.author) : undefined,
    chinese_terminology_fixes: [],
    suggested_slug: copyEditingResult.wordpressParams.slug || '',
    estimated_reading_time: undefined
  },
  related_articles: {
    background: [],
    previous_context: [],
    related_reading: []
  },
  article_classification: articleClassification
}
```

**解決方案2：改進摘要處理邏輯**
在 `ArticleFormattingProcessor.ts` 中增強 `buildIntroQuote` 方法：
```typescript
// ✅ 改進摘要處理邏輯
let finalExcerpt = excerpt;

// 如果沒有AI生成的摘要，或摘要為空/無意義
if (!finalExcerpt || finalExcerpt.trim() === '' || finalExcerpt.includes('此文章未經過參數生成處理')) {
  finalExcerpt = 'AI 摘要引言，簡述本篇文章重點內容。';
  console.warn('使用預設摘要，原因：', !excerpt ? '未提供摘要' : '摘要無效');
} else {
  console.log('使用AI生成的摘要:', finalExcerpt.substring(0, 100) + (finalExcerpt.length > 100 ? '...' : ''));
}
```

**修復效果**：
- **AI摘要正確顯示**：引言區塊現在會顯示 Copy Editing 階段生成的真實 AI 摘要
- **數據結構統一**：修復了 Copy Editing 和 Article Formatting 間的數據結構不匹配問題
- **調試信息完善**：添加了詳細的日誌輸出，便於追蹤摘要來源
- **降級處理完善**：當 AI 摘要無效時，會記錄原因並使用預設文字

**學習到的教訓**：
1. **數據結構一致性很重要**：不同階段間的數據傳遞必須確保結構匹配
2. **要檢查完整的數據流程**：從數據生成到最終使用的每個環節都要驗證
3. **調試信息要完善**：添加詳細的日誌輸出有助於快速定位問題
4. **要有明確的數據契約**：定義清楚各階段間傳遞的數據結構

**防錯檢查清單**：
□ 確認各階段間的數據結構匹配
□ 驗證數據從生成到使用的完整流程
□ 添加詳細的調試日誌輸出
□ 測試有無AI摘要的兩種情況
□ 確保降級處理邏輯正確
□ 定期檢查數據契約的一致性

### 9.13 文稿分類競態條件問題修復
**問題描述**：進階格式化階段出現錯誤 "缺少文稿分類信息，請確保已正確設置文稿類型"，導致處理流程中斷。

**根本原因分析**：
這是一個**競態條件（Race Condition）**問題，發生在重新處理文件時：

1. **重置邏輯有延遲**：在 `IntegratedFileProcessor.handleProcess` 中，當重新處理時會先調用 `resetProcessState()`
2. **異步設置文稿分類**：原始代碼使用 `setTimeout(() => { setArticleClassification(classification); }, 0)` 來設置文稿分類
3. **進階格式化階段搶跑**：由於 JavaScript 的異步特性，進階格式化階段可能在文稿分類重新設置之前就開始執行
4. **`getArticleClassification()` 返回 undefined**：導致進階格式化階段獲取不到文稿分類信息

**時序問題分析**：
```typescript
// ❌ 問題的時序
1. 用戶點擊重新處理
2. resetProcessState() → processState = null
3. setTimeout(() => setArticleClassification(...), 0) → 延遲執行
4. 處理流程開始 → 各階段開始執行
5. 進階格式化階段執行 → getArticleClassification() 返回 undefined ❌
6. 拋出錯誤："缺少文稿分類信息"
7. setTimeout 回調執行 → 文稿分類設置完成（但已經太晚了）

// ✅ 修復後的時序
1. 用戶點擊重新處理
2. resetProcessState() → processState = null
3. setArticleClassification(classification) → 立即執行，創建臨時狀態 ✅
4. 處理流程開始 → 各階段開始執行
5. 進階格式化階段執行 → getArticleClassification() 返回正確的分類信息 ✅
6. 處理成功完成
```

**解決方案**：
移除 `setTimeout` 延遲，改為立即設置文稿分類：

```typescript
// ❌ 修復前：異步設置，存在競態條件
if (processSuccess) {
  // ... 重置邏輯
  resetProcessState();
  
  // 重置後立即重新設置文稿分類，確保資料不丟失
  setTimeout(() => {
    setArticleClassification(classification);
    console.log('重置後重新設置文稿分類:', classification);
  }, 0);
}

// ✅ 修復後：同步設置，避免競態條件
if (processSuccess) {
  // ... 重置邏輯
  resetProcessState();
  
  // 🔧 修復競態條件：立即重新設置文稿分類，而不是使用 setTimeout
  // 確保在重置後文稿分類立即可用，避免進階格式化階段找不到分類信息
  setArticleClassification(classification);
  console.log('重置後立即重新設置文稿分類:', classification);
}
```

**修復效果**：
- **消除競態條件**：文稿分類在重置後立即可用，不存在時序問題
- **穩定的處理流程**：進階格式化階段能穩定獲取到文稿分類信息
- **錯誤處理改善**：避免因文稿分類缺失導致的處理中斷
- **數據一致性**：確保處理流程中的數據狀態一致性

**ProcessingContext 的保護機制**：
`setArticleClassification` 方法已經有處理 `processState` 為 null 的保護機制：
```typescript
const setArticleClassification = useCallback((classification: ArticleClassification) => {
  setProcessState(prevState => {
    if (!prevState) {
      // 如果 processState 為 null，創建一個臨時狀態來存儲文稿分類
      const tempState: ProcessState = {
        ...JSON.parse(JSON.stringify(initialState)),
        id: `temp-${Date.now()}`,
        article_classification: classification
      };
      return tempState;
    }
    return {
      ...prevState,
      article_classification: classification
    };
  });
}, []);
```

**學習到的教訓**：
1. **避免不必要的異步操作**：在狀態管理中，能同步執行的操作就不要使用異步
2. **競態條件很難調試**：時序問題往往不容易重現，需要仔細分析代碼執行順序
3. **狀態重置要謹慎**：重置狀態後的重新初始化邏輯要確保立即執行
4. **保護機制要完善**：關鍵的狀態獲取方法要有容錯處理

**防錯檢查清單**：
□ 避免在狀態管理中使用不必要的 setTimeout
□ 確保狀態重置後的重新初始化邏輯立即執行
□ 檢查是否存在其他競態條件風險
□ 測試重新處理文件的場景
□ 確保關鍵狀態的獲取方法有容錯處理
□ 添加詳細的日誌輸出幫助調試時序問題

### 9.14 Dropcap 數字字符處理問題修復
**問題描述**：用戶反映在進階格式化處理後，文章開頭的 "2025 年" 變成了只剩下 "年"，"2025 " 部分被錯誤地移除了。

**根本原因分析**：
在 `ArticleFormattingProcessor.applyDropcap` 方法中存在兩個問題：

1. **正則表達式不支援數字**：
   ```typescript
   // ❌ 原始正則表達式不包含數字
   const firstCharMatch = paragraphContent.match(/^[^<]*?([a-zA-Z\u4e00-\u9fa5])/);
   ```
   對於 "2025 年" 這樣的內容，正則表達式會跳過數字 "2025 "，直接匹配到 "年"

2. **剩餘內容計算錯誤**：
   ```typescript
   // ❌ 使用 indexOf 會在有重複字符時定位錯誤
   const remainingContent = paragraphContent.substring(paragraphContent.indexOf(firstChar) + 1);
   ```
   當 `firstChar` 為 "年" 時，會從 "年" 之後開始取剩餘內容，導致 "2025 " 被丟棄

**錯誤處理流程**：
```
原始內容: "2025 年夏季上線，內容..."
↓
正則匹配: /^[^<]*?([a-zA-Z\u4e00-\u9fa5])/ → 匹配到 "年"
↓
firstChar = "年"
↓
indexOf("年") → 找到 "年" 的位置
↓
remainingContent = 從 "年" 之後的內容 → " 夏季上線，內容..."
↓
結果: <span class="dropcap">年</span> 夏季上線，內容...
❌ "2025 " 被丟棄了！
```

**解決方案**：
1. **擴展正則表達式支援數字**：
   ```typescript
   // ✅ 擴展正則表達式包含數字 0-9
   const firstCharMatch = paragraphContent.match(/^[^<]*?([0-9a-zA-Z\u4e00-\u9fa5])/);
   ```

2. **改進剩餘內容計算邏輯**：
   ```typescript
   // ✅ 使用 search 方法找到第一個字符的確切位置
   const firstCharIndex = paragraphContent.search(/[0-9a-zA-Z\u4e00-\u9fa5]/);
   const remainingContent = paragraphContent.substring(firstCharIndex + 1);
   ```

**修復後的處理流程**：
```
原始內容: "2025 年夏季上線，內容..."
↓
正則匹配: /^[^<]*?([0-9a-zA-Z\u4e00-\u9fa5])/ → 匹配到 "2"
↓
firstChar = "2"
↓
search(/[0-9a-zA-Z\u4e00-\u9fa5]/) → 找到第一個字符 "2" 的位置 (0)
↓
remainingContent = 從位置 1 開始的內容 → "025 年夏季上線，內容..."
↓
結果: <span class="dropcap">2</span>025 年夏季上線，內容...
✅ 完整保留所有內容！
```

**修復代碼對比**：
```typescript
// ❌ 修復前：不支援數字，計算錯誤
const firstCharMatch = paragraphContent.match(/^[^<]*?([a-zA-Z\u4e00-\u9fa5])/);
const firstChar = firstCharMatch[1];
const remainingContent = paragraphContent.substring(paragraphContent.indexOf(firstChar) + 1);

// ✅ 修復後：支援數字，精確計算
const firstCharMatch = paragraphContent.match(/^[^<]*?([0-9a-zA-Z\u4e00-\u9fa5])/);
const firstChar = firstCharMatch[1];
const firstCharIndex = paragraphContent.search(/[0-9a-zA-Z\u4e00-\u9fa5]/);
const remainingContent = paragraphContent.substring(firstCharIndex + 1);
```

**支援的字符類型擴展**：
- **數字**: `0-9` (新增支援)
- **英文字母**: `a-z`, `A-Z` (原有支援)
- **中文字符**: `\u4e00-\u9fa5` (原有支援)

**修復效果**：
- ✅ **正確處理數字開頭**：如 "2025 年"、"1.5 萬"、"100% 完成" 等
- ✅ **精確字符定位**：避免重複字符導致的位置錯誤
- ✅ **內容完整保留**：確保沒有字符被意外丟棄
- ✅ **向前兼容**：不影響原有的英文和中文字符處理

**添加調試信息**：
```typescript
console.log('Dropcap 處理詳情:', {
  originalContent: paragraphContent.substring(0, 50) + '...',
  firstChar: firstChar,
  firstCharIndex: firstCharIndex,
  remainingContent: remainingContent.substring(0, 50) + '...'
});
```

**學習到的教訓**：
1. **正則表達式要考慮完整**：設計字符匹配時要考慮所有可能的字符類型
2. **字符串操作要精確**：使用 `search()` 比 `indexOf()` 更適合正則表達式定位
3. **邊界條件要測試**：需要測試數字、英文、中文等各種開頭的內容
4. **調試信息很重要**：添加詳細日誌有助於快速定位問題

**防錯檢查清單**：
□ 正則表達式包含所有需要的字符類型（數字、英文、中文）
□ 字符串位置計算使用精確的方法
□ 測試各種字符開頭的內容（數字、英文、中文）
□ 添加調試日誌幫助問題定位
□ 確保剩餘內容計算的準確性
□ 驗證 Dropcap 處理不會丟失任何字符

### 9.15 Dropcap 智能字符處理改進（方案A實施）
**問題描述**：用戶發現原始Dropcap功能會丟失有意義的符號，如 \"$ETH\" 變成 \"ETH\"，\"「引用」\" 變成 \"引用」\"。

**根本原因重新分析**：
原始設計使用限制性正則表達式 `/^[^<]*?([0-9a-zA-Z\\u4e00-\\u9fa5])/` 是基於以下擔心：

1. **HTML標籤污染**：擔心 `<span>內容` 會變成 `<span class=\"dropcap\"><</span>span>內容`
2. **空白字符問題**：擔心空格作為Dropcap不美觀
3. **視覺效果考量**：認為某些符號不適合作為Dropcap

但這導致了嚴重的功能缺陷，丟失重要的內容符號。

**方案A：智能字符掃描算法**

**技術實現**：
```typescript
// ✅ 新的智能掃描算法
let searchIndex = 0;
let firstChar = '';
let firstCharOriginalIndex = -1;

while (searchIndex < paragraphContent.length) {
  const char = paragraphContent[searchIndex];
  
  // 跳過空白字符
  if (/\\s/.test(char)) {
    searchIndex++;\n    continue;\n  }\n  \n  // 跳過HTML標籤\n  if (char === '<') {\n    const tagEndIndex = paragraphContent.indexOf('>', searchIndex);\n    if (tagEndIndex !== -1) {\n      searchIndex = tagEndIndex + 1;\n      continue;\n    }\n  }\n  \n  // 找到第一個實際字符\n  firstChar = char;\n  firstCharOriginalIndex = searchIndex;\n  break;\n}\n\n// 只排除明確有害的字符\nconst problematicChars = ['<', '>', '&', '\\n', '\\r', '\\t'];\nif (problematicChars.includes(firstChar)) {\n  return content; // 跳過處理\n}\n```

**算法優勢**：
1. **智能掃描**：逐字符分析，精確跳過HTML和空白
2. **符號保留**：保留所有有意義的符號
3. **HTML安全**：正確處理嵌套HTML標籤
4. **性能優化**：線性掃描，效率高

**修復效果對比**：

| 測試內容 | 修復前（限制性正則） | 修復後（智能掃描） | 狀態 |\n|---------|-------------------|-------------------|------|\n| `$ETH 價格上漲` | `<span class=\"dropcap\">E</span>TH 價格上漲` | `<span class=\"dropcap\">$</span>ETH 價格上漲` | ✅ 修復 |\n| `「這是引用」` | `<span class=\"dropcap\">這</span>是引用」` | `<span class=\"dropcap\">「</span>這是引用」` | ✅ 修復 |\n| `@username 發布` | `<span class=\"dropcap\">u</span>sername 發布` | `<span class=\"dropcap\">@</span>username 發布` | ✅ 修復 |\n| `#hashtag 內容` | `<span class=\"dropcap\">h</span>ashtag 內容` | `<span class=\"dropcap\">#</span>hashtag 內容` | ✅ 修復 |\n| `2025 年夏季` | `<span class=\"dropcap\">年</span>夏季` | `<span class=\"dropcap\">2</span>025 年夏季` | ✅ 修復 |\n| `<strong>重要</strong>` | 正常處理 | 正常處理 | ✅ 保持 |\n| `  空白開頭` | 跳過空白 | 跳過空白 | ✅ 保持 |\n\n**核心改進點**：\n1. **從限制性變為包容性**：不再限制字符類型，而是只排除有害字符\n2. **精確的HTML處理**：正確跳過完整的HTML標籤結構\n3. **位置計算改進**：使用原始索引而非search方法，避免重複字符問題\n4. **詳細調試日誌**：提供完整的處理過程記錄\n\n**技術價值**：\n- **用戶體驗提升**：保留完整的內容語義\n- **功能完整性**：支援各種現代內容格式（加密貨幣、社交媒體、標籤等）\n- **維護性改善**：算法邏輯清晰，易於理解和修改\n- **擴展性增強**：可輕易調整problematicChars列表以適應新需求