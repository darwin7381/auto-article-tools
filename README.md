This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

開發規劃（must to read first）：planning.md

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## API 架構

本系統採用模組化API架構，將處理流程分為多個獨立的階段：

```
前端 ──> /api/upload ───────────────────┐
                                        │
                                        v
                                 上傳完成，返回fileUrl
                                        │
                                        v
前端 ──> /api/extract-content ──────────┐
         │                              │
         │                              v
         │                        返回提取的內容結果
         │                              │
         v                              v
    ┌────────────────┐           前端更新提取階段進度
    │ 根據文件類型選擇 │              │
    └────────────────┘              │
         │                          v
         ├──> /api/processors/process-pdf  ──> 如需轉換為DOCX
         │          │                               │
         │          │                               v
         │          └──────────> /api/processors/process-docx
         │                                          │
         └──> /api/processors/process-docx <────────┘
                                                    │
                                                    v
前端 <────────────────────────── 返回提取結果（文本+圖片）
                                                    │
                                                    v
前端 ──> /api/process-openai ──────────────> 處理提取內容
                                                    │
                                                    v
前端 <────────────────────────── 返回AI處理後的內容
                                                    │
                                                    v
前端 ──> /api/save-markdown ───────────────> 保存最終結果
```

### API端點說明

#### 協調器API
- `/api/extract-content` - 統一內容提取入口，根據文件類型調用相應處理器

#### 處理器API
- `/api/processors/process-pdf` - 專門處理PDF轉換為DOCX
- `/api/processors/process-docx` - 專門處理DOCX內容提取

#### AI處理API
- `/api/process-openai` - 處理內容增強，包括語言檢測、翻譯等AI相關任務

#### 儲存API
- `/api/save-markdown` - 保存處理結果

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## 環境變數設置

本項目需要配置以下環境變數才能正常運行，請在項目根目錄創建`.env.local`文件並添加：

```bash
# Cloudflare R2 配置
CLOUDFLARE_R2_ENDPOINT="https://xxxxxxxxxxxx.r2.cloudflarestorage.com"
CLOUDFLARE_R2_ACCESS_KEY_ID="您的訪問密鑰"
CLOUDFLARE_R2_SECRET_ACCESS_KEY="您的密鑰"
CLOUDFLARE_R2_BUCKET_NAME="auto-article-tools"

# ConvertAPI 配置
CONVERT_API_SECRET="您的ConvertAPI密鑰"
CONVERT_API_ENV="試用/正式"

# 其他配置
NEXT_PUBLIC_APP_URL="您的應用URL"
```

請在Cloudflare R2控制台和ConvertAPI獲取相應的配置信息。

## 文件處理流程

本項目支持處理PDF和DOCX格式的文件，並將其轉換為Markdown格式以便後續處理。

### 文件上傳流程

1. 用戶通過前端界面上傳文件
2. 系統將文件上傳至Cloudflare R2存儲
3. 根據文件類型，系統會調用不同的處理API

### DOCX文件處理

DOCX文件處理流程如下：

1. 系統通過`mammoth.js`庫將DOCX轉換為HTML
2. 處理HTML中的圖片，並將其上傳至R2存儲
3. 將HTML轉換為Markdown格式，保留原文格式和圖片引用
4. 將處理後的Markdown存儲到R2和本地

### PDF文件處理

PDF文件處理流程如下：

1. 系統使用ConvertAPI服務將PDF轉換為DOCX格式
2. 創建臨時文件以存儲轉換後的DOCX
3. 將轉換後的DOCX上傳至R2存儲
4. 調用DOCX處理API完成後續處理
5. 清理臨時文件

### 注意事項

- PDF轉換依賴於外部ConvertAPI服務，需要配置相應密鑰
- 文件名會被處理成安全格式，並添加時間戳和隨機字符串確保唯一性
- 圖片會被單獨提取並上傳，在Markdown中通過URL引用
- 處理大文件可能需要更長時間，請耐心等待

# 文件處理與WordPress發布系統

自動處理 DOCX/PDF 文件並發布到 WordPress 的集成工具。

## 功能特點

- 支持上傳 DOCX 和 PDF 文件
- 自動提取文本內容和圖片
- 使用 OpenAI 增強內容品質
- 輸出標準化的 Markdown 格式
- 一鍵發布到 WordPress 網站
- 支持從URL直接上傳特色圖片
- 提供半自動與全自動處理流程選項

## 技術架構

### 前端

- Next.js 15 前端框架
- TailwindCSS 樣式
- Heroui UI 組件
- TipTap編輯器

### 後端

- Next.js API 路由
- Cloudflare R2 存儲
- OpenAI API 內容增強
- WordPress REST API 集成

### 服務層設計

本項目採用服務層(Service Layer)設計模式，將功能模塊化:

```
src/
├── services/
│   ├── storage/         # 存儲服務
│   │   ├── r2Service.ts     # R2雲存儲操作
│   │   └── localService.ts  # 本地文件操作
│   ├── document/        # 文檔處理服務
│   │   └── markdownService.ts  # Markdown處理
│   ├── conversion/      # 文件轉換服務
│   │   ├── docxService.ts      # DOCX處理
│   │   └── pdfService.ts       # PDF處理
│   ├── wordpress/       # WordPress集成服務
│   │   ├── wordpressService.ts      # 客戶端WordPress服務
│   │   └── serverWordpressService.ts # 服務器端WordPress服務
│   └── utils/           # 工具服務
│       └── openaiService.ts    # OpenAI處理
```

#### 主要服務模塊:

- **存儲服務**: 處理文件的上傳、下載和存儲
- **文檔服務**: 處理Markdown的創建和格式化
- **轉換服務**: 處理文件格式轉換(PDF→DOCX→Markdown)
- **WordPress服務**: 處理WordPress發布和媒體上傳
- **工具服務**: 提供OpenAI內容增強等功能

## 安裝與設置

1. 克隆儲存庫
2. 安裝依賴: `npm install`
3. 設置環境變量(.env.local):
   ```
   # OpenAI和存儲配置
   OPENAI_API_KEY=your_api_key
   CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key
   CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_key
   CLOUDFLARE_R2_ENDPOINT=your_endpoint
   CLOUDFLARE_R2_BUCKET_NAME=your_bucket_name
   R2_PUBLIC_URL=your_public_url
   
   # WordPress配置
   NEXT_PUBLIC_WORDPRESS_API_URL=your_wordpress_url
   WORDPRESS_API_USER=your_wordpress_username
   WORDPRESS_API_PASSWORD=your_wordpress_password
   ```
4. 啟動開發服務器: `npm run dev`

## 使用方法

1. 訪問應用網址
2. 上傳DOCX或PDF文件
3. 等待處理完成
4. 預覽生成的內容
5. 設置WordPress發布選項（標題、分類、特色圖片等）
6. 點擊發布按鈕將內容發送到WordPress

## WordPress集成

系統提供了完整的WordPress集成功能：

- **安全的服務端代理**: 所有WordPress API調用通過服務端代理執行
- **特色圖片處理**: 支持從URL上傳特色圖片到WordPress媒體庫
- **自定義發布選項**: 支持設置標題、分類、標籤、作者ID等
- **混合式自動化**: 提供半自動和全自動處理流程選項

### 文檔

詳細的集成文檔可在以下位置找到：
- `docs/wordpress-integration-guide.md`: WordPress集成完整指南
- `docs/wordpress-integration-roadmap.md`: WordPress集成路線圖和規劃
- `docs/test-scripts.md`: WordPress API測試腳本使用說明

## 開發指南

查看 planning.md 獲取詳細的開發規劃和說明。
