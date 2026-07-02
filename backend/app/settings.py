from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """從環境變數 / .env 讀設定（欄位名大小寫不敏感：database_url ← DATABASE_URL）。"""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "BD Content Platform"
    database_url: str = "sqlite:///./data/app.db"
    max_concurrent_jobs: int = 20
    data_dir: str = "./data"
    # 對外可達的後端 base（用於組圖片代理 URL；前端/WordPress 需能連到）
    public_base_url: str = "http://localhost:8000"

    # LLM / 影像
    openai_api_key: str = ""
    openrouter_api_key: str = ""

    # 物件儲存（R2，選用；沒設就用本地 data/ 檔案系統）
    r2_endpoint: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket: str = "blocktempo-ai"
    r2_public_base: str = ""  # R2 公開讀的 base URL（有設才用 R2，否則走本地代理）

    # WordPress 發布（對外動作；預設建草稿）
    wordpress_api_url: str = ""  # e.g. https://wp.blocktempo.ai
    wordpress_api_user: str = ""
    wordpress_api_password: str = ""


    # URL 進稿 fallback（Firecrawl，選用）
    firecrawl_api_key: str = ""

    # 通知通道（Telegram，選用；沒設 = 只寫 DB 通知 log 不外送）
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""      # 部門群 / 頻道 chat id

    # 排程心跳引擎（催稿 / 預警 / 排程發佈提醒 / 晨報）
    scheduler_enabled: bool = True
    scheduler_interval_seconds: int = 60
    digest_hour_local: int = 9      # 每日晨報整點（Asia/Taipei）
    timezone_offset_hours: int = 8  # 業務時區 UTC+8


settings = Settings()
