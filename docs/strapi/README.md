# Strapi 5 集成文件

本資料夾包含所有與 Strapi 5 CMS 集成相關的文件和指南。

---

## 📚 **文件索引**

### **🏗️ 設置與配置**
- **[架構配置指南](./migration-guide.md)** - 當前 Strapi 5 架構的完整配置指南
- **[Default Content Settings 設置指南](./default-content-settings-setup.md)** - 預設內容設定的完整設置流程
- **[架構設計文件](./new-schema-design.md)** - 當前架構設計和技術文件  
- **[種子資料](./seed-data.md)** - 預設數據和初始化資料設置

### **🚨 故障排除**
- **[Strapi 5 \"Invalid Key ID\" 錯誤故障排除指南](./troubleshooting-invalid-id-errors.md)** - 解決 PUT/PATCH 請求 ID 錯誤的詳細指南

---

## 🚀 **快速開始**

### **1. 基本設置**
如果您是第一次設置 Strapi 集成：
1. 按照 [架構配置指南](./migration-guide.md) 了解當前架構
2. 參考 [Default Content Settings 設置指南](./default-content-settings-setup.md) 配置預設內容管理
3. 使用 [種子資料](./seed-data.md) 設置初始數據
4. 如有問題請查閱 [故障排除指南](./troubleshooting-invalid-id-errors.md)

### **2. 常見問題**
**遇到 \"invalid key id\" 錯誤？**
→ 查看 [故障排除指南](./troubleshooting-invalid-id-errors.md)

**需要了解架構設計？**
→ 參考 [架構設計文件](./new-schema-design.md)

**需要設置預設內容？**
→ 查看 [Default Content Settings 設置指南](./default-content-settings-setup.md)

---

## 🎯 **當前架構概述**

### **核心內容類型**
- ✅ **Authors** - 作者管理
- ✅ **Header Disclaimer Templates** - 開頭押註模板
- ✅ **Footer Disclaimer Templates** - 末尾押註模板
- ✅ **Article Type Presets** - 文稿類型預設配置
- ✅ **Default Content Settings** - 預設內容管理（前情提要、背景補充、相關閱讀）

### **組件系統**
- ✅ **Article Link Component** - 文章連結組件

### **功能特色**
- 🔗 **組合式配置**：基礎元件靈活組合
- 🛡️ **數據完整性**：系統預設保護機制
- 🔄 **關聯管理**：鬆耦合的關聯關係
- ⚡ **高效擴展**：支援未來功能擴展

---

## 📊 **API 端點**

### **核心 API**
```bash
# 基礎元件
GET /api/authors
GET /api/header-disclaimer-templates
GET /api/footer-disclaimer-templates

# 組合配置
GET /api/article-type-presets?populate=*

# 預設內容管理
GET /api/default-content-setting?populate=*
```

### **常用操作**
```bash
# 更新預設內容
PUT /api/default-content-setting

# 創建文稿類型預設
POST /api/article-type-presets
```

---

## 🔧 **開發者檢查清單**

### **設置完成檢查**
- [ ] 所有內容類型已創建並正常運行
- [ ] 種子資料已設置並發布
- [ ] API 端點正常響應
- [ ] 前端 Config Panel 正常運作
- [ ] 預設內容管理功能正常

### **維護檢查**
- [ ] 定期備份數據
- [ ] 監控 API 性能
- [ ] 檢查關聯關係完整性
- [ ] 更新文件當有架構變更時

---

## 🚨 **重要注意事項**

1. **Strapi 5 特性**：充分利用 Single Type、Components、Relations 等特性
2. **數據過濾**：確保所有 PUT/PATCH 請求不包含系統字段
3. **關聯查詢**：使用 `?populate=*` 載入完整數據
4. **系統穩定性**：保護標記為 `isSystemDefault: true` 的核心配置
5. **擴展性**：新功能開發時參考現有架構模式

---

## 📝 **更新歷史**

**最新更新 (2024)：**
- ✅ 移除過時的 WordPress Settings 配置
- ✅ 實現 Default Content Settings 預設內容管理
- ✅ 建立完整的 "Invalid Key ID" 故障排除體系
- ✅ 更新所有文件以反映當前架構狀態
- ✅ 統一文件格式和索引結構

**系統當前狀態：完全部署並穩定運行**

---

## 🛠️ **開發工具**

### **API 測試**
```bash
# 測試預設內容設定 API
curl -X GET "http://localhost:1337/api/default-content-setting?populate=*"

# 更新預設內容（注意：不包含 ID 字段）
curl -X PUT "http://localhost:1337/api/default-content-setting" \
  -H "Content-Type: application/json" \
  -d '{"data": {"contextArticle": {"title": "新標題", "url": "https://example.com"}}}'
```

### **調試技巧**
```typescript
// 檢查數據是否包含無效字段
const hasInvalidKeys = (obj: any) => {
  const invalidKeys = ['id', 'documentId', 'createdAt', 'updatedAt', 'publishedAt'];
  return Object.keys(obj).some(key => invalidKeys.includes(key));
};

console.log('數據檢查:', hasInvalidKeys(updateData));
```

---

## 📋 **檢查清單**

### **設置完成檢查**
- [ ] Article Link Component 已創建
- [ ] Default Content Settings Single Type 已創建
- [ ] 預設資料已設置並發布
- [ ] API 端點正常回應
- [ ] 前端可以正常讀取和更新數據

### **代碼審查檢查**
- [ ] 所有 PUT/PATCH 請求都過濾了系統字段
- [ ] 表單初始化正確處理 API 數據
- [ ] 錯誤處理適當且用戶友好
- [ ] TypeScript 類型定義正確

---

## 🔗 **相關資源**

### **官方文件**
- [Strapi 5 Documentation](https://docs.strapi.io/developer-docs/latest/)
- [Strapi 5 API Reference](https://docs.strapi.io/developer-docs/latest/developer-resources/database-apis-reference/)

### **社群資源**
- [Strapi Community Forum](https://forum.strapi.io/)
- [Strapi GitHub](https://github.com/strapi/strapi)

---

## 🆘 **需要幫助？**

1. **查看文件**: 先檢查本資料夾中的相關指南
2. **檢查日誌**: 查看 Strapi 和前端的控制台輸出
3. **驗證數據**: 使用提供的調試工具檢查數據結構
4. **尋求協助**: 將錯誤信息和相關代碼提供給團隊

**記住**: Strapi 5 比 Strapi 4 有更嚴格的驗證，大多數問題都與數據格式相關。 