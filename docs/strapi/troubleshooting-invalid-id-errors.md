# Strapi 5 "Invalid Key ID" 錯誤故障排除指南

## 📋 **問題概述**

在使用 Strapi 5 進行 PUT/PATCH 請求時，經常遇到 `"invalid key id"` 的驗證錯誤。這是因為 Strapi 5 對系統字段有嚴格的驗證規則。

---

## 🚨 **常見錯誤信息**

```json
{
  "status": 400,
  "name": "ValidationError",
  "message": "invalid key id",
  "details": {
    "key": "id",
    "source": "body"
  }
}
```

---

## 🔍 **根本原因**

### **1. 系統字段污染**
Strapi 5 不允許在 PUT/PATCH 請求的 body 中包含以下系統字段：
- `id`
- `documentId`
- `createdAt`
- `updatedAt`
- `publishedAt`

### **2. 數據傳遞鏈污染**
即使前端代碼看起來正確，問題可能出現在：
- API 響應數據直接被重用
- 組件間數據傳遞時未過濾
- 表單數據初始化時包含完整對象

---

## 🛠️ **解決方案模式**

### **模式 1：API 層過濾（推薦）**

```typescript
// ❌ 錯誤：直接使用完整數據
const updateData = formData; // 可能包含 ID 字段

// ✅ 正確：API 層過濾系統字段
async update(data: Partial<DefaultContentSettings>) {
  const filteredData = {
    contextArticle: data.contextArticle,
    backgroundArticle: data.backgroundArticle,
    relatedReadingArticles: data.relatedReadingArticles,
    isActive: data.isActive,
  };
  
  return strapiApi('/default-content-setting', {
    method: 'PUT',
    body: JSON.stringify({ data: filteredData }),
  });
}
```

### **模式 2：組件層數據清理**

```typescript
// ❌ 錯誤：直接設置完整對象
setFormData(prev => ({
  ...prev,
  contextArticle: defaultContent.contextArticle, // 包含 ID
}));

// ✅ 正確：只提取業務字段
setFormData(prev => ({
  ...prev,
  contextArticle: {
    title: defaultContent.contextArticle.title || '',
    url: defaultContent.contextArticle.url || ''
  },
}));
```

### **模式 3：合併數據時的過濾**

```typescript
// ❌ 錯誤：直接使用現有數據
const updateData = {
  contextArticle: currentData?.contextArticle || { title: '', url: '' },
  // 這會保留 ID 字段
};

// ✅ 正確：提取時過濾字段
const updateData = {
  contextArticle: currentData?.contextArticle ? 
    { 
      title: currentData.contextArticle.title || '', 
      url: currentData.contextArticle.url || '' 
    } : 
    { title: '', url: '' },
};
```

---

## 🎯 **實戰案例：預設內容管理**

### **問題場景**
管理預設內容設定時，需要：
1. 只更新當前編輯的區域
2. 保留其他區域的現有資料
3. 避免 ID 字段污染

### **解決方案**

```typescript
const handleSave = useCallback(async () => {
  try {
    const currentData = defaultContent;
    
    // 建立乾淨的數據結構，過濾所有 ID 字段
    const updateData = {
      contextArticle: currentData?.contextArticle ? 
        { 
          title: currentData.contextArticle.title || '', 
          url: currentData.contextArticle.url || '' 
        } : 
        { title: '', url: '' },
      backgroundArticle: currentData?.backgroundArticle ? 
        { 
          title: currentData.backgroundArticle.title || '', 
          url: currentData.backgroundArticle.url || '' 
        } : 
        { title: '', url: '' },
      relatedReadingArticles: currentData?.relatedReadingArticles ? 
        currentData.relatedReadingArticles.map(article => ({ 
          title: article.title || '', 
          url: article.url || '' 
        })) : 
        [],
      isActive: currentData?.isActive ?? true,
    };
    
    // 根據編輯區域更新對應數據
    if (editingSection === 'context') {
      updateData.contextArticle = formData.contextArticle;
    } else if (editingSection === 'background') {
      updateData.backgroundArticle = formData.backgroundArticle;
    } else if (editingSection === 'related') {
      updateData.relatedReadingArticles = formData.relatedReadingArticles;
    }
    
    await updateDefaultContentSettings(updateData);
  } catch (error) {
    console.error('儲存失敗:', error);
  }
}, [formData, updateDefaultContentSettings, editingSection, defaultContent]);
```

---

## 🔧 **調試技巧**

### **1. 日誌檢查**
```typescript
console.log('準備儲存的數據:', updateData);
// 檢查是否包含 id, documentId 等字段
```

### **2. 數據結構驗證**
```typescript
const hasInvalidKeys = (obj: any, path = '') => {
  const invalidKeys = ['id', 'documentId', 'createdAt', 'updatedAt', 'publishedAt'];
  
  for (const key in obj) {
    if (invalidKeys.includes(key)) {
      console.warn(`發現無效字段: ${path}.${key}`);
      return true;
    }
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      if (hasInvalidKeys(obj[key], `${path}.${key}`)) {
        return true;
      }
    }
  }
  return false;
};

// 使用前檢查
if (hasInvalidKeys(updateData)) {
  console.error('數據包含無效字段，請檢查');
}
```

### **3. API 請求攔截**
```typescript
// 在發送前檢查請求體
const originalFetch = fetch;
window.fetch = function(...args) {
  const [url, options] = args;
  if (options?.method === 'PUT' && options?.body) {
    try {
      const body = JSON.parse(options.body as string);
      if (hasInvalidKeys(body)) {
        console.error('PUT 請求包含無效字段:', body);
      }
    } catch (e) {
      // 忽略非 JSON 請求
    }
  }
  return originalFetch.apply(this, args);
};
```

---

## 📚 **最佳實踐**

### **1. 數據轉換函數**
```typescript
// 創建專用的數據清理函數
const cleanArticleData = (article: ArticleLink | null | undefined) => {
  if (!article) return { title: '', url: '' };
  return {
    title: article.title || '',
    url: article.url || ''
  };
};

const cleanArticleArray = (articles: ArticleLink[] | null | undefined) => {
  if (!articles || !Array.isArray(articles)) return [];
  return articles.map(cleanArticleData);
};
```

### **2. TypeScript 類型安全**
```typescript
// 定義只包含業務字段的類型
type CleanArticleLink = {
  title: string;
  url: string;
};

type UpdateRequest = {
  contextArticle: CleanArticleLink;
  backgroundArticle: CleanArticleLink;
  relatedReadingArticles: CleanArticleLink[];
  isActive: boolean;
};
```

### **3. API 層統一處理**
```typescript
// 在 Strapi 服務層統一過濾
const cleanDataForUpdate = <T>(data: T): Partial<T> => {
  const cleaned = { ...data };
  const systemFields = ['id', 'documentId', 'createdAt', 'updatedAt', 'publishedAt'];
  
  systemFields.forEach(field => {
    if (field in cleaned) {
      delete (cleaned as any)[field];
    }
  });
  
  return cleaned;
};
```

---

## 🚀 **預防措施**

### **1. 開發階段**
- 使用 TypeScript 嚴格類型檢查
- 設置 ESLint 規則檢查數據結構
- 添加單元測試驗證數據清理

### **2. 生產階段**
- 添加請求前驗證
- 監控 API 錯誤日誌
- 設置錯誤告警

### **3. 代碼審查**
- 檢查所有 PUT/PATCH 請求
- 確認數據來源和清理邏輯
- 驗證表單數據初始化

---

## 📝 **總結**

**核心原則：**
1. **永遠不要** 在 PUT/PATCH 請求中包含系統字段
2. **數據源頭** 就開始過濾，不要依賴後續清理
3. **類型安全** 使用 TypeScript 定義乾淨的數據結構
4. **測試驗證** 確保所有數據路徑都正確清理

**記住：** Strapi 5 的驗證比 Strapi 4 更嚴格，這種錯誤在升級後經常出現。養成良好的數據處理習慣是關鍵。

---

## 📅 **更新日誌**

- **2025-06-11**: 初始版本，記錄預設內容管理的 ID 錯誤修復經驗
- **未來**: 持續補充其他 Strapi 5 相關的故障排除經驗 