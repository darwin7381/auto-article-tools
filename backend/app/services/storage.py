"""輸出儲存 —— 圖片/檔案落地，回傳可公開存取的 URL。

預設走本地檔案系統（data/）+ 後端 /files 代理；若設了 R2 憑證則改存 R2。
這抽象讓 workflow 不必管儲存在哪。
"""

from __future__ import annotations

import uuid
from pathlib import Path

from app.settings import settings

_IMAGES = "images"
_OUTPUT = "output"


def _data_path(*parts: str) -> Path:
    p = Path(settings.data_dir).joinpath(*parts)
    p.parent.mkdir(parents=True, exist_ok=True)
    return p


def _r2_enabled() -> bool:
    return bool(settings.r2_endpoint and settings.r2_access_key_id and settings.r2_public_base)


def _r2_put(key: str, data: bytes, content_type: str) -> str:
    import boto3

    client = boto3.client(
        "s3",
        endpoint_url=settings.r2_endpoint,
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
    )
    client.put_object(Bucket=settings.r2_bucket, Key=key, Body=data, ContentType=content_type)
    return f"{settings.r2_public_base.rstrip('/')}/{key}"


def save_image(data: bytes, ext: str = "png") -> tuple[str, str]:
    """存圖片，回傳 (本地路徑或 r2 key, 公開 URL)。"""
    name = f"{uuid.uuid4().hex}.{ext}"
    if _r2_enabled():
        key = f"platform/images/{name}"
        return key, _r2_put(key, data, f"image/{ext}")
    path = _data_path(_IMAGES, name)
    path.write_bytes(data)
    return str(path), f"{settings.public_base_url.rstrip('/')}/files/images/{name}"


def save_text(text: str, ext: str = "html") -> tuple[str, str]:
    """存文字輸出（如 final_html），回傳 (路徑/key, 公開 URL)。"""
    name = f"{uuid.uuid4().hex}.{ext}"
    if _r2_enabled():
        key = f"platform/output/{name}"
        return key, _r2_put(key, text.encode("utf-8"), "text/html; charset=utf-8")
    path = _data_path(_OUTPUT, name)
    path.write_text(text, encoding="utf-8")
    return str(path), f"{settings.public_base_url.rstrip('/')}/files/output/{name}"


def local_image_path(name: str) -> Path:
    return Path(settings.data_dir) / _IMAGES / name


def local_output_path(name: str) -> Path:
    return Path(settings.data_dir) / _OUTPUT / name
