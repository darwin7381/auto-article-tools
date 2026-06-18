"""文件抽取 —— PDF / DOCX → 純文字 + 內嵌圖片(依出現順序)。

回傳 (text, images):text 內含 `{{IMG0}}` 佔位符標記圖片位置;images 是 [(bytes, ext)]。
由 ingest 層把圖片存儲並把佔位符換成 markdown 圖片,讓配圖稿件不掉圖(補 D1 缺口)。
CPU-bound 同步函式,async stage 用 asyncio.to_thread 包起來。
"""

from __future__ import annotations

from pathlib import Path

ImgList = list[tuple[bytes, str]]


def extract_docx(path: str) -> tuple[str, ImgList]:
    import docx
    from docx.oxml.ns import qn

    d = docx.Document(path)
    parts: list[str] = []
    images: ImgList = []

    def collect_run_images(run) -> None:
        for blip in run._element.findall(".//" + qn("a:blip")):
            rid = blip.get(qn("r:embed")) or blip.get(qn("r:link"))
            if not rid or rid not in d.part.related_parts:
                continue
            img = d.part.related_parts[rid]
            ext = (img.content_type or "image/png").split("/")[-1].split("+")[0]
            images.append((img.blob, ext))
            parts.append(f"{{{{IMG{len(images) - 1}}}}}")

    for para in d.paragraphs:
        if para.text.strip():
            parts.append(para.text)
        for run in para.runs:
            collect_run_images(run)
    for table in d.tables:
        for row in table.rows:
            cells = [c.text.strip() for c in row.cells]
            if any(cells):
                parts.append(" | ".join(cells))
    return "\n\n".join(parts), images


def extract_pdf(path: str) -> tuple[str, ImgList]:
    import fitz  # pymupdf

    doc = fitz.open(path)
    parts: list[str] = []
    images: ImgList = []
    seen: set[int] = set()
    try:
        for page in doc:
            text = page.get_text("text")
            if text.strip():
                parts.append(text)
            for info in page.get_images(full=True):
                xref = info[0]
                if xref in seen:
                    continue
                seen.add(xref)
                try:
                    base = doc.extract_image(xref)
                except Exception:  # noqa: BLE001
                    continue
                images.append((base["image"], base.get("ext", "png")))
                parts.append(f"{{{{IMG{len(images) - 1}}}}}")
    finally:
        doc.close()
    return "\n\n".join(p for p in parts if p.strip()), images


def extract_document(path: str) -> tuple[str, ImgList]:
    ext = Path(path).suffix.lower()
    if ext == ".docx":
        return extract_docx(path)
    if ext == ".pdf":
        return extract_pdf(path)
    if ext in (".md", ".txt"):
        return Path(path).read_text(encoding="utf-8"), []
    raise ValueError(f"不支援的檔案類型: {ext}")
