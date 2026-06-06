"""文件抽取 —— PDF / DOCX → 純文字。

用 Python 原生庫（pymupdf / python-docx），目標是逐步取代舊系統對付費 ConvertAPI 的依賴。
這些是 CPU-bound 同步函式，在 async stage 裡要用 asyncio.to_thread 包起來，避免擋住 event loop。
"""

from __future__ import annotations

from pathlib import Path


def extract_docx(path: str) -> str:
    import docx  # python-docx

    d = docx.Document(path)
    parts: list[str] = []
    for p in d.paragraphs:
        if p.text.strip():
            parts.append(p.text)
    for table in d.tables:
        for row in table.rows:
            cells = [c.text.strip() for c in row.cells]
            if any(cells):
                parts.append(" | ".join(cells))
    return "\n\n".join(parts)


def extract_pdf(path: str) -> str:
    import fitz  # pymupdf

    doc = fitz.open(path)
    try:
        parts = [page.get_text("text") for page in doc]
    finally:
        doc.close()
    return "\n\n".join(p for p in parts if p.strip())


def extract_document(path: str) -> str:
    ext = Path(path).suffix.lower()
    if ext == ".docx":
        return extract_docx(path)
    if ext == ".pdf":
        return extract_pdf(path)
    if ext in (".md", ".txt"):
        return Path(path).read_text(encoding="utf-8")
    raise ValueError(f"不支援的檔案類型: {ext}")
