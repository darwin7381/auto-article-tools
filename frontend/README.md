# frontend — BD 內容平台操作 console（Vite + React SPA）

純展示客戶端：所有邏輯/狀態在 Python 後端 + DB，前端只透過 Job API + SSE 講話。

## 跑起來

```bash
cd frontend
pnpm install
pnpm dev          # http://localhost:5173
```

需要後端在 <http://localhost:8000>（見 `../backend/README.md`）。
API 位址可用 `.env.local` 的 `VITE_API_BASE` 覆寫（範例見 `.env.local.example`）。

## 現在有什麼

- `src/api.ts` — `getHealth()` + `runWorkflow()`（fetch + ReadableStream 解析 SSE）
- `src/App.tsx` — 最小 console：顯示後端健康狀態 + 試跑 echo workflow、即時顯示 SSE 進度

## 之後

- 用 FastAPI 的 OpenAPI schema 自動生成型別安全的 API client（見 `../shared/`）
- 沿用舊 repo 的 TipTap 編輯器元件
- config 驅動表單：依後端 workflow 的 input schema 自動長出操作畫面
