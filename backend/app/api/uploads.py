"""檔案上傳 —— 瀏覽器上傳稿件（PDF/DOCX/MD），存到 data/uploads/，回傳本機路徑供 workflow 使用。"""

from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile

from app.settings import settings

router = APIRouter(prefix="/uploads", tags=["uploads"])

_ALLOWED = {".pdf", ".docx", ".md", ".txt", ".html", ".htm", ".rtf"}


@router.post("")
async def upload(file: UploadFile) -> dict:
    ext = Path(file.filename or "").suffix.lower()
    if ext not in _ALLOWED:
        raise HTTPException(400, f"不支援的檔案類型 {ext}；允許：{sorted(_ALLOWED)}")
    up_dir = Path(settings.data_dir) / "uploads"
    up_dir.mkdir(parents=True, exist_ok=True)
    dest = up_dir / f"{uuid.uuid4().hex}{ext}"
    dest.write_bytes(await file.read())
    return {"file": str(dest), "original_name": file.filename, "size": dest.stat().st_size}
