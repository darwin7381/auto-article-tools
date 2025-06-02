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
- [ ] **發布時間解禁敘述過濾** - 移除 "EMBARGOED TILL" 等敘述
- [ ] **Dropcap 格式應用** - 第一段開頭第一個字自動設為 Dropcap
- [ ] **英文數字空格處理** - 英文和數字前後空半格（段首除外）
- [ ] **標題層級正規化** - 段落標題優先設為「標題三」，層級：標題三 > 標題四 > 段落（粗體）

#### 3. 引言與關聯文章系統
- [ ] **引言自動生成** - 有副標題直接使用，無副標題用 AI 摘要（≤100字）
- [ ] **引言格式套用** - 使用 `intro_quote` class 格式
- [ ] **前情提要文章搜尋** - 從 BlockTempo 搜尋相關文章
- [ ] **背景補充文章搜尋** - 從 BlockTempo 搜尋相關文章
- [ ] **引言區塊HTML生成** - 自動生成包含前情提要和背景補充的完整HTML
- [ ] **文末相關閱讀** - 自動添加2-4篇相關文章連結（粗體格式）
- [ ] **TG Banner自動插入** - 在相關閱讀前插入官方TG橫幅

#### 4. 文末連結處理
- [ ] **連結數量限制** - 最多3個連結
- [ ] **TG/LINE連結過濾** - 自動刪除 Telegram、LINE 社群連結
- [ ] **連結優先級排序** - 選擇排除TG/LINE後的前三個連結
- [ ] **連結格式標準化** - 確保連結格式符合要求


#### 6. WordPress 發布參數
- [ ] **作者ID設定** - 根據文稿類型自動設定對應作者

### 🏗️ 技術架構實現進度

#### 階段1：基礎架構（已完成 ✅）
- [x] 在upload界面增加文稿類型選擇
- [x] 建立ArticleClassification資料結構  
- [x] 創建基礎模板設定檔
- [x] 修改ProcessingState支援新欄位

#### 階段2：AI分析強化（進行中 🔄）
- [ ] 實現關聯文章搜尋功能
- [ ] 加強中文用語轉換邏輯
- [ ] 實現撰稿方名稱識別
- [ ] 優化永久連結英文翻譯

#### 階段3：格式化處理器（待開始 ⏳）
- [ ] 建立ArticleFormattingProcessor類
- [ ] 實現模板化押註插入
- [ ] 實現Dropcap自動應用
- [ ] 實現關聯文章區塊插入

#### 階段4：圖片處理強化（待開始 ⏳）
- [ ] 實現廣編稿AD模板應用
- [ ] 圖片尺寸檢查和壓縮建議
- [ ] 特色圖片模板處理
- [ ] 圖片alt文字優化

#### 階段5：UI優化與測試（待開始 ⏳）
- [ ] 格式預覽界面開發
- [ ] 錯誤處理和降級策略
- [ ] 全流程整合測試
- [ ] 使用者體驗優化

### 📊 完成度統計
- **總體進度**: 15% (4/26 主要任務)
- **基礎架構**: 100% ✅ 
- **核心功能**: 0% ⏳
- **技術集成**: 15% 🔄

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
✅ 設計文檔已更新記錄修復內容