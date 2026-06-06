# backend — BD 內容自動化平台（Python / FastAPI）

## 起步棧

FastAPI + pydantic + SQLModel(SQLite) + sse-starlette。**起步不要 Redis / Celery / Postgres**，規模到了再加（見根目錄計劃）。

## 結構

```
app/
├── main.py            # FastAPI app（health + workflows router）
├── settings.py        # pydantic-settings 讀 env / .env
├── api/               # HTTP adapter：health、workflows（SSE）
├── core/              # 領域核心
│   ├── stage.py       #   Stage（async 純函式）+ RunContext
│   ├── registry.py    #   Workflow registry（加流程=加定義）
│   └── events.py      #   進度事件模型
├── workflows/         # 各條稿件工作流定義（example.py = 示範）
├── models/job.py      # SQLModel Job（job 狀態存 DB）
└── worker/runner.py   # run_workflow：單一編排入口，API/CLI 共用
cli.py                 # CLI 入口（import 同一個 runner）
data/                  # SQLite（gitignored）
```

## 跑起來

```bash
cd backend
uv sync                      # 建 venv、裝相依（uv 會自動抓相容的 Python>=3.12）
uv run uvicorn app.main:app --reload --port 8000
```

- 健康檢查： <http://localhost:8000/health>
- 互動式 API 文件： <http://localhost:8000/docs>

CLI（與 API 同一個 runner）：

```bash
uv run python cli.py --list
uv run python cli.py echo --input '{"text": "hello world"}'
```

## 設計重點

- **單一編排入口**：`worker/runner.py::run_workflow` 是流程唯一真相，API(SSE)、CLI、之後的排程都呼叫它。
- **工作流是資料**：加一條 BD 新流程 = 在 `workflows/` 加一個檔、`register()` 一下，不動既有程式。
- **stage 可獨立測試**：每個 stage 是 async 純函式，輸入輸出之後用 pydantic 驗證（殺掉 LLM 壞輸出 bug 類）。
- **並行**：IO-bound，單一 process 用 asyncio 即可同時跑多條（之後加 semaphore 控上限）。
