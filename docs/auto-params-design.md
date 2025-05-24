# WordPress自動參數生成與內容適配方案設計

## 1. 需求背景

### 1.1 現有系統架構
系統目前採用階段性流水線處理文件：
- **初步處理階段**：upload → extract → process
- **後期處理階段**：advanced-ai → format-conversion → copy-editing
- **上稿階段**：prep-publish → publish-news

### 1.2 混合操作模式說明
系統支援三種混合操作模式，用戶可在一開始上傳文件時選擇：

1. **全自動模式**
   - 系統自動完成所有處理階段，無需用戶手動確認進入下一階段
   - 在「上稿準備」和「上架新聞」階段自動進行，用戶只需最終檢視結果

2. **半自動模式**
   - 全自動流程完成後，若用戶對最終結果不滿意
   - 可以回到「上稿準備」或「上架新聞」階段進行微調
   - 然後點擊處理繼續流程，無需從頭開始

3. **手動模式**
   - 用戶需在「上稿準備」和「上架新聞」這兩個階段手動確認後才進入下一步
   - 系統仍會自動處理其他技術階段（如初步處理和後期處理階段）

**注意**：所有模式下，系統都會在「文稿編輯」階段自動填寫WordPress參數（標題、分類、標籤等），用戶在prep-publish階段可進行必要的調整，無需完整填寫。模式的區別主要在於是否需要手動確認特定階段。

### 1.3 核心需求
1. 自動提取並填充WordPress發布所需參數（標題、分類、標籤等）
2. 確保發布到WordPress時內容格式正確（避免標題和首圖重複出現）
3. 應用特殊品牌樣式（前言區特殊樣式、底部相關閱讀代碼等）
4. 保留Tiptap編輯器的所有功能，包括HTML編輯功能
5. 保留WordPress發布設定的所有功能

### 1.4 挑戰與考量
1. 用戶在prep-publish階段可能會對已處理內容進行大幅修改
2. 各篇文章情況差異大，參數提取難度不一
3. Tiptap編輯器可能導致HTML結構變化
4. 需支持在不同模式間無縫切換

## 2. 解決方案設計

### 2.1 方案概述
引入一個獨立的「文稿編輯」(copy-editing)階段，在format-conversion和prep-publish之間，由CopyEditorAgent負責：

1. 分析經過格式轉換的內容
2. 提取並產生適合的WordPress發布參數
3. 根據品牌要求預先適配內容格式
4. 為用戶準備好預處理的內容供prep-publish階段編輯

### 2.2 流程圖
```
                     CopyEditorAgent處理            用戶檢視/修正                  確認發布參數
format-conversion -----------> copy-editing --------> prep-publish ----------------> publish-news -------> WordPress發布
        |                             |                     |                              |                    |
        |                             |                     |                              |                    |
        v                             v                     v                              v                    v
    格式轉換                  參數生成+內容適配        Tiptap編輯器                  發布參數確認          發布結果展示
                        (根據品牌特性調整內容格式)     (含HTML編輯功能)          (所有模式均展示預填參數)
```

### 2.3 CopyEditorAgent設計

#### 2.3.1 主要職責
- 智能分析文章內容提取參數（標題、分類、標籤等）
- 生成符合品牌標準的WordPress發布參數
- 根據品牌要求適配內容格式（處理前言、添加相關閱讀等）
- 預處理內容以便用戶在Tiptap編輯器中編輯
- 支持不同級別的自動化處理

#### 2.3.2 技術實現
CopyEditorAgent將分析內容並生成包含所有必要參數的JSON結構，用於後續階段使用。

**重要**：CopyEditorAgent必須確保生成的adaptedContent內容包含h1格式的主標題，以便用戶在編輯器中可以編輯整篇文章（包括標題）。在上架新聞階段，系統會從編輯器的HTML內容中提取第一個h1標籤作為WordPress主標題參數。

以下是產生的參數JSON範例：

```json
{
  "wordpress_params": {
    "title": "2024年蘋果全新MacBook Pro評測：M3晶片帶來驚人效能提升",
    "content": "<p>完整的HTML格式內容...</p>",
    "excerpt": "本篇評測深入剖析了搭載M3晶片的全新MacBook Pro，探討其效能、電池續航力及散熱表現的重大突破，並解析其如何重新定義專業用戶的工作流程。",
    "slug": "2024-macbook-pro-m3-review",
    "status": "draft",  // 發布狀態: publish, draft, pending, private
    
    "date": "2024-05-20T14:30:00",  // 發布日期和時間
    
    "author": 1,  // 作者ID
    "password": "",  // 可選的文章密碼保護
    
    "featured_media": 123,  // 特色圖片ID
    "featured_image": {
      "url": "https://example.com/images/macbook-pro-m3-2024.jpg",
      "alt": "2024年款MacBook Pro M3正面展示圖"
    },
    
    "categories": [
      { "id": 5 },  // 必須使用分類ID，不支持直接使用分類名稱
      { "id": 7 }
    ],
    "tags": [
      { "id": 15 },  // 必須使用標籤ID，不支持直接使用標籤名稱
      { "id": 18 },
      { "id": 22 }
    ]
  }
}
```

#### 2.3.3 WordPress參數說明與測試結果

根據API測試結果，以下是使用WordPress參數的重要說明：

1. **必要參數**:
   - `title`: 文章標題
   - `content`: 完整HTML內容
   - `excerpt`: 文章摘要
   - `status`: 發布狀態(publish, draft, future, pending, private)

2. **分類與標籤**:
   - 必須使用ID值，不能使用文字名稱
   - 格式為 `{ "id": 數字 }`
   - 可通過WordPress管理介面或API獲取ID

3. **發布日期行為**:
   - 設定publish狀態、未來日期的文章會自動變為預排發布(future)狀態
   - 設定過去或當前日期的文章會立即發布為publish狀態
   - 無需手動設置future標籤，系統會根據日期自動處理

4. **特色圖片**:
   - `featured_media`: 必須提供媒體ID
   - 若需上傳新圖片，需先使用媒體上傳API獲取ID

5. **其他可選參數**:
   - `author`: 作者ID
   - `slug`: 自訂網址後綴
   - `password`: 文章密碼保護

注意：自定義meta欄位支持視WordPress站點配置而定，可能需要額外設定。

### 2.4 Publish-News階段設計

#### 2.4.1 主要功能
Publish-News階段包含三個關鍵功能：

1. **內容提取與參數更新**
   - 從prep-publish階段提交的HTML內容中提取第一個h1標題作為WordPress主標題（**允許用戶在編輯器中直接編輯標題**）
   - 提取第一張圖片作為特色圖片(Feature Image)
   - HTML內容保持完整（包含h1標題），確保WordPress發布時可保留整體結構
   - 基於編輯器提取的內容，更新CopyEditorAgent之前生成的JSON參數表

2. **發布參數確認界面**
   - 提供用戶友好的表單界面，顯示所有WordPress發布參數
   - 允許用戶在發布前進行最終調整
   - 支持特殊的WordPress選項設定（如發布狀態、評論設定、可見性等）

3. **WordPress發布流程**
   - 執行實際的WordPress API發布請求
   - 處理媒體文件上傳（包括特色圖片和內文圖片）
   - 提供發布狀態反饋和結果確認
   - 支持發布失敗時的重試機制

## 3. 實現細節與技術挑戰解決方案

### 3.1 標題和內容的整合處理方案

為了解決標題編輯和顯示問題，我們採用了以下方案：

1. **標題與內容的統一處理**
   - 在copy-editing階段，CopyEditorAgent會創建帶有H1標題的HTML內容
   - H1標題作為文章正文的一部分傳遞給Tiptap編輯器，用戶可直接編輯標題
   - 發布前，系統從編輯器的HTML內容中提取H1作為WordPress標題參數
   - 發布時，系統自動從內容中移除H1標籤，避免WordPress頁面中標題重複顯示

2. **實現代碼**
   - 在useProcessingFlow.tsx中，copy-editing階段完成後將標題和內容組合：
     ```typescript
     const titleHtml = title ? `<h1>${title}</h1>` : '';
     const combinedContent = titleHtml + adaptedContent;
     ```
   - 在IntegratedFileProcessor.tsx中，實現從編輯器內容提取H1標題：
     ```typescript
     const extractH1Title = useCallback((html: string): string => {
       const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
       if (h1Match && h1Match[1]) {
         const h1Content = h1Match[1].replace(/<[^>]+>/g, '').trim();
         return h1Content;
       }
       return '';
     }, []);
     ```
   - 在useSimplifiedWPIntegration.tsx中，發布前處理內容，移除H1標籤：
     ```typescript
     // 處理內容 - 移除第一個h1標籤，避免標題重複
     if (content.match(/<h1[^>]*>.*?<\/h1>/i)) {
       content = content.replace(/<h1[^>]*>.*?<\/h1>/i, '');
     }
     ```

### 3.2 特色圖片(Feature Image)的提取與處理

為了實現特色圖片的自動提取與處理，我們採用了類似標題處理的方法：

1. **特色圖片的檢測與提取**
   - 在copy-editing階段，CopyEditorAgent從HTML內容中提取第一張圖片的URL
   - 提取的圖片URL被添加到wordpress_params中的featured_image參數
   - 編輯器接收的內容結構為：H1標題 + 特色圖片 + 文章內容
   - 用戶可以在編輯器中看到並編輯整個結構（包括特色圖片）

2. **實現代碼**
   - 在CopyEditorAgent中提取第一張圖片URL：
     ```typescript
     const extractFirstImageUrl = (htmlContent: string): string | null => {
       try {
         const imgMatch = htmlContent.match(/<img[^>]+src="([^">]+)"/i);
         if (imgMatch && imgMatch[1]) {
           return imgMatch[1];
         }
       } catch (error) {
         console.error("提取圖片URL出錯:", error);
       }
       return null;
     };
     
     // 將提取的圖片URL添加到參數中
     if (firstImageUrl) {
       wordpress_params.featured_image = {
         url: firstImageUrl,
         alt: "文章首圖"
       };
     }
     ```
   - 在useProcessingFlow.tsx中，組合標題、特色圖片和內容：
     ```typescript
     // 組合標題
     const titleHtml = title ? `<h1>${title}</h1>` : '';
     
     // 添加特色圖片（如果有）
     let featureImageHtml = '';
     if (featuredImageUrl) {
       featureImageHtml = `<figure class="featured-image"><img src="${featuredImageUrl}" alt="文章首圖" /></figure>`;
     }
     
     // 組合完整內容
     const combinedContent = titleHtml + featureImageHtml + adaptedContent;
     ```
   - 在IntegratedFileProcessor.tsx中，提取編輯器中的特色圖片URL：
     ```typescript
     const extractFeatureImage = useCallback((html: string): string => {
       try {
         // 使用正則表達式提取第一個img標籤的src屬性
         const imgMatch = html.match(/<img[^>]+src="([^">]+)"/i);
         if (imgMatch && imgMatch[1]) {
           const imgSrc = imgMatch[1].trim();
           console.log("從編輯器內容中提取首圖URL:", imgSrc);
           return imgSrc;
         }
       } catch (error) {
         console.error("提取首圖URL出錯:", error);
       }
       return '';
     }, []);
     ```
   - 在useSimplifiedWPIntegration.tsx中，發布前移除特色圖片：
     ```typescript
     // 提取並處理特色圖片
     let featuredImageUrl = '';
     try {
       // 如果表單中提供了featured_media且為URL，將其保存為特色圖片URL
       if (formData.featured_media && isURL(formData.featured_media.trim())) {
         featuredImageUrl = formData.featured_media.trim();
         // 如果特色圖片URL存在於內容中，則從內容中移除該圖片
         if (featuredImageUrl && content.includes(featuredImageUrl)) {
           // 找到包含該URL的img標籤，並移除整個figure或img標籤
           const imgRegex = new RegExp(`<figure[^>]*>\\s*<img[^>]*src=["']${escapeRegExp(featuredImageUrl)}["'][^>]*>.*?<\\/figure>|<img[^>]*src=["']${escapeRegExp(featuredImageUrl)}["'][^>]*>`, 'i');
           content = content.replace(imgRegex, '');
           console.log('已從內容中移除特色圖片，避免WordPress顯示重複圖片');
         }
       } else if (!formData.featured_media) {
         // 如果沒有提供特色圖片，嘗試提取第一張圖片作為特色圖片
         const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
         if (imgMatch && imgMatch[1]) {
           featuredImageUrl = imgMatch[1];
           // 從內容中移除該圖片
           const imgRegex = new RegExp(`<figure[^>]*>\\s*<img[^>]*src=["']${escapeRegExp(featuredImageUrl)}["'][^>]*>.*?<\\/figure>|<img[^>]*src=["']${escapeRegExp(featuredImageUrl)}["'][^>]*>`, 'i');
           content = content.replace(imgRegex, '');
         }
       }
     } catch (error) {
       console.error('處理特色圖片時出錯:', error);
     }
     
     // 輔助函數：轉義正則表達式中的特殊字符
     function escapeRegExp(string: string): string {
       return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
     }
     ```

3. **特色圖片處理的重要考量**
   - 不同於之前版本，新版本在WordPress發布時會移除內容中的特色圖片，避免重複顯示
   - 支持多種圖片容器結構，包括單獨的<img>標籤以及被<figure>標籤包裹的圖片
   - 使用正則表達式轉義功能(escapeRegExp)確保處理過程中不會因圖片URL中的特殊字符而出錯
   - 提供容錯機制，避免圖片處理失敗影響整體發布流程
   - 支持從表單提供的圖片URL和從內容中自動提取兩種方式

### 3.3 WordPress參數表單預填充與顯示

1. **參數傳遞流程**
   - CopyEditorAgent產生的參數→copy-editing階段→useProcessingFlow→IntegratedFileProcessor→WordPressPublishComponent→WordPressSettings
   - 所有預提取的參數均顯示在表單下方，但不會覆蓋用戶手動輸入的值

2. **參數顯示改進**
   - 優化了WordPressSettings組件，添加extractedParams屬性展示自動提取的參數
   - 為分類、標籤和slug等重要字段添加信息提示，提高用戶體驗
   - 自動提取的參數以灰色小字顯示在表單字段下方，不干擾用戶輸入

```typescript
// WordPressSettings組件中顯示自動提取的參數
const formatEntityDisplay = (entities?: Array<{ id: number; name?: string }>) => {
  if (!entities || !entities.length) return null;
  
  return (
    <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
      自動提取: {entities.map(entity => 
        entity.name ? `${entity.name} (${entity.id})` : `ID: ${entity.id}`
      ).join(', ')}
    </div>
  );
};
```

## 4. 錯誤處理與降級策略

### 4.1 參數提取失敗
當CopyEditorAgent無法提取有效參數時，系統將採用以下降級策略：

1. 使用基本參數集 - 如文件名作為標題，原始內容作為正文
2. 發出警告，讓用戶知道需要手動檢查和完成參數
3. 自動將模式切換為手動模式，確保用戶審核

### 4.2 JSON解析回退機制

由於AI模型（如GPT-4o）在生成JSON時經常附帶Markdown格式標記，系統實現了多層回退解析機制：

1. **第一層嘗試**：直接使用`JSON.parse()`解析原始回應
   ```javascript
   try {
     parsedResult = JSON.parse(result);
   } catch (jsonError) {
     // 進入第二層回退
   }
   ```

2. **第二層回退**：從文本中提取JSON部分（忽略Markdown標記）
   ```javascript
   const jsonMatch = result.match(/\{[\s\S]*\}/);
   if (jsonMatch) {
     try {
       parsedResult = JSON.parse(jsonMatch[0]);
       console.log('從文本中提取JSON成功');
     } catch (extractError) {
       // 進入第三層回退
     }
   }
   ```

3. **第三層回退**：嘗試從響應中查找替代字段
   ```javascript
   // 嘗試從其他可能的字段提取
   const possibleFields = ['wordpressParams', 'wordpress_parameters', 'params', 'parameters'];
   for (const field of possibleFields) {
     if (parsedResult[field] && typeof parsedResult[field] === 'object') {
       parsedResult.wordpress_params = parsedResult[field];
       break;
     }
   }
   ```

4. **最終回退**：使用基本參數結構
   ```javascript
   if (!parsedResult.wordpress_params) {
     parsedResult.wordpress_params = {
       title: '參數解析失敗',
       content: content,
       excerpt: '無法解析WordPress參數JSON'
     };
   }
   ```

這種多層回退機制確保系統即使在AI回應格式異常時，仍能提取有效參數，提高系統的穩健性。實際運行日誌中的「JSON解析失敗，嘗試提取JSON部分」和「從文本中提取JSON成功」等信息，是此機制正常工作的證明。

### 4.3 標題與特色圖片處理的容錯機制

在處理HTML內容中的H1標題和特色圖片時，我們實現了以下容錯機制：

1. **標題提取容錯**
   - 使用try/catch包裝正則表達式匹配過程，避免異常格式導致崩潰
   - 使用正則提取H1標籤內容後，再次清理潛在的HTML子標籤
   - 如提取失敗，降級使用預處理參數或允許用戶手動填寫

2. **標題移除容錯**
   - 在WordPress發布前移除H1標籤時先檢查標籤是否存在
   - 使用try/catch包裝替換操作，確保即使替換失敗也能繼續發布流程
   - 如移除失敗，降級使用原始內容，並記錄警告

3. **特色圖片提取容錯**
   - 使用try/catch包裝圖片URL提取過程
   - 支持多種URL格式（相對路徑、絕對路徑、base64等）
   - 提供默認圖片備選方案，確保必要時有可用的特色圖片

4. **圖片上傳容錯**
   - 捕獲上傳過程中的所有可能錯誤
   - 如果上傳失敗，允許繼續發布過程，只是沒有特色圖片
   - 記錄詳細的錯誤信息，方便診斷和修復

這些容錯機制保證了即使在不規範的HTML內容情況下，系統也能處理標題和特色圖片的提取、移除和上傳操作，提高整體穩定性。

## 5. 實施計劃

### 5.1 開發順序
1. 基礎分析功能（標題、圖片、主題、關鍵詞提取）
2. 參數自動填寫功能（所有模式適用）
3. 內容適配功能（標題/圖片去重、前言處理、相關閱讀）
4. 模式支持（三階段確認控制）
5. 錯誤處理與降級策略

### 5.2 集成點
1. 在format-conversion和prep-publish之間添加copy-editing階段
2. 在copy-editing階段調用CopyEditorAgent
3. 為所有模式提供自動參數填寫與預處理內容
4. 為半自動模式提供回到「文稿編輯」、「上稿準備」和「上架新聞」階段的導航功能
5. 為手動模式提供所有三個階段的確認機制
6. 保留現有WordPress發布表單所有元素和功能
7. 保留現有Tiptap編輯器的所有功能

## 6. 總結

本方案通過引入獨立的「文稿編輯」(copy-editing)階段及CopyEditorAgent，實現以下目標：

1. **優化處理流程** - 明確區分參數生成與內容預處理(copy-editing)、人工編輯(prep-publish)和發布(publish-news)三個階段
2. **專業化文稿處理** - 由CopyEditorAgent負責專業的文稿編輯與參數生成工作
3. **保留核心功能** - 完整保留Tiptap編輯器和WordPress發布表單功能
4. **靈活支持三種模式** - 全自動流程、半自動返回調整、手動階段確認
5. **智能參數填寫** - 自動分析內容填寫發布參數，用戶只需調整
6. **品牌風格應用** - 根據品牌要求預先適配內容格式（前言、相關閱讀等）
7. **穩健的容錯機制** - 提供多層次的錯誤處理與降級策略

通過這種設計，系統能夠在保證AI高效處理的同時，允許人工介入進行必要的檢查和調整，實現效率與品質的平衡。將copy-editing提前到用戶編輯前，能更好地準備內容，減輕用戶在編輯階段的工作量。

## 7. 實際運行效果與優化

在實際實現過程中，我們發現並解決了以下關鍵問題：

1. **標題與內容管理的整合挑戰**
   - 成功實現標題與內容的統一編輯體驗，讓用戶可以在同一編輯器中修改整篇文章（包括標題）
   - 發布時自動從HTML中提取H1作為WordPress標題，同時從內容中移除H1標籤避免重複
   - 這種方式既保持了編輯的便利性，又確保了WordPress發布後的正確格式

2. **特色圖片的自動提取與處理**
   - 從文章內容中智能識別並提取第一張圖片作為特色圖片
   - 在編輯器中組合顯示H1標題+特色圖片+文章內容，提供直觀的編輯體驗
   - 編輯完成後自動提取首圖URL，支持直接URL發布或自動上傳到WordPress媒體庫
   - 與標題處理不同，特色圖片在發布時保留在內容中，不需要移除

3. **參數自動提取的穩定性**
   - 通過多層錯誤處理和回退機制，顯著提高了AI參數提取的穩定性
   - 即使遇到複雜格式或AI回應異常的情況，系統也能自動恢復並提供基本參數

4. **表單預填充與用戶體驗優化**
   - 優化了表單界面，使自動提取的參數清晰顯示但不干擾用戶輸入
   - 實現WordPress參數表單與編輯器、AI提取結果的無縫整合
   - 保留用戶完全的編輯控制權，同時減少手動填寫工作量

這些優化使整個WordPress發布流程變得更加流暢、穩定和用戶友好，大大提高了內容處理效率。 