"""設定版本管理 API（prompt 組合 / 押註組合）—— 具名儲存、列出、切換生效、刪除。

scope 例：`agent:contentAgent`、`disclaimer`。
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services import versions

router = APIRouter(prefix="/versions", tags=["versions"])


class CreateVersion(BaseModel):
    name: str
    data: dict[str, Any]


@router.get("/{scope}")
async def list_for_scope(scope: str) -> dict:
    vs = versions.list_versions(scope)
    active = next((v for v in vs if v["is_active"]), None)
    return {"scope": scope, "active_id": active["id"] if active else None, "versions": vs}


@router.post("/{scope}")
async def create(scope: str, body: CreateVersion) -> dict:
    if not body.name.strip():
        raise HTTPException(400, "版本名稱不可為空")
    return versions.create_version(scope, body.name.strip(), body.data)


@router.post("/{scope}/{version_id}/activate")
async def activate(scope: str, version_id: int) -> dict:
    if not versions.activate(scope, version_id):
        raise HTTPException(404, "找不到該版本")
    return {"ok": True, "active_id": version_id}


@router.delete("/{scope}/{version_id}")
async def delete(scope: str, version_id: int) -> dict:
    if not versions.delete_version(scope, version_id):
        raise HTTPException(404, "找不到該版本")
    return {"ok": True}
