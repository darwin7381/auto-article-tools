"""發布 API —— 把 job 結果（WordPress 參數 + 封面圖）發到 WordPress。

支援人工審稿：前端可帶 `overrides`（編輯後的 title/content/excerpt…）覆蓋 job 原始結果再發。
WP 為測試站，直接發布（status 預設 publish）。
"""

from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.models import Job, get_session
from app.services.wordpress import publish_post

router = APIRouter(prefix="/publish", tags=["publish"])


class PublishRequest(BaseModel):
    job_id: int
    status: str = "publish"  # 測試站，預設直接發布
    overrides: dict[str, Any] | None = None  # 人工審稿後的 title/content/excerpt… 覆蓋


@router.post("")
async def publish(body: PublishRequest) -> dict:
    if body.status not in ("draft", "pending", "publish"):
        raise HTTPException(400, "status 需為 draft / pending / publish")
    with get_session() as s:
        job = s.get(Job, body.job_id)
        if job is None:
            raise HTTPException(404, f"找不到 job: {body.job_id}")
        if not job.result_json:
            raise HTTPException(400, "此 job 尚無結果可發布")
        result = json.loads(job.result_json)

    wp = dict(result.get("wordpress") or {})
    if not wp:
        raise HTTPException(400, "job 結果不含 wordpress 參數（需跑過 copy_editing 階段）")
    if body.overrides:  # 套用人工審稿編輯（TipTap 編完的 content/title…）
        wp.update({k: v for k, v in body.overrides.items() if v is not None})

    try:
        out = await publish_post(
            wp,
            status=body.status,
            cover_image_path=result.get("cover_image"),
            cover_image_url=result.get("cover_image_url"),
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(502, f"WordPress 發布失敗：{exc}")
    return out
