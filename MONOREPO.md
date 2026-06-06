# Monorepo 結構 — auto-article-tools → BD 內容自動化平台

這個 repo 同時容納「正在服役的舊系統」與「新平台」，用 strangler 漸進切換。

```
auto-article-tools/
├── src/, next.config.ts, ...   ← legacy：現有 Next.js 全端工具，BD 繼續用，原地不動
│                                  只修關鍵 bug；新平台逐條工作流接管後再退役
├── backend/                    ← 新平台後端：Python / FastAPI（見 backend/README.md）
├── frontend/                   ← 新平台前端：Vite + React SPA（見 frontend/README.md）
├── shared/                     ← 跨語言型別合約：OpenAPI → 前端 client（見 shared/README.md）
└── config-backup-2026-06-05/   ← 設定資產備份（R2 prompt + Strapi）
```

## 工具鏈隔離（為什麼不打架）

- root `tsconfig.json` 的 `exclude` 已加 `frontend`、`backend`，Next 的 TS 不會掃到新資料夾
- `frontend/` 是**獨立** Node 專案（自己的 package.json，**不是** root 的 npm workspace）
- `backend/` 是 Python（uv 管 venv），對 Node 工具鏈完全隱形
- `.gitignore` 已涵蓋 `backend/.venv`、`backend/data/*.db`、`frontend/dist` 等
- **單一 git repo**：backend/frontend 是普通追蹤資料夾，切勿在裡面 `git init`

## 本地開發

```bash
# 後端
cd backend && uv sync && uv run uvicorn app.main:app --reload --port 8000

# 前端（另一個 terminal）
cd frontend && pnpm install && pnpm dev      # http://localhost:5173
```

## 計劃文件

完整重寫計劃（HedgeDoc，可編輯）：<https://md.blocktempo.ai/5m1xSHAuSRe3K9LTLsSWNA>
