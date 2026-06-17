"""具名設定版本管理（prompt 組合 / 押註組合）—— 命名儲存、切換生效、刪除、回溯。"""

from __future__ import annotations

import json

from sqlmodel import select

from app.models import ConfigVersion, get_session


def list_versions(scope: str) -> list[dict]:
    with get_session() as s:
        rows = s.exec(
            select(ConfigVersion).where(ConfigVersion.scope == scope).order_by(
                ConfigVersion.created_at.desc()  # type: ignore[attr-defined]
            )
        ).all()
        return [
            {"id": r.id, "name": r.name, "is_active": r.is_active,
             "data": json.loads(r.data_json), "created_at": r.created_at}
            for r in rows
        ]


def active_version(scope: str) -> dict | None:
    """回傳目前生效版本的 {id, name, data}；無則 None。"""
    with get_session() as s:
        r = s.exec(
            select(ConfigVersion).where(
                ConfigVersion.scope == scope, ConfigVersion.is_active == True  # noqa: E712
            )
        ).first()
        return {"id": r.id, "name": r.name, "data": json.loads(r.data_json)} if r else None


def create_version(scope: str, name: str, data: dict) -> dict:
    """新增具名版本並設為生效（其餘設為非生效）。"""
    with get_session() as s:
        for r in s.exec(select(ConfigVersion).where(ConfigVersion.scope == scope)).all():
            if r.is_active:
                r.is_active = False
                s.add(r)
        v = ConfigVersion(scope=scope, name=name, data_json=json.dumps(data, ensure_ascii=False),
                          is_active=True)
        s.add(v)
        s.commit()
        s.refresh(v)
        return {"id": v.id, "name": v.name, "is_active": True}


def activate(scope: str, version_id: int) -> bool:
    with get_session() as s:
        target = s.get(ConfigVersion, version_id)
        if target is None or target.scope != scope:
            return False
        for r in s.exec(select(ConfigVersion).where(ConfigVersion.scope == scope)).all():
            r.is_active = (r.id == version_id)
            s.add(r)
        s.commit()
        return True


def delete_version(scope: str, version_id: int) -> bool:
    with get_session() as s:
        r = s.get(ConfigVersion, version_id)
        if r is None or r.scope != scope:
            return False
        was_active = r.is_active
        s.delete(r)
        s.commit()
        # 刪掉的是生效版 → 自動把最新一個設為生效（避免沒有任何生效版）
        if was_active:
            latest = s.exec(
                select(ConfigVersion).where(ConfigVersion.scope == scope).order_by(
                    ConfigVersion.created_at.desc()  # type: ignore[attr-defined]
                )
            ).first()
            if latest:
                latest.is_active = True
                s.add(latest)
                s.commit()
        return True
