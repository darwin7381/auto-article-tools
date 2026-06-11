"""WordPress 發布 —— WP REST API（Application Password / Basic Auth）。

⚠️ 對外動作。預設 status="draft"（建草稿，不直接公開）。真正 publish 需明確指定。
復刻舊系統 publish + upload-image-from-url。
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import httpx

from app.settings import settings


def _auth() -> tuple[str, str]:
    if not (settings.wordpress_api_url and settings.wordpress_api_user and settings.wordpress_api_password):
        raise RuntimeError("WordPress 憑證未設定（檢查 backend/.env 的 WORDPRESS_API_*）")
    return settings.wordpress_api_user, settings.wordpress_api_password


def _base() -> str:
    return settings.wordpress_api_url.rstrip("/") + "/wp-json/wp/v2"


_MIME = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp"}


async def _upload_media_from_path(client: httpx.AsyncClient, path: str, title: str) -> int:
    data = Path(path).read_bytes()
    filename = Path(path).name
    resp = await client.post(
        f"{_base()}/media",
        auth=_auth(),
        content=data,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": _MIME.get(Path(path).suffix.lower(), "image/png"),
        },
    )
    resp.raise_for_status()
    return resp.json()["id"]


async def _upload_media_from_url(client: httpx.AsyncClient, url: str) -> int:
    got = await client.get(url)
    got.raise_for_status()
    filename = url.split("/")[-1] or "cover.png"
    resp = await client.post(
        f"{_base()}/media",
        auth=_auth(),
        content=got.content,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": got.headers.get("content-type", "image/png"),
        },
    )
    resp.raise_for_status()
    return resp.json()["id"]


async def publish_post(
    wp: dict[str, Any],
    status: str = "draft",
    cover_image_path: str | None = None,
    cover_image_url: str | None = None,
) -> dict:
    """建立 WordPress 文章（預設草稿）。回傳 {id, link, status}。

    wp: 來自 copy_editing 的 WordPressParams（title/content/excerpt/slug/categories/tags）。
    """
    async with httpx.AsyncClient(timeout=120) as client:
        featured_media = None
        try:
            if cover_image_path and Path(cover_image_path).exists():
                featured_media = await _upload_media_from_path(
                    client, cover_image_path, wp.get("title", "cover")
                )
            elif cover_image_url:
                featured_media = await _upload_media_from_url(client, cover_image_url)
        except Exception as exc:  # noqa: BLE001  封面上傳失敗不擋發稿
            featured_media = None
            wp = {**wp, "_featured_media_error": str(exc)}

        payload: dict[str, Any] = {
            "title": wp.get("title", ""),
            "content": wp.get("content", ""),
            "excerpt": wp.get("excerpt", ""),
            "slug": wp.get("slug", ""),
            "status": status,  # draft / pending / publish / private / future
        }
        if wp.get("categories"):
            payload["categories"] = [c.get("id") for c in wp["categories"] if c.get("id")]
        if wp.get("tags"):
            payload["tags"] = [t.get("id") for t in wp["tags"] if t.get("id")]
        if wp.get("author"):  # 指定作者 ID（不填用 API 登入者）
            payload["author"] = wp["author"]
        if status == "future" and wp.get("date"):  # 定時發布
            payload["date"] = wp["date"]
        if featured_media:
            payload["featured_media"] = featured_media

        resp = await client.post(f"{_base()}/posts", auth=_auth(), json=payload)
        resp.raise_for_status()
        data = resp.json()
        return {
            "id": data.get("id"),
            "link": data.get("link"),
            "status": data.get("status"),
            "featured_media": featured_media,
        }
