"""文件抽取 —— PDF / DOCX → 純文字 + 表格(markdown)+ 內嵌圖片(依出現順序)。

text 內含 `{{IMG0}}` 佔位符標記圖片位置;表格轉成 markdown 表格(保留結構);
images 是 [(bytes, ext)]。由 ingest 層把圖片存儲並換成 markdown 圖片。
CPU-bound 同步函式,async stage 用 asyncio.to_thread 包起來。
"""

from __future__ import annotations

from pathlib import Path

ImgList = list[tuple[bytes, str]]


def _docx_table_md(table) -> str:
    rows = []
    for row in table.rows:
        rows.append([c.text.strip().replace("\n", " ") for c in row.cells])
    if not rows:
        return ""
    head = rows[0]
    md = ["| " + " | ".join(head) + " |", "| " + " | ".join("---" for _ in head) + " |"]
    for r in rows[1:]:
        md.append("| " + " | ".join(r) + " |")
    return "\n".join(md)


def extract_docx(path: str) -> tuple[str, ImgList]:
    import docx
    from docx.document import Document as _Doc
    from docx.oxml.ns import qn
    from docx.oxml.table import CT_Tbl
    from docx.oxml.text.paragraph import CT_P
    from docx.table import Table
    from docx.text.paragraph import Paragraph

    d = docx.Document(path)
    parts: list[str] = []
    images: ImgList = []

    def collect_para(p: Paragraph) -> None:
        if p.text.strip():
            parts.append(p.text)
        for run in p.runs:
            for blip in run._element.findall(".//" + qn("a:blip")):
                rid = blip.get(qn("r:embed")) or blip.get(qn("r:link"))
                if not rid or rid not in d.part.related_parts:
                    continue
                img = d.part.related_parts[rid]
                ext = (img.content_type or "image/png").split("/")[-1].split("+")[0]
                images.append((img.blob, ext))
                parts.append(f"{{{{IMG{len(images) - 1}}}}}")

    # 依文件實際順序走 body(段落與表格交錯),表格轉 markdown(保留結構)
    body = d.element.body
    for child in body.iterchildren():
        if isinstance(child, CT_P):
            collect_para(Paragraph(child, d))
        elif isinstance(child, CT_Tbl):
            md = _docx_table_md(Table(child, d))
            if md:
                parts.append(md)
    _ = _Doc  # 型別匯入備用
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
            # 表格 → markdown(保留結構;get_text 會打散表格,這裡補回)
            try:
                for tab in page.find_tables().tables:
                    md = tab.to_markdown()
                    if md and md.strip():
                        parts.append(md.strip())
            except Exception:  # noqa: BLE001
                pass
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
