"""通知外送 —— 把看板通知真的送到人手上(第一個通道:Telegram)。

設計:
- DB `Notification` 永遠會寫(可稽核、卡片抽屜看得到),外送是「加上去」的。
- 沒設 TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID → 靜默略過外送(開發/測試環境零依賴)。
- 外送在背景 thread 跑、短 timeout、任何失敗只記 log —— 絕不讓業務操作因通知失敗而炸掉。
"""

from __future__ import annotations

import logging
import threading

import httpx

from app.settings import settings

log = logging.getLogger(__name__)

_CHANNEL_LABEL = {"editor": "編輯部", "bd": "BD"}


def external_enabled() -> bool:
    return bool(settings.telegram_bot_token and settings.telegram_chat_id)


def _send_telegram(text: str) -> None:
    try:
        resp = httpx.post(
            f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage",
            json={"chat_id": settings.telegram_chat_id, "text": text, "disable_web_page_preview": True},
            timeout=8.0,
        )
        if resp.status_code != 200:
            log.warning("Telegram 通知失敗 %s: %s", resp.status_code, resp.text[:200])
    except Exception as exc:  # noqa: BLE001  外送失敗絕不外拋
        log.warning("Telegram 通知例外: %s", exc)


def send_external(channel: str, target: str, body: str) -> None:
    """非同步外送(fire-and-forget)。呼叫端不需等待、不會因它失敗。"""
    if not external_enabled():
        return
    text = f"[{_CHANNEL_LABEL.get(channel, channel)}] @{target}\n{body}"
    threading.Thread(target=_send_telegram, args=(text,), daemon=True).start()


def send_external_raw(text: str) -> None:
    """直接送一段文字(晨報等非卡片綁定訊息)。"""
    if not external_enabled():
        return
    threading.Thread(target=_send_telegram, args=(text,), daemon=True).start()
