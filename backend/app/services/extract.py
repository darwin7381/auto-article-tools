"""文件抽取 —— DOCX / PDF / HTML / RTF / MD / TXT → 純文字 + 表格(markdown) + 內嵌圖片。

設計目標(復刻並超越舊版 ConvertAPI→mammoth 的「inline 保位」)：
- text 內含 `{{IMG0}}` 佔位符,**位置依文件實際閱讀順序**(不是把圖片全丟到最後)
- 表格轉成 markdown 表格(保留結構),放回它在文中的位置
- DOCX 連結轉 `[text](url)`、標題轉 `#`、清單轉 `- `(舊版靠 mammoth,我們自己保真)
- images 是 [(bytes, ext)];由 ingest 層存儲並換成 markdown 圖片

CPU-bound 同步函式,async stage 以 asyncio.to_thread 包起來。
依賴對照見 docs/EXTRACTION-MODULE.md。
"""

from __future__ import annotations

from pathlib import Path

ImgList = list[tuple[bytes, str]]

_IMG_EXTS = (".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tiff", ".tif")


def _norm_ext(ext: str) -> str:
    e = (ext or "png").lower().lstrip(".")
    return "jpg" if e == "jpeg" else e


# ───────────────────────── DOCX ─────────────────────────

def _docx_table_md(table) -> str:
    rows = [[c.text.strip().replace("\n", " ") for c in row.cells] for row in table.rows]
    rows = [r for r in rows if any(c for c in r)]
    if not rows:
        return ""
    head = rows[0]
    md = ["| " + " | ".join(head) + " |", "| " + " | ".join("---" for _ in head) + " |"]
    for r in rows[1:]:
        # 對齊欄數(避免儲存格數不一致破壞 markdown 表格)
        cells = (r + [""] * len(head))[: len(head)]
        md.append("| " + " | ".join(cells) + " |")
    return "\n".join(md)


def _docx_para_prefix(p) -> str:
    """標題 → `#`,清單 → `- `(保留結構,供後續 heading 正規化用)。"""
    from docx.oxml.ns import qn

    style = (p.style.name if p.style else "") or ""
    if style.startswith("Heading"):
        tail = style.split()[-1]
        level = int(tail) if tail.isdigit() else 2
        return "#" * min(level, 6) + " "
    if style.startswith("List") or style.startswith("List Bullet") or style.startswith("List Number"):
        return "- "
    # numbering(numPr)也是清單
    ppr = p._element.find(qn("w:pPr"))
    if ppr is not None and ppr.find(qn("w:numPr")) is not None:
        return "- "
    return ""


def extract_docx(path: str) -> tuple[str, ImgList]:
    import docx
    from docx.oxml.ns import qn
    from docx.oxml.table import CT_Tbl
    from docx.oxml.text.paragraph import CT_P
    from docx.table import Table
    from docx.text.paragraph import Paragraph

    d = docx.Document(path)
    parts: list[str] = []
    images: ImgList = []
    W_T, W_R, W_HL = qn("w:t"), qn("w:r"), qn("w:hyperlink")
    A_BLIP = qn("a:blip")

    def _text_of(el) -> str:
        return "".join(t.text or "" for t in el.iter(W_T))

    def _emit_images_in(el) -> None:
        for blip in el.findall(".//" + A_BLIP):
            rid = blip.get(qn("r:embed")) or blip.get(qn("r:link"))
            if not rid or rid not in d.part.related_parts:
                continue
            img = d.part.related_parts[rid]
            ext = (img.content_type or "image/png").split("/")[-1].split("+")[0]
            images.append((img.blob, _norm_ext(ext)))
            parts.append(f"{{{{IMG{len(images) - 1}}}}}")

    def collect_para(p: Paragraph) -> None:
        prefix = _docx_para_prefix(p)
        buf: list[str] = []
        applied = [False]  # 標題/清單前綴只加在段落第一段文字上

        def flush() -> None:
            t = "".join(buf).strip()
            buf.clear()
            if not t:
                return
            if prefix and not applied[0]:
                t, applied[0] = prefix + t, True
            parts.append(t)

        # 依 run / hyperlink 在段落內的實際順序走,圖片落在它出現的位置
        for child in p._element.iterchildren():
            if child.tag == W_HL:  # 超連結 → [text](url)(舊版 mammoth 會保,python-docx 預設會丟)
                txt = _text_of(child)
                rid = child.get(qn("r:id"))
                url = ""
                if rid and rid in p.part.rels:
                    url = p.part.rels[rid].target_ref
                if txt:
                    buf.append(f"[{txt}]({url})" if url else txt)
                _emit_images_in(child)
            elif child.tag == W_R:
                if child.findall(".//" + A_BLIP):  # run 內有圖 → 先把前面文字落地,再放圖
                    flush()
                    _emit_images_in(child)
                txt = "".join(t.text or "" for t in child.iter(W_T))
                if txt:
                    buf.append(txt)
        flush()

    # 依 body 實際順序走(段落與表格交錯),保位
    for child in d.element.body.iterchildren():
        if isinstance(child, CT_P):
            collect_para(Paragraph(child, d))
        elif isinstance(child, CT_Tbl):
            md = _docx_table_md(Table(child, d))
            if md:
                parts.append(md)
    return "\n\n".join(parts), images


# ───────────────────────── PDF ─────────────────────────

def _rect_inside(inner, outer, thresh: float = 0.6) -> bool:
    import fitz

    a, b = fitz.Rect(inner), fitz.Rect(outer)
    if a.is_empty or a.get_area() <= 0:
        return False
    inter = a & b
    return (inter.get_area() / a.get_area()) >= thresh if not inter.is_empty else False


def extract_pdf(path: str) -> tuple[str, ImgList]:
    """位置保真:把每頁的「文字塊 / 表格 / 圖片」依座標(上→下,左→右)排序後輸出。

    舊版 PDF 走 ConvertAPI→DOCX→mammoth 自然 inline;我們直接在 PDF 層做版面排序,
    避免 get_text 把圖片/表格丟失或錯位(之前的 bug:圖片全被丟到頁尾)。
    """
    import fitz

    doc = fitz.open(path)
    parts: list[str] = []
    images: ImgList = []
    seen: set[int] = set()
    try:
        for page in doc:
            items: list[tuple[float, float, str, object]] = []  # (y0, x0, kind, payload)

            # 表格 → markdown(記下 bbox,稍後排除落在其內的文字塊避免重複)
            table_rects = []
            try:
                for tab in page.find_tables().tables:
                    md = (tab.to_markdown() or "").strip()
                    if md:
                        table_rects.append(fitz.Rect(tab.bbox))
                        items.append((tab.bbox[1], tab.bbox[0], "text", md))
            except Exception:  # noqa: BLE001  find_tables 偶會在奇異版面拋錯,不擋整頁
                pass

            # 文字塊(排除已被表格涵蓋的)
            for b in page.get_text("blocks"):
                x0, y0, x1, y1, txt, _no, btype = b[:7]
                if btype != 0 or not txt.strip():
                    continue
                if any(_rect_inside((x0, y0, x1, y1), tr) for tr in table_rects):
                    continue
                items.append((y0, x0, "text", txt.strip()))

            # 圖片(含座標)→ 依位置插入;xref 全域去重(重複 logo 只留一次)
            try:
                infos = page.get_image_info(xrefs=True)
            except Exception:  # noqa: BLE001
                infos = []
            for info in infos:
                xref = info.get("xref") or 0
                bbox = info.get("bbox")
                if not bbox:
                    continue
                items.append((bbox[1], bbox[0], "image", xref))

            # 閱讀順序排序(上→下,同高則左→右),四捨五入避免微小抖動亂序
            items.sort(key=lambda t: (round(t[0]), round(t[1])))
            for _y, _x, kind, payload in items:
                if kind == "text":
                    parts.append(payload)  # type: ignore[arg-type]
                    continue
                xref = int(payload)  # type: ignore[arg-type]
                if not xref or xref in seen:
                    continue
                seen.add(xref)
                try:
                    base = doc.extract_image(xref)
                except Exception:  # noqa: BLE001
                    continue
                images.append((base["image"], _norm_ext(base.get("ext", "png"))))
                parts.append(f"{{{{IMG{len(images) - 1}}}}}")
    finally:
        doc.close()
    return "\n\n".join(p for p in parts if p and p.strip()), images


# ───────────────────── HTML / RTF / 純文字 ─────────────────────

def extract_html(path: str) -> str:
    """本機 HTML 檔(已存下的文章)→ 主文 markdown(同 URL 路徑用 trafilatura)。"""
    import trafilatura

    html = Path(path).read_text(encoding="utf-8", errors="replace")
    md = trafilatura.extract(
        html, output_format="markdown",
        include_images=True, include_links=True, include_tables=True,
    )
    if md and md.strip():
        return md
    # 抽不到主文(片段/無 article 結構)→ 退回去標籤純文字
    import re

    text = re.sub(r"<[^>]+>", " ", html)
    return re.sub(r"\s+", " ", text).strip()


def extract_rtf(path: str) -> str:
    from striprtf.striprtf import rtf_to_text

    return rtf_to_text(Path(path).read_text(encoding="utf-8", errors="replace"))


def extract_document(path: str) -> tuple[str, ImgList]:
    ext = Path(path).suffix.lower()
    if ext == ".docx":
        return extract_docx(path)
    if ext == ".pdf":
        return extract_pdf(path)
    if ext in (".md", ".txt"):
        return Path(path).read_text(encoding="utf-8", errors="replace"), []
    if ext in (".html", ".htm"):
        return extract_html(path), []
    if ext == ".rtf":
        return extract_rtf(path), []
    if ext in (".doc", ".odt", ".pages"):
        raise ValueError(
            f"{ext} 需 LibreOffice 轉檔(目前環境未安裝);請先另存為 .docx 或 .pdf 再上傳"
        )
    if ext in _IMG_EXTS:
        raise ValueError(f"{ext} 為圖片檔,需 OCR(尚未支援);請提供文字稿 .docx/.pdf/.md")
    raise ValueError(f"不支援的檔案類型: {ext}")
