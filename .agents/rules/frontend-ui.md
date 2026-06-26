# Frontend UI quality rules (workspace)

Stack: Vite + React 19 + TS SPA in `frontend/`. zh-Hant dashboard "BD 內容自動化平台".
Design system lives in `frontend/src/styles.css` (CSS vars for dark + light in `:root` / `:root.light`).

## Quality bar (non-negotiable)
- Top-tier dashboard aesthetics (Linear / Vercel / Notion grade). No generic/AI-slop look.
- Especially: the **left sidebar** and the **建構進度 (Status) pages** (`src/Status.tsx`).
- Both **dark AND light** themes must look great.

## Verification loop (run after every change set; iterate until green)
- `cd frontend && pnpm build`  → must pass (tsc + vite, 0 errors).
- `cd frontend && pnpm test -- --run`  → all 43 tests must pass.

## Hard constraints — DO NOT break (tests depend on them)
- Keep class names/hooks: `.shell`,`.shell.collapsed`,`.sidebar`,`.nav-item`,`.nav-group`,`.nav-children`,`.nav-child`,`.side-toggle`,`.status-page`,`.stat-cards`,`.panel`,`.docs-layout`,`.docs-toc`,`.doc-sec`,`.code-block`,`.code-copy`,`.task-card`,`.tc-type`,`.dlv-table` (+ `thead th`),`.view-seg`,`.filter-bar`,`.board-wrap`.
- Keep collapse button `title="收合側邊欄"` + `aria-label="收合側邊欄"`.
- Keep exact texts: `內容自動化`,`處理稿件`,`建構進度`,`本頁目錄`,`新增稿件`, placeholder `稿件標題`, button `建立稿件`, `A · 廣編/快訊/新聞`; doc h2 `REST API` and `CLI 用法`; StatusBoard `📋 Delivery 跨部門業務線看板` and `🧪 看板與協作測試`.
- Topbar `<h1>` renders the section label. Board card item-type in `.task-card .tc-type`.
- Only edit files under `frontend/src/`. Do NOT touch `frontend/src/__tests__/`, routing logic, or backend.
- TypeScript strict (noUnusedLocals) — no unused vars/imports.
