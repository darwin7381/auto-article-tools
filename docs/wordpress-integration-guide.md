# WordPress集成指南

> **文檔版本**: 1.0  
> **最後更新**: 2025年5月15日  
> **作者**: 系統開發團隊

## 1. 概述與背景

本專案實現了一套完整的WordPress發布系統，能夠將處理好的文檔內容直接發布到WordPress平台。系統採用現代化的前後端分離架構，確保了安全性和可維護性。

### 1.1 主要功能

- 將處理後的HTML內容發布至WordPress
- 支持設置文章標題、分類、標籤等元數據
- 可選擇發布狀態（草稿、待審核、直接發布）
- 支持私密文章設置
- 提供詳細的發布狀態反饋

### 1.2 技術棧

- **前端**: Next.js、React、TypeScript
- **後端**: Next.js API Routes (服務端代理)
- **目標平台**: WordPress REST API
- **認證方式**: HTTP Basic Authentication

## 2. 系統架構

### 2.1 整體架構設計

我們採用了三層架構設計：

1. **表現層**: React組件，負責用戶界面和交互
2. **業務邏輯層**: React Hooks和服務端代理，處理業務邏輯
3. **數據服務層**: WordPress REST API，提供數據持久化

```
┌────────────────────┐      ┌────────────────────┐      ┌────────────────────┐
│                    │      │                    │      │                    │
│   表現層 (React)   │──────▶│ 業務邏輯層 (Hooks) │──────▶│ 服務端API代理     │
│                    │      │                    │      │                    │
└────────────────────┘      └────────────────────┘      └──────────┬─────────┘
                                                                   │
                                                                   │
                                                         ┌─────────▼─────────┐
                                                         │                   │
                                                         │  WordPress REST   │
                                                         │       API         │
                                                         │                   │
                                                         └───────────────────┘
```

### 2.2 安全性考量

**重要安全原則**: WordPress認證信息絕不在客戶端處理或暴露！

我們採用了服務端代理模式，所有敏感操作（如認證）僅在服務器端執行，確保API密鑰和認證信息的安全性。這是本系統的核心設計原則。

### 2.3 數據流

1. 用戶填寫WordPress發布表單（標題、分類等）
2. 前端發送請求到服務端API代理
3. 服務端代理使用環境變量中的認證信息
4. 服務端代理發送請求到WordPress REST API
5. 處理響應並返回結果到前端
6. 前端顯示發布結果（成功/錯誤）

## 3. 關鍵組件詳解

### 3.1 前端組件

#### 3.1.1 WordPress發布組件 (WordPressPublishComponent)

- **位置**: `src/components/file-processing/IntegratedFileProcessor.tsx`
- **功能**: 提供WordPress發布界面，處理用戶輸入並展示發布結果
- **關鍵特性**:
  - 可折疊的設置面板
  - 實時表單驗證
  - 友好的錯誤與成功提示
  - 支持查看已發布的文章
  - 支持自訂連結(slug)設置
  - 支持指定文章作者(author)

#### 3.1.2 WordPress設置組件 (WordPressSettings)

- **位置**: `src/components/ui/wordpress-settings/index.tsx`
- **功能**: 管理WordPress發布設置的表單界面
- **關鍵特性**:
  - 支持文章標題、分類、標籤設置
  - 發布狀態選擇（草稿、待審核、直接發布、定時發布、私密文章）
  - 私密文章選項
  - 自訂連結(slug)輸入字段
  - 指定作者ID(author)輸入字段
  - 特色圖片ID(featured_media)輸入字段
  - 定時發布日期時間設置

### 3.2 業務邏輯層

#### 3.2.1 WordPress整合Hook (useSimplifiedWPIntegration)

- **位置**: `src/hooks/useSimplifiedWPIntegration.tsx`
- **功能**: 封裝WordPress發布業務邏輯，提供狀態管理和API調用
- **關鍵特性**:
  - 錯誤處理與狀態管理
  - 數據轉換與預處理
  - 與服務端API通信

### 3.3 服務端代理

#### 3.3.1 WordPress代理API (wordpress-proxy)

- **位置**: `src/app/api/wordpress-proxy/publish/route.ts`
- **功能**: 安全地代理WordPress API請求，處理認證與錯誤
- **關鍵特性**:
  - 安全處理認證信息
  - 圖片HTML處理與優化
  - 錯誤處理與日誌
  - 響應格式化

#### 3.3.2 圖片處理機制

為確保圖片在WordPress中正確顯示，服務端代理實現了智能圖片處理功能：

- **功能說明**:
  - 移除可能與WordPress主題樣式沖突的自定義屬性與類
  - 添加響應式樣式確保圖片適應容器寬度
  - 保留原始的寬高比例及alt屬性
  - 適配WordPress默認圖片類，提升兼容性

- **實現方式**:
  - 使用正則表達式識別和處理HTML中的`<img>`標籤
  - 生成WordPress兼容的圖片HTML標記
  - 錯誤處理確保處理失敗時仍能使用原始HTML

這一機制有效解決了從Markdown或富文本編輯器轉換的HTML內容中，圖片在WordPress顯示不正確或"爆版"的問題。

- **代碼實現**:
```typescript
function processImagesInHtml(html: string): string {
  if (!html) return html;
  
  try {
    // 使用正則表達式處理圖片標籤
    return html.replace(/<img\s+([^>]*)>/gi, (match, attributes) => {
      // 保留src、alt和原始width/height屬性
      const srcMatch = attributes.match(/src=["']([^"']*)["']/i);
      const altMatch = attributes.match(/alt=["']([^"']*)["']/i);
      const widthMatch = attributes.match(/width=["']([^"']*)["']/i);
      const heightMatch = attributes.match(/height=["']([^"']*)["']/i);
      
      const src = srcMatch ? srcMatch[0] : '';
      const alt = altMatch ? altMatch[0] : 'alt=""';
      const width = widthMatch ? widthMatch[0] : '';
      const height = heightMatch ? heightMatch[0] : '';
      
      // 添加WordPress友好的圖片樣式
      return `<img ${src} ${alt} ${width} ${height} style="max-width:100%; height:auto;" class="wp-image" />`;
    });
  } catch (error) {
    console.error('處理圖片HTML時出錯:', error);
    return html; // 發生錯誤時返回原始HTML
  }
}
```

## 4. 認證與安全

### 4.1 認證流程

1. 服務端代理從環境變量獲取WordPress認證信息
2. 使用Basic認證方式向WordPress API發送請求
3. 認證標頭格式: `Authorization: Basic {base64(username:password)}`
4. 認證信息不存儲或傳輸到客戶端

### 4.2 環境變量配置

系統依賴以下環境變量:

- `NEXT_PUBLIC_WORDPRESS_API_URL`: WordPress網站URL (客戶端可見)
- `WORDPRESS_API_USER`: WordPress用戶名 (僅服務端可見)
- `WORDPRESS_API_PASSWORD`: WordPress密碼 (僅服務端可見)

### 4.3 安全最佳實踐

- 所有敏感認證信息僅在服務端處理
- 使用HTTPS確保數據傳輸安全
- 錯誤消息中不暴露敏感信息
- 定期更新WordPress認證信息

## 5. 錯誤處理與調試

### 5.1 錯誤分類

系統可能遇到的錯誤類型:

1. **客戶端錯誤**: 表單驗證失敗、無效輸入
2. **網絡錯誤**: 連接問題、超時
3. **認證錯誤**: 認證失敗、權限問題
4. **服務端錯誤**: WordPress API錯誤、內部服務器錯誤

### 5.2 錯誤處理策略

- 前端顯示友好的錯誤消息
- 詳細錯誤日誌記錄到控制台
- 服務端錯誤統一格式化
- 提供復原和重試機制

### 5.3 調試指南

調試WordPress集成問題時的步驟:

1. 檢查環境變量是否正確設置
2. 查看服務端日誌中的詳細錯誤信息
3. 使用`curl`或Postman直接測試WordPress API
4. 驗證WordPress用戶權限和API訪問設置

## 6. 遇到的挑戰與解決方案

### 6.1 認證問題

**挑戰**: 最初在客戶端直接調用WordPress API，導致認證信息暴露和跨域問題。

**解決方案**: 
- 實現服務端代理API，處理所有認證邏輯
- 將敏感認證信息移至環境變量
- 改用服務端安全處理所有API請求

### 6.2 API路徑問題

**挑戰**: WordPress REST API路徑格式多樣，需要處理不同情況。

**解決方案**:
- 規範化API端點構建邏輯
- 添加路徑前綴修正 (`/wp-json/wp/v2/` vs `/wp/v2/`)
- 確保URL格式一致性

### 6.3 特色圖片處理問題

**挑戰**: 
1. 特色圖片上傳過程中遇到客戶端vs服務器端函數衝突問題。在服務器端API路由中嘗試調用帶有`'use client'`標記的客戶端函數，導致運行時錯誤：「Attempted to call uploadMediaFromUrl() from the server but uploadMediaFromUrl is on the client.」
2. 特色圖片在發布到WordPress後會重複顯示，一次在特色圖片區域，一次在文章內容中，影響用戶體驗。

**解決方案**:
- 創建了專門的服務器端版本函數：`serverWordpressService.ts`
- 分離客戶端和服務器端代碼，確保職責明確
- 改進了URL驗證和圖片格式檢查
- 增強了錯誤處理和日誌記錄
- 確保特色圖片上傳失敗不會阻止整個文章發布流程
- 在發布前檢測並從內容中移除作為特色圖片的圖片，避免重複顯示
- 使用正則表達式識別特色圖片在內容中的位置，包括處理<figure>和<img>標籤

**實現細節**:
- 服務器端通過Node.js的`fetch` API直接處理圖片下載和上傳
- 支持直接從URL上傳圖片到WordPress媒體庫
- 添加詳細的日誌記錄，方便調試和問題排查
- 當上傳圖片失敗時提供友好的錯誤提示，但仍允許文章發布
- 使用正則表達式轉義函數確保URL中的特殊字符不會干擾圖片移除流程
- 在發布前根據特色圖片URL從內容中移除該圖片，確保顯示整潔

**內容處理代碼**:
```typescript
// 輔助函數：轉義正則表達式中的特殊字符
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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
```

這一機制解決了特色圖片在WordPress中重複顯示的問題，保證了發布內容的整潔和專業性。

### 6.4 錯誤處理複雜性

**挑戰**: WordPress API可能返回多種格式的錯誤響應。

**解決方案**:
- 實現復雜的錯誤響應解析邏輯
- 區分JSON和非JSON響應處理
- 轉換技術錯誤為用戶友好的消息

## 7. 自動化流程設計

### 7.1 半自動與全自動流程

系統設計了靈活的混合式自動化流程，滿足不同場景下的需求：

**半自動流程**:
- 用戶可以在處理完成後查看結果
- 提供手動調整文章內容、標題和元數據的機會
- 在確認無誤後手動點擊發布按鈕
- 適合需要人工審核和微調的情況

**全自動流程**:
- 處理完成後自動進行發布，無需人工干預
- 適合批量處理或標準化內容
- 節省人力並加快處理速度
- 可設置為草稿模式，方便後續批量審核

**混合式操作**:
- 即使選擇全自動流程，仍可在任意步驟中斷並轉為手動操作
- 自動處理後若發現問題，可返回進行手動調整
- 調整完成後可繼續自動化流程
- 提供最大的靈活性和操作效率

**技術實現**:
- 使用狀態管理追蹤流程階段
- 為每個環節提供手動操作的入口
- 確保數據在不同處理階段間正確傳遞
- 提供清晰的流程視覺反饋

### 7.2 特色圖片處理流程

系統支持智能處理特色圖片，包括：

**URL或ID混合處理**:
- 支持直接輸入WordPress媒體庫中的圖片ID
- 或提供外部圖片URL自動上傳到WordPress
- 系統自動檢測輸入類型並採取適當處理

**URL上傳流程**:
1. 用戶輸入圖片URL到特色圖片欄位
2. 系統檢測到輸入為URL格式
3. 自動從URL獲取圖片並上傳到WordPress媒體庫
4. 獲取生成的媒體ID用於設置特色圖片
5. 如上傳失敗，系統會繼續發布文章但不設置特色圖片

**處理優化**:
- 智能檢測URL格式和協議
- 驗證圖片格式和內容類型
- 自動生成適合WordPress的文件名
- 詳細的錯誤處理，確保發布流程不被中斷

## 8. 最佳實踐與經驗教訓

### 8.1 架構設計最佳實踐

- **服務端代理模式**: 敏感操作必須在服務端處理
- **明確責任分離**: UI、業務邏輯、API調用各司其職
- **統一錯誤處理**: 一致的錯誤捕獲和報告機制

### 8.2 關鍵經驗教訓

1. **安全永遠第一**: 不要在客戶端處理敏感認證信息
2. **深入瞭解API**: 充分理解WordPress REST API的細節和行為
3. **用戶體驗優先**: 提供清晰的操作反饋和錯誤提示
4. **預先考慮錯誤情況**: 設計時就考慮各種可能的失敗場景

## 9. 未來計劃

### 9.1 短期改進計劃

- **添加WordPress分類和標籤下拉選擇**: 實現API獲取分類和標籤列表
- **增強錯誤恢復機制**: 自動重試和恢復機制
- **擴展媒體上傳功能**: 支持圖片和文件上傳到WordPress媒體庫

### 9.2 中長期發展方向

- **WordPress多站點支持**: 擴展為支持多個WordPress站點
- **WordPress用戶管理**: 添加用戶管理和權限控制功能
- **草稿自動保存**: 實現文章草稿自動保存功能
- **離線發布隊列**: 支持離線工作和批量發布
- **雙向同步**: 支持從WordPress獲取和編輯已有文章

### 9.3 建議下一步行動

1. **完善錯誤處理**: 進一步增強錯誤處理和用戶提示
2. **添加單元測試**: 為WordPress集成功能添加自動化測試
3. **實現分類API**: 添加分類和標籤選擇下拉菜單
4. **用戶文檔**: 編寫詳細的用戶使用指南

## 10. 附錄

### 10.1 WordPress REST API參考

- [WordPress REST API手冊](https://developer.wordpress.org/rest-api/)
- [文章端點文檔](https://developer.wordpress.org/rest-api/reference/posts/)
- [認證文檔](https://developer.wordpress.org/rest-api/using-the-rest-api/authentication/)

### 10.2 常見問題解答

**Q: 為什麼不直接在前端調用WordPress API?**  
A: 出於安全考慮，WordPress認證信息不應在客戶端暴露。使用服務端代理可以安全地處理認證。

**Q: Application Passwords vs 普通密碼?**  
A: WordPress建議使用Application Passwords進行API認證，它提供更好的安全性和可撤銷性。

**Q: 如何處理跨域(CORS)問題?**  
A: 通過服務端代理，我們可以避免跨域問題，因為請求來自同一個來源。

**Q: 如何擴展支持自定義字段?**  
A: WordPress API支持自定義字段(meta)，可以通過添加相應的參數來支持。 

### 10.3 API請求JSON格式範例

以下是向WordPress API發布文章時的JSON請求格式範例：

```json
{
  "title": "文章標題",
  "content": "<!-- wp:paragraph --><p>這是文章正文內容，支持HTML和Gutenberg區塊格式。</p><!-- /wp:paragraph -->",
  "status": "publish",
  "categories": [5, 7],
  "tags": [12, 15],
  "excerpt": "這是文章摘要",
  "featured_media": 123,
  "comment_status": "open",
  "ping_status": "open",
  "format": "standard",
  "meta": {
    "custom_field_key": "自定義字段值"
  },
  "sticky": false,
  "password": "",
  "author": 1,
  "slug": "custom-article-url",
  "date": "2025-09-15T08:00:00"
}
```

**主要字段說明**：

- `title`: 文章標題（必填）
- `content`: 文章內容，支持HTML和Gutenberg區塊格式（必填）
- `status`: 發布狀態，可選值包括：
  - `publish`：立即發布
  - `future`：定時發布（需設置`date`字段）
  - `draft`：草稿
  - `pending`：待審核
  - `private`：私密文章
- `categories`: 分類ID數組
- `tags`: 標籤ID數組
- `featured_media`: 特色圖片ID（WordPress媒體庫中的圖片ID）
- `author`: 文章作者ID（指定作者，默認為當前用戶）
- `slug`: 自訂連結（文章URL的結尾部分，支持自定義URL）
- `date`: 發布日期時間（當status為future時必須提供，格式為ISO8601）

**新增字段詳細說明**:

1. **自訂連結(slug)**:
   - 定義文章的永久鏈接URL
   - 不提供時WordPress會自動根據文章標題生成
   - 應使用小寫英文字母、數字和連字符，避免特殊字符和空格
   - 例如設置`slug: "my-custom-article"`後，文章URL會變成`https://yoursite.com/my-custom-article`

2. **指定作者(author)**:
   - 使用作者的WordPress用戶ID（數字）
   - 需要確保該用戶ID存在且有正確權限
   - 未提供時默認使用API認證的當前用戶
   - 管理員可以指定任何用戶為作者，但一般作者只能發布自己的文章

3. **特色圖片(featured_media)**:
   - 使用WordPress媒體庫中已上傳圖片的ID
   - 圖片ID可以從WordPress媒體庫中獲取
   - 該圖片會顯示為文章的特色圖片，通常會在列表頁和文章頂部顯示
   - 不同主題可能對特色圖片有不同的顯示效果
   
4. **定時發布(future + date)**:
   - 當status設為"future"時，可以設定文章在未來指定時間發布
   - date字段必須提供有效的ISO8601格式日期時間（如 "2025-09-15T08:00:00"）
   - 系統會自動在指定時間將文章狀態從定時發布改為已發布
   - 使用定時發布可以提前排程內容發布計劃

**服務端代理處理示例**：

```typescript
// WordPress代理API實現示例
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // 從環境變量獲取認證信息
    const username = process.env.WORDPRESS_API_USER;
    const password = process.env.WORDPRESS_API_PASSWORD;
    
    if (!username || !password) {
      return NextResponse.json(
        { error: '缺少WordPress認證配置' },
        { status: 500 }
      );
    }
    
    // 處理內容中的圖片，確保在WordPress中正確顯示
    if (data.content) {
      data.content = processImagesInHtml(data.content);
    }
    
    // 構建認證頭
    const authHeader = 'Basic ' + btoa(`${username}:${password}`);
    
    // 發送請求到WordPress
    const wpResponse = await fetch(
      `${process.env.NEXT_PUBLIC_WORDPRESS_API_URL}/wp-json/wp/v2/posts`, 
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify(data)
      }
    );
    
    // 處理響應
    const responseData = await wpResponse.json();
    
    if (!wpResponse.ok) {
      return NextResponse.json(
        { error: '發布失敗', details: responseData },
        { status: wpResponse.status }
      );
    }
    
    return NextResponse.json(responseData);
  } catch (error) {
    // 錯誤處理
    return NextResponse.json(
      { error: '處理請求時發生錯誤', details: error.message },
      { status: 500 }
    );
  }
}
```

此示例展示了最常用的發布參數，更多參數請參考[WordPress REST API文章端點文檔](https://developer.wordpress.org/rest-api/reference/posts/)。 