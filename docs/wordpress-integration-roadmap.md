# WordPress集成功能路線圖

> **文檔版本**: 1.0  
> **最後更新**: 2025年5月15日  
> **優先級**: 高

本文檔詳細規劃了WordPress集成功能的發展路線圖，包括即將推出的功能、技術改進和長期願景。

## 1. 當前狀態總結

目前已完成的WordPress集成功能:

- ✅ 基本文章發布功能
- ✅ 支持標題、分類、標籤設置
- ✅ 支持多種發布狀態
- ✅ 安全的服務端代理架構
- ✅ 基本錯誤處理與反饋

當前存在的主要限制:

- ❌ 分類和標籤只能通過ID/名稱手動輸入
- ❌ 沒有媒體（圖片）上傳功能
- ❌ 錯誤恢復機制有限
- ❌ 未支持WordPress多站點配置

## 2. 近期計劃 (1-2個月)

### 2.1 分類和標籤選擇下拉菜單

**優先級**: 高  
**預計完成**: 2週內

**具體任務**:
1. 實現WordPress分類和標籤獲取API代理
   - 新增`GET /api/wordpress-proxy/categories`端點
   - 新增`GET /api/wordpress-proxy/tags`端點
2. 創建可搜索的下拉選擇組件
3. 緩存機制以提高性能
4. 集成到現有WordPress發布表單

**技術實現**:
```typescript
// categories API路由
export async function GET() {
  try {
    // 使用現有認證邏輯獲取分類列表
    const apiEndpoint = `${WP_API_URL}/wp-json/wp/v2/categories?per_page=100`;
    // ... 實現認證和響應處理
  } catch (error) {
    // 錯誤處理
  }
}
```

### 2.2 增強錯誤恢復機制

**優先級**: 中  
**預計完成**: 2週內

**具體任務**:
1. 實現自動重試邏輯(最多重試3次)
2. 添加請求超時設置
3. 實現網絡錯誤智能檢測
4. 改進錯誤分類與顯示

**技術實現**:
```typescript
// 重試邏輯示例
async function fetchWithRetry(url, options, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(10000) // 10秒超時
      });
      return response;
    } catch (error) {
      console.warn(`嘗試 ${attempt + 1}/${maxRetries} 失敗:`, error);
      lastError = error;
      
      // 只有網絡錯誤或超時才重試
      if (!(error instanceof TypeError || error.name === 'AbortError')) {
        throw error;
      }
      
      // 等待重試(指數退避)
      await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 500));
    }
  }
  
  throw lastError;
}
```

### 2.3 媒體上傳功能

**優先級**: 中  
**預計完成**: 3週內

**具體任務**:
1. 實現媒體上傳代理API
   - 新增`POST /api/wordpress-proxy/media`端點
2. 創建圖片上傳介面組件
3. 支持拖放和文件選擇
4. 上傳進度顯示
5. 與文章內容編輯器集成

**技術實現**:
```typescript
// 媒體上傳路由
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: '未提供文件' }, { status: 400 });
    }
    
    const apiEndpoint = `${WP_API_URL}/wp-json/wp/v2/media`;
    // 使用multipart/form-data格式上傳到WordPress
    // ...
  } catch (error) {
    // 錯誤處理
  }
}
```

## 3. 中期計劃 (3-6個月)

### 3.1 WordPress多站點支持

**優先級**: 中  
**預計完成**: 2個月內

**具體任務**:
1. 實現WordPress站點配置管理
2. 創建站點選擇界面
3. 增強環境變量配置支持多站點
4. 為每個站點提供獨立的認證配置

**技術實現**:
```typescript
// 站點配置接口
interface WordPressSite {
  id: string;
  name: string;
  apiUrl: string;
  authConfig: {
    type: 'basic' | 'oauth' | 'application_password';
    // 認證配置...
  }
}

// 環境變量格式:
// WORDPRESS_SITES='[{"id":"site1", "name":"主站", "apiUrl":"https://site1.com"}, ...]'
// WORDPRESS_SITE1_USER='username'
// WORDPRESS_SITE1_PASSWORD='password'
```

### 3.2 草稿自動保存

**優先級**: 中  
**預計完成**: 1.5個月內

**具體任務**:
1. 實現定時自動保存邏輯
2. 添加版本歷史記錄
3. 草稿恢復功能
4. 離線編輯支持

**技術實現**:
```typescript
// 自動保存Hook
function useAutosave(content, options) {
  useEffect(() => {
    const interval = setInterval(async () => {
      if (hasChanges()) {
        try {
          await saveDraft();
          updateLastSaved(new Date());
        } catch (error) {
          console.error('自動保存失敗:', error);
          // 保存到本地存儲作為備份
          localStorage.setItem('draft_backup', content);
        }
      }
    }, options.interval || 60000);
    
    return () => clearInterval(interval);
  }, [content, options]);
}
```

### 3.3 離線發布隊列

**優先級**: 低  
**預計完成**: 2.5個月內

**具體任務**:
1. 設計離線發布佇列數據結構
2. 實現IndexedDB存儲
3. 後台同步邏輯
4. 佇列管理界面

**技術實現**:
```typescript
// 使用背景同步API
async function registerPublishTask(postData) {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const registration = await navigator.serviceWorker.ready;
    
    // 保存到IndexedDB
    await saveToPublishQueue(postData);
    
    // 註冊同步任務
    await registration.sync.register('publish-queue');
    return true;
  } else {
    // 降級處理 - 直接嘗試發布
    return false;
  }
}
```

## 4. 長期願景 (6個月以上)

### 4.1 雙向同步功能

**優先級**: 低  
**預計完成**: 4個月內

**具體任務**:
1. 實現WordPress文章獲取
2. 本地與遠程版本比較
3. 衝突解決機制
4. 完整雙向同步流程

### 4.2 高級版本控制

**優先級**: 低  
**預計完成**: 5個月內

**具體任務**:
1. 完整的文章修訂歷史
2. 不同版本比較
3. 選擇性恢復功能
4. 協作編輯支持

### 4.3 WordPress高級功能集成

**優先級**: 低  
**預計完成**: 6個月內

**具體任務**:
1. 自定義字段(Custom Fields)支持
2. Gutenberg區塊編輯器集成
3. WordPress插件擴展支持
4. SEO工具整合

## 5. 執行計劃與資源分配

### 5.1 近期執行計劃

| 任務名稱 | 優先級 | 負責人 | 預計工時 | 開始日期 |
|---------|-------|-------|---------|---------|
| 分類和標籤選擇下拉菜單 | 高 | TBD | 5人日 | TBD |
| 增強錯誤恢復機制 | 中 | TBD | 3人日 | TBD |
| 媒體上傳功能 | 中 | TBD | 7人日 | TBD |

### 5.2 里程碑計劃

1. **基礎功能增強** (1個月)
   - 分類和標籤選擇
   - 錯誤處理改進
   
2. **高級功能開發** (3個月)
   - 媒體上傳
   - 多站點支持
   - 自動保存功能
   
3. **企業級功能** (6個月)
   - 雙向同步
   - 版本控制
   - 離線支持

### 5.3 技術債務與重構

在實現新功能的同時，需要解決以下技術債務:

1. **代碼重構**
   - 統一錯誤處理機制
   - 抽象WordPress API客戶端
   
2. **測試覆蓋**
   - 增加單元測試
   - 集成測試
   - E2E測試

3. **文檔更新**
   - API文檔
   - 用戶指南
   - 開發者文檔

## 6. 總結與下一步行動

WordPress集成功能已經建立了堅實的基礎，下一步將專注於:

1. **優先實現分類和標籤選擇功能**，顯著提升用戶體驗
2. **建立完整的測試套件**，確保功能穩定性
3. **增強錯誤處理和恢復機制**，提高系統健壯性
4. **規劃多站點支持**，為企業級需求做準備

通過遵循本路線圖，我們將逐步將WordPress集成功能發展為一個成熟、穩定且功能豐富的企業級發布系統。 