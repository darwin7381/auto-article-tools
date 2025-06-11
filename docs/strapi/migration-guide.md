# Strapi 重構操作指南

## 準備工作

### 1. 備份與安全措施

```bash
# 1. 確保 Strapi 正在運行
cd your-strapi-project
npm run develop

# 2. 如果有重要資料，可以備份資料庫
# SQLite 備份（如果使用 SQLite）
cp .tmp/data.db .tmp/data.db.backup

# 或者導出現有資料
# 可以在 Strapi Admin 中手動導出重要資料
```

### 2. 確認現有結構

在開始前，請先在 Strapi Admin 中確認現有的 Content Types：

- `authors` ✅ (保留)
- `article-templates` ❌ (將被刪除)
- `wordpress-setting` ✅ (保留)

## 操作步驟

### 步驟 1: 刪除舊的 Article Templates

1. 打開 Strapi Admin: `http://localhost:1337/admin`
2. 進入 **Content-Type Builder**
3. 找到 `Article Template` 
4. 點擊右側的 **Delete** 按鈕
5. 確認刪除

**⚠️ 注意**: 這會刪除所有現有的 Article Template 資料

### 步驟 2: 建立新的 Content Types

#### 2.1 建立 Header Disclaimer Templates

1. 在 Content-Type Builder 中點擊 **Create new collection type**
2. 設定基本資訊：
   ```
   Display name: Header Disclaimer Templates
   API ID (Singular): header-disclaimer-template
   API ID (Plural): header-disclaimer-templates
   ```
3. 點擊 **Continue**
4. 添加欄位：

**Text 欄位 - name**:
```
Name: name
Type: Text
Description: 系統識別碼，例：sponsored-header
Advanced Settings:
  ✅ Required field
  ✅ Unique field
```

**Text 欄位 - displayName**:
```
Name: displayName
Type: Text
Description: 顯示名稱，例：廣編稿開頭押註
Advanced Settings:
  ✅ Required field
```

**Rich Text 欄位 - template**:
```
Name: template
Type: Rich Text (Markdown)
Description: HTML 模板內容，支援變數替換 ［撰稿方名稱］
Advanced Settings:
  ✅ Required field
```

**Text 欄位 - description**:
```
Name: description
Type: Text
Description: 模板說明
```

**Boolean 欄位 - isSystemDefault**:
```
Name: isSystemDefault
Type: Boolean
Description: 系統預設項目，不可刪除
Default value: false
```

**Boolean 欄位 - isActive**:
```
Name: isActive
Type: Boolean
Description: 是否啟用
Default value: true
```

5. 點擊 **Save** 保存

#### 2.2 建立 Footer Disclaimer Templates

重複上面的步驟，但設定：
```
Display name: Footer Disclaimer Templates
API ID (Singular): footer-disclaimer-template
API ID (Plural): footer-disclaimer-templates
```

欄位結構與 Header Disclaimer Templates 完全相同。

#### 2.3 建立 Article Type Presets

1. 建立新的 Collection Type：
   ```
   Display name: Article Type Presets
   API ID (Singular): article-type-preset
   API ID (Plural): article-type-presets
   ```

2. 添加欄位：

**Text 欄位 - name**:
```
Name: name
Type: Text
Description: 文稿類型顯示名稱，例：我的自訂廣編稿
Advanced Settings:
  ✅ Required field
```

**Text 欄位 - code**:
```
Name: code
Type: Text
Description: 系統識別碼，例：my-sponsored
Advanced Settings:
  ✅ Required field
  ✅ Unique field
```

**Text 欄位 - description**:
```
Name: description
Type: Text
Description: 文稿類型說明
```

**Relation 欄位 - defaultAuthor**:
```
Name: defaultAuthor
Type: Relation
Relation type: Many to One
Target: Author (from Authors)
Description: 預設作者，可為空
```

**Relation 欄位 - headerDisclaimerTemplate**:
```
Name: headerDisclaimerTemplate
Type: Relation
Relation type: Many to One
Target: Header Disclaimer Template (from Header Disclaimer Templates)
Description: 開頭押註模板，可為空
```

**Relation 欄位 - footerDisclaimerTemplate**:
```
Name: footerDisclaimerTemplate
Type: Relation
Relation type: Many to One
Target: Footer Disclaimer Template (from Footer Disclaimer Templates)  
Description: 末尾押註模板，可為空
```

**Boolean 欄位 - requiresAdTemplate**:
```
Name: requiresAdTemplate
Type: Boolean
Description: 是否需要廣告模板
Default value: false
```

**JSON 欄位 - advancedSettings**:
```
Name: advancedSettings
Type: JSON
Description: 其他進階設定的 JSON 資料
```

**Boolean 欄位 - isSystemDefault**:
```
Name: isSystemDefault
Type: Boolean
Description: 系統預設類型，不可刪除
Default value: false
```

**Boolean 欄位 - isActive**:
```
Name: isActive
Type: Boolean
Description: 是否啟用
Default value: true
```

**Number 欄位 - sortOrder**:
```
Name: sortOrder
Type: Number (integer)
Description: 顯示順序
Default value: 0
```

3. 點擊 **Save** 保存

### 步驟 3: 建立種子資料

等所有 Content Types 建立完成後，重新啟動 Strapi：

```bash
# 停止 Strapi (Ctrl+C)
# 重新啟動
npm run develop
```

#### 3.1 建立 Authors 資料

進入 **Content Manager** > **Authors**，建立：

**Author 1**:
```
name: BTEditor
displayName: 廣編頻道（BTEditor）
wordpressId: 1
department: BTEditor
description: 動區廣編頻道專用帳號
isActive: ✅
```

**Author 2**:
```
name: BTVerse
displayName: BT宙域（BTVerse）
wordpressId: 2
department: BTVerse
description: 動區宙域頻道專用帳號
isActive: ✅
```

#### 3.2 建立 Header Disclaimer Templates

進入 **Content Manager** > **Header Disclaimer Templates**，建立：

**Template 1**:
```
name: none
displayName: 無押註
template: (留空)
description: 不顯示開頭押註
isSystemDefault: ✅
isActive: ✅
```

**Template 2**:
```
name: sponsored
displayName: 廣編稿開頭押註
template: <span style="color: #808080;"><em>（本文為廣編稿，由［撰稿方名稱］ 撰文、提供，不代表動區立場，亦非投資建議、購買或出售建議。詳見文末責任警示。）</em></span>
description: 廣編稿專用的開頭免責聲明
isSystemDefault: ✅
isActive: ✅
```

**Template 3**:
```
name: press-release
displayName: 新聞稿開頭押註
template: <span style="color: #808080;"><em>本文為新聞稿，由［撰稿方名稱］ 撰文、提供，不代表動區立場。</em></span>
description: 新聞稿專用的開頭聲明
isSystemDefault: ✅
isActive: ✅
```

#### 3.3 建立 Footer Disclaimer Templates

進入 **Content Manager** > **Footer Disclaimer Templates**，建立：

**Template 1**:
```
name: none
displayName: 無押註
template: (留空)
description: 不顯示末尾押註
isSystemDefault: ✅
isActive: ✅
```

**Template 2**:
```
name: sponsored
displayName: 廣編稿免責聲明
template: <div class="alert alert-warning">（廣編免責聲明：本文內容為供稿者提供之廣宣稿件，供稿者與動區並無任何關係，本文亦不代表動區立場。本文無意提供任何投資、資產建議或法律意見，也不應被視為購買、出售或持有資產的要約。廣宣稿件內容所提及之任何服務、方案或工具等僅供參考，且最終實際內容或規則以供稿方之公布或說明為準，動區不對任何可能存在之風險或損失負責，提醒讀者進行任何決策或行為前務必自行謹慎查核。）</div>
description: 廣編稿專用的詳細免責聲明
isSystemDefault: ✅
isActive: ✅
```

#### 3.4 建立 Article Type Presets

進入 **Content Manager** > **Article Type Presets**，建立：

**Preset 1**:
```
name: 廣編稿
code: sponsored
description: 商業合作內容，包含完整的免責聲明
defaultAuthor: [選擇 BTEditor]
headerDisclaimerTemplate: [選擇 廣編稿開頭押註]
footerDisclaimerTemplate: [選擇 廣編稿免責聲明]
requiresAdTemplate: ✅
advancedSettings: {"dropcapEnabled": true, "relatedArticlesEnabled": true}
isSystemDefault: ✅
isActive: ✅
sortOrder: 1
```

**Preset 2**:
```
name: 新聞稿
code: press-release
description: 企業或機構發佈的官方新聞稿
defaultAuthor: [選擇 BTVerse]
headerDisclaimerTemplate: [選擇 新聞稿開頭押註]
footerDisclaimerTemplate: [選擇 無押註]
requiresAdTemplate: (不勾選)
advancedSettings: {"dropcapEnabled": true, "relatedArticlesEnabled": true}
isSystemDefault: ✅
isActive: ✅
sortOrder: 2
```

## 驗證與測試

### 1. 檢查關聯關係

在 Content Manager 中確認：
- Article Type Presets 能正確顯示關聯的 Authors
- Article Type Presets 能正確顯示關聯的 Disclaimer Templates
- 所有「無」選項都能正常選擇

### 2. API 測試

```bash
# 測試 API 回應
curl http://localhost:1337/api/article-type-presets?populate=*
curl http://localhost:1337/api/header-disclaimer-templates
curl http://localhost:1337/api/footer-disclaimer-templates
```

## 完成

重構完成後，你的 Strapi 應該有以下結構：

```
✅ Authors
✅ Header Disclaimer Templates  
✅ Footer Disclaimer Templates
✅ Article Type Presets
✅ WordPress Settings
```

現在可以開始更新前端 Config Panel 來使用新的結構了！ 