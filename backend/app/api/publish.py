"""發布 API —— 把 job 結果（WordPress 參數 + 封面圖）發到 WordPress。

⚠️ 對外動作。預設 status="draft"（建草稿）。要真正公開上線需明確帶 status="publish"。
"""

from __future__ import annotations

import json

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.models import Job, get_session
from app.services.wordpress import publish_post

router = APIRouter(prefix="/publish", tags=["publish"])


class PublishRequest(BaseModel):
    job_id: int
    status: str = "draft"  # draft / pending / publish


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

    wp = result.get("wordpress")
    if not wp:
        raise HTTPException(400, "job 結果不含 wordpress 參數（需跑過 copy_editing 階段）")

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
