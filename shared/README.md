# shared — 跨 Python/TS 的型別合約

後端 FastAPI 會自動產生 OpenAPI schema。前端從這份 schema 生成型別安全的 API client，
這樣 Python model 改了、前端型別跟著變——即使跨語言，邊界仍型別安全。

## 流程（之後接上）

```bash
# 1. 從跑著的後端匯出 openapi.json
curl http://localhost:8000/openapi.json > shared/openapi.json

# 2. 生成前端 TS client（擇一工具）
pnpm dlx openapi-typescript shared/openapi.json -o frontend/src/generated/api-types.ts
# 或 orval / openapi-typescript-codegen
```

骨架階段先放這份說明；接第一條真實 workflow 時再把 codegen 接進 CI / 開發流程。
