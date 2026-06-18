"""Markdown → HTML。圖片包成 <figure class="article-image">+lazy(複刻舊版 markdownToHtmlService,補 D2)。"""

from __future__ import annotations

import re

import markdown as _md

# 獨立成段的 <p><img></p> → <figure class="article-image">(lazy + 樣式)
_P_IMG = re.compile(r"<p>\s*<img\b([^>]*?)/?>\s*</p>", re.I)


def _figure(m: re.Match) -> str:
    return (f'<figure class="article-image"><img{m.group(1)} loading="lazy" '
            'class="max-w-full rounded-lg" /></figure>')


def md_to_html(text: str) -> str:
    html = _md.markdown(
        text,
        extensions=["extra", "tables", "fenced_code", "sane_lists", "nl2br"],
    )
    return _P_IMG.sub(_figure, html)
