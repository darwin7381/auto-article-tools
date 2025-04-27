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
