# shared — 跨 Python/TS 的型別合約

後端 FastAPI 自動產生 OpenAPI schema，前端據此取得型別安全的 client。
Python model 改了、前端型別跟著變——即使跨語言，邊界仍型別安全。

## 產物

- `openapi.json` — 從後端匯出的 OpenAPI 3.1 spec（單一真相，含 16 endpoints）。

重新產生（後端 API 改動後跑）：

```bash
cd backend
uv run python -c "import json, app.workflows; from app.main import app; json.dump(app.openapi(), open('../shared/openapi.json','w'), ensure_ascii=False, indent=2)"
```

## 生成前端 TS client（選用）

目前 `frontend/src/api.ts` 是手寫的型別化 client（夠用、零依賴）。要改用自動產生：

```bash
cd frontend
pnpm dlx openapi-typescript ../shared/openapi.json -o src/generated/api-types.ts
```

之後 `api.ts` 可改 import `api-types.ts` 的 `paths`/`components` 型別。
