# WordPress自動參數生成與內容適配方案設計

## 1. 需求背景

### 1.1 現有系統架構
系統目前採用階段性流水線處理文件：
- **初步處理階段**：upload → extract → process
- **後期處理階段**：advanced-ai → format-conversion
- **上稿階段**：prep-publish → publish-news

### 1.2 混合操作模式說明
系統支援三種混合操作模式，用戶可在一開始上傳文件時選擇：

1. **全自動模式**
   - **上稿準備階段(prep-publish)**：用戶可檢視AI處理後的內容，進行必要修正
   - **上架新聞階段(publish-news)**：系統自動提取參數、適配內容並發布，無需用戶參與

2. **半自動模式**
   - **上稿準備階段(prep-publish)**：用戶可檢視AI處理後的內容，進行必要修正
   - **上架新聞階段(publish-news)**：系統提供參數建議，用戶可調整參數後確認發布

3. **手動模式**
   - **上稿準備階段(prep-publish)**：用戶可檢視AI處理後的內容，進行必要修正
   - **上架新聞階段(publish-news)**：用戶需手動填寫所有WordPress參數，確認後發布

### 1.3 核心需求
1. 自動提取並填充WordPress發布所需參數（標題、分類、標籤等）
2. 確保發布到WordPress時內容格式正確（避免標題和首圖重複出現）
3. 應用特殊品牌樣式（前言區特殊樣式、底部相關閱讀代碼等）
4. 保留Tiptap編輯器的所有功能，包括HTML編輯功能
5. 保留WordPress發布設定的所有功能

### 1.4 挑戰與考量
1. 用戶在prep-publish階段可能會對AI生成內容進行大幅修改
2. 各篇文章情況差異大，參數提取難度不一
3. Tiptap編輯器可能導致HTML結構變化
4. 需支持在不同模式間無縫切換

## 2. 解決方案設計

### 2.1 方案概述
在publish-news階段導入一個智能Agent（ContentPublishingAgent），負責：

1. 分析用戶在prep-publish階段確認的內容
2. 提取適合的WordPress發布參數
3. 根據品牌要求適配內容格式
4. 執行發布流程

### 2.2 流程圖
```
                                    用戶檢視/修正                     ContentPublishingAgent
format-conversion ----------> prep-publish ----------> publish-news ---------------------> WordPress發布
        |                         |                         |                               |
        |                         |                         |                               |
        v                         v                         v                               v
    AI處理內容              Tiptap編輯器              參數提取+內容適配                  發布結果展示
                        (含HTML編輯功能)          (自動/半自動/手動模式)
```

### 2.3 ContentPublishingAgent設計

#### 2.3.1 主要職責
- 智能分析文章內容提取參數（標題、分類、標籤等）
- 根據品牌要求適配內容格式（處理前言、添加相關閱讀等）
- 處理Tiptap編輯器產生的HTML標記問題
- 支持不同級別的自動化處理

#### 2.3.2 技術實現

```typescript
// 在publish-news階段執行的主要Agent
export async function ContentPublishingAgent(
  editorContent,  // 從prep-publish階段獲得的編輯器內容
  mode,           // 自動化模式：'auto', 'semi', 'manual'
  userParams = {} // 用戶在半自動或手動模式下提供的參數
) {
  try {
    // 1. 內容分析
    const contentAnalysis = await analyzeContent(editorContent);
    
    // 2. 參數處理
    let publishParams;
    
    if (mode === 'auto') {
      // 全自動：完全由AI決定參數
      publishParams = extractPublishingParams(contentAnalysis);
    } 
    else if (mode === 'semi') {
      // 半自動：AI提供建議參數，結合用戶提供的參數
      const suggestedParams = extractPublishingParams(contentAnalysis);
      publishParams = mergeParams(suggestedParams, userParams);
    }
    else {
      // 手動：完全使用用戶提供的參數
      publishParams = userParams;
    }
    
    // 3. 內容適配
    const adaptedContent = adaptContentForPublishing(
      editorContent, 
      publishParams,
      contentAnalysis, 
      mode
    );
    
    // 4. 返回結果
    return {
      params: publishParams,      // WordPress發布參數
      content: adaptedContent,    // 適配後的內容
      analysis: contentAnalysis,  // 內容分析結果
      mode: mode                  // 所使用的模式
    };
  } 
  catch (error) {
    console.error('ContentPublishingAgent處理失敗:', error);
    throw new Error(`內容發布處理失敗: ${error.message}`);
  }
}

// 內容分析函數
async function analyzeContent(htmlContent) {
  // 解析DOM結構
  const dom = parseHtmlToDom(htmlContent);
  
  // 擷取各類內容元素
  const headings = extractHeadings(dom);
  const images = extractImages(dom);
  const paragraphs = extractParagraphs(dom);
  const links = extractLinks(dom);
  
  // 分析主題與關鍵詞
  const topics = await analyzeTopics(paragraphs);
  const keywords = extractKeywords(paragraphs);
  
  // 識別文章結構
  const structure = determineArticleStructure(dom);
  
  return {
    headings,
    images,
    paragraphs,
    links,
    topics,
    keywords,
    structure,
    hasIntroduction: detectIntroduction(paragraphs),
    hasSummary: detectSummary(paragraphs),
    wordCount: countWords(paragraphs)
  };
}

// 提取發布參數
function extractPublishingParams(contentAnalysis) {
  // 從內容分析中提取
  const title = getBestTitle(contentAnalysis.headings);
  const featuredImage = selectFeaturedImage(contentAnalysis.images);
  const categories = determineBestCategories(contentAnalysis.topics);
  const tags = selectRelevantTags(contentAnalysis.keywords);
  const excerpt = generateExcerpt(contentAnalysis.paragraphs);
  
  return {
    title: title,
    featured_media: featuredImage,
    categories: categories,
    tags: tags,
    excerpt: excerpt,
    status: 'draft',
    isPrivate: false
  };
}

// 內容適配函數
function adaptContentForPublishing(htmlContent, params, analysis, mode) {
  // 解析DOM
  const dom = parseHtmlToDom(htmlContent);
  
  // 根據模式決定處理程度
  if (mode !== 'manual') {
    // 在自動和半自動模式下應用完整品牌處理
    
    // 處理標題（避免重複）
    handleTitleElements(dom, params.title);
    
    // 處理特色圖片（避免重複）
    handleFeaturedImage(dom, params.featured_media);
    
    // 應用前言區特殊樣式
    applyIntroductionStyle(dom, analysis);
    
    // 添加底部相關閱讀區
    addRelatedReadingSection(dom);
  }
  
  // 基本HTML清理與修復（所有模式都適用）
  cleanupHtml(dom);
  fixTiptapMarkupIssues(dom);
  
  // 轉換回HTML
  return domToHtml(dom);
}

// 合併參數（用於半自動模式）
function mergeParams(suggestedParams, userParams) {
  // 優先使用用戶提供的參數，缺失時使用建議參數
  return {
    ...suggestedParams,
    ...userParams
  };
}
```

## 3. 不同模式處理流程

### 3.1 全自動模式流程
1. 用戶選擇全自動模式
2. 系統執行內容處理流程直到format-conversion
3. 用戶在prep-publish階段檢視內容，可進行修正
4. 用戶點擊「繼續」進入publish-news階段
5. ContentPublishingAgent自動提取參數，適配內容
6. 系統自動發布到WordPress，顯示結果

### 3.2 半自動模式流程
1. 用戶選擇半自動模式
2. 系統執行內容處理流程直到format-conversion
3. 用戶在prep-publish階段檢視內容，可進行修正
4. 用戶點擊「繼續」進入publish-news階段
5. ContentPublishingAgent提取參數建議
6. 系統顯示發布設定表單，填充AI建議的參數
7. 用戶可調整參數，點擊「發布」
8. ContentPublishingAgent適配內容並發布到WordPress

### 3.3 手動模式流程
1. 用戶選擇手動模式
2. 系統執行內容處理流程直到format-conversion
3. 用戶在prep-publish階段檢視內容，可進行修正
4. 用戶點擊「繼續」進入publish-news階段
5. 系統顯示空白的發布設定表單
6. 用戶手動填寫所有參數，點擊「發布」
7. ContentPublishingAgent僅執行基本內容處理並發布到WordPress

## 4. 錯誤處理與降級策略

### 4.1 參數提取失敗
當ContentPublishingAgent無法提取有效參數時：

```typescript
// 參數提取失敗處理
function handleParamExtractionFailure(error, mode) {
  console.error('參數提取失敗:', error);
  
  if (mode === 'auto') {
    // 全自動模式下降級到半自動
    notifyUser('無法自動提取參數，已切換到半自動模式');
    return {
      success: false,
      fallbackMode: 'semi'
    };
  }
  
  if (mode === 'semi') {
    // 提供空白參數讓用戶填寫
    return {
      success: false,
      message: '無法提取參數建議，請手動填寫',
      params: getEmptyParamsTemplate()
    };
  }
  
  // 手動模式下直接繼續
  return {
    success: true,
    params: {}
  };
}
```

### 4.2 內容適配失敗
當內容適配過程中遇到問題時：

```typescript
// 內容適配失敗處理
function handleContentAdaptationFailure(error, originalContent) {
  console.error('內容適配失敗:', error);
  
  // 詢問用戶是否使用原始內容
  return confirmWithUser(
    '內容適配失敗，是否使用原始未處理的內容發布？',
    // 確認後使用原始內容
    () => {
      return {
        success: true,
        content: originalContent,
        adapted: false
      };
    },
    // 取消則中止發布
    () => {
      return {
        success: false,
        error: '用戶取消發布'
      };
    }
  );
}
```

## 5. 實施計劃

### 5.1 開發順序
1. 基礎分析功能（標題、圖片、主題、關鍵詞提取）
2. 參數生成功能
3. 內容適配功能（標題/圖片去重、前言處理、相關閱讀）
4. 模式支持（全自動/半自動/手動）
5. 錯誤處理與降級策略

### 5.2 集成點
1. 在publish-news階段開始時調用ContentPublishingAgent
2. 根據用戶模式選擇顯示不同程度的參數設定界面
3. 保留現有WordPress發布表單所有元素和功能
4. 保留現有Tiptap編輯器的所有功能

## 6. 總結

本方案通過在publish-news階段引入ContentPublishingAgent，實現以下目標：

1. **保持原有流程** - 不改變系統階段結構，僅在publish-news添加智能處理
2. **保留核心功能** - 完整保留Tiptap編輯器和WordPress發布表單功能
3. **靈活支持三種模式** - 全自動/半自動/手動模式無縫切換
4. **智能參數提取** - 自動分析內容提取最合適的發布參數
5. **品牌風格應用** - 根據品牌要求適配內容格式（前言、相關閱讀等）
6. **穩健的容錯機制** - 提供多層次的錯誤處理與降級策略

通過這種設計，系統能夠在保證AI高效處理的同時，允許人工介入進行必要的檢查和調整，實現效率與品質的平衡。 