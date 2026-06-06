from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """從環境變數 / .env 讀設定（欄位名大小寫不敏感：database_url ← DATABASE_URL）。"""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "BD Content Platform"
    database_url: str = "sqlite:///./data/app.db"
    max_concurrent_jobs: int = 20

    # 之後接外部服務時用（先留空預設）
    openai_api_key: str = ""
    openrouter_api_key: str = ""
    r2_endpoint: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket: str = "blocktempo-ai"


settings = Settings()
