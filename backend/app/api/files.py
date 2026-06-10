"""檔案代理 —— 對外送出本地存的圖片/輸出（封面圖、final_html viewer）。

當沒用 R2 時，storage 產生的公開 URL 指向這裡。
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, HTMLResponse

from app.services.storage import local_image_path, local_output_path

router = APIRouter(prefix="/files", tags=["files"])


def _safe(name: str) -> None:
    if "/" in name or "\\" in name or ".." in name:
        raise HTTPException(400, "非法檔名")


@router.get("/images/{name}")
async def get_image(name: str):
    _safe(name)
    p = local_image_path(name)
    if not p.exists():
        raise HTTPException(404, "圖片不存在")
    return FileResponse(p, media_type="image/png")


@router.get("/output/{name}")
async def get_output(name: str):
    _safe(name)
    p = local_output_path(name)
    if not p.exists():
        raise HTTPException(404, "輸出不存在")
    return HTMLResponse(p.read_text(encoding="utf-8"))
