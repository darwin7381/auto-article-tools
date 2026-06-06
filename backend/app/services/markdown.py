from __future__ import annotations

import markdown as _md


def md_to_html(text: str) -> str:
    return _md.markdown(
        text,
        extensions=["extra", "tables", "fenced_code", "sane_lists", "nl2br"],
    )
