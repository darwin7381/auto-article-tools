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


def _rows_to_md(rows: list[list]) -> str:
    """二維儲存格 → markdown 表格(欄數對齊、去空列)。"""
    clean = []
    for r in rows or []:
        cells = [(c or "").strip().replace("\n", " ").replace("|", "\\|") for c in r]
        if any(cells):
            clean.append(cells)
    if len(clean) < 1:
        return ""
    ncol = max(len(r) for r in clean)
    if ncol < 2:
        return ""
    norm = [(r + [""] * ncol)[:ncol] for r in clean]
    head = norm[0]
    md = ["| " + " | ".join(head) + " |", "| " + " | ".join("---" for _ in head) + " |"]
    for r in norm[1:]:
        md.append("| " + " | ".join(r) + " |")
    return "\n".join(md)


def _good_borderless_table(rows: list[list]) -> bool:
    """無框線 fallback 的品質閘:擋掉把一般段落誤判成表格。

    要件:>=2 列 >=2 欄、>=60% 儲存格有值、平均儲存格短(表格特徵,非長句散文)。
    """
    clean = [[(c or "").strip() for c in r] for r in (rows or [])]
    clean = [r for r in clean if any(r)]
    if len(clean) < 2:
        return False
    ncol = max(len(r) for r in clean)
    if ncol < 2:
        return False
    flat = [c for r in clean for c in (r + [""] * ncol)[:ncol]]
    nonempty = [c for c in flat if c]
    if not flat or len(nonempty) / len(flat) < 0.6:
        return False
    avg_len = sum(len(c) for c in nonempty) / len(nonempty)
    return avg_len < 40


# pdfplumber / OCR / 表格還原 為惰性、可選依賴:沒裝或失敗都不擋主流程(graceful degradation)
def _ocr_engine_get():
    """建 OCR 引擎。優先用統一 rapidocr + PP-OCRv5(CJK 含繁中最佳、onnxruntime 無 torch),
    退回舊 rapidocr-onnxruntime(PP-OCRv4)。回傳 engine;種類記在 _OCR_KIND。"""
    global _OCR_ENGINE, _OCR_KIND
    if _OCR_ENGINE is _UNSET:
        _OCR_ENGINE, _OCR_KIND = None, None
        try:
            from rapidocr import ModelType, OCRVersion, RapidOCR

            _OCR_ENGINE = RapidOCR(params={
                "Det.ocr_version": OCRVersion.PPOCRV5, "Det.model_type": ModelType.MOBILE,
                "Rec.ocr_version": OCRVersion.PPOCRV5, "Rec.model_type": ModelType.MOBILE,
            })
            _OCR_KIND = "unified"
        except Exception:  # noqa: BLE001  統一包未裝 → 退回舊包
            try:
                from rapidocr_onnxruntime import RapidOCR as _LegacyRapidOCR

                _OCR_ENGINE, _OCR_KIND = _LegacyRapidOCR(), "legacy"
            except Exception:  # noqa: BLE001  未安裝 ocr extra
                _OCR_ENGINE, _OCR_KIND = None, None
    return _OCR_ENGINE


def _table_engine_get():
    """RapidTable(掃描表格結構還原 → HTML)。僅統一 rapidocr 路徑可用;惰性載入。"""
    global _TABLE_ENGINE
    if _TABLE_ENGINE is _UNSET:
        try:
            from rapid_table import RapidTable, RapidTableInput

            _TABLE_ENGINE = RapidTable(RapidTableInput())
        except Exception:  # noqa: BLE001
            _TABLE_ENGINE = None
    return _TABLE_ENGINE


def _html_table_rows(html: str) -> list[list[str]]:
    import re

    rows = []
    for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", html or "", re.S | re.I):
        cells = [re.sub(r"<[^>]+>", "", c).strip()
                 for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", tr, re.S | re.I)]
        if cells:
            rows.append(cells)
    return rows


def _ocr_page(page) -> str:
    """掃描/圖片型 PDF 頁 → OCR 文字(PP-OCRv5,CJK 佳)。

    若 RapidTable 可用且該頁辨識出結構良好的表格(過品質閘),回傳 markdown 表格;
    否則回傳逐行 OCR 文字。表格頁優先給結構化內容,直接補上掃描表格結構這塊缺口。
    """
    eng = _ocr_engine_get()
    if eng is None:
        return ""
    try:
        png = page.get_pixmap(dpi=200).tobytes("png")
        res = eng(png)
        if _OCR_KIND == "unified":
            txts = list(res.txts or [])
            tbl = _ocr_table_md(png, res)  # 掃描表格 → markdown(過閘才採用)
            if tbl:
                return tbl
        else:  # legacy:回傳 (result, elapse),result 為 [[box, text, score], ...]
            data = res[0] if isinstance(res, tuple) else res
            txts = [ln[1] for ln in (data or []) if ln and len(ln) > 1]
        return "\n".join(t for t in txts if t).strip()
    except Exception:  # noqa: BLE001
        return ""


def _ocr_table_md(png: bytes, ocr_res) -> str:
    """RapidTable 把掃描表格還原成 HTML → 解析 → 過結構閘 → markdown。非表格(散文)會被閘擋下。"""
    eng = _table_engine_get()
    if eng is None:
        return ""
    try:
        out = eng(png, [(ocr_res.boxes, ocr_res.txts, ocr_res.scores)])
        html = (out.pred_htmls or [""])[0]
        rows = _html_table_rows(html)
        if _good_borderless_table(rows):  # 至少 2x2、短格、>=60% 有值 → 才當表格
            return _rows_to_md(rows)
    except Exception:  # noqa: BLE001
        return ""
    return ""


_UNSET = object()
_OCR_ENGINE = _UNSET
_OCR_KIND = None
_TABLE_ENGINE = _UNSET


def _pdfplumber_borderless(path: str, page_no: int):
    """fitz 沒抓到表時,用 pdfplumber 文字策略補無框線表(過品質閘)。回傳 [(bbox, md)]。"""
    try:
        import pdfplumber
    except Exception:  # noqa: BLE001  未裝 pdfplumber
        return []
    out = []
    try:
        with pdfplumber.open(path) as pdf:
            if page_no >= len(pdf.pages):
                return []
            pg = pdf.pages[page_no]
            settings = {"vertical_strategy": "text", "horizontal_strategy": "text",
                        "snap_tolerance": 4, "join_tolerance": 4}
            for t in pg.find_tables(table_settings=settings):
                rows = t.extract()
                if _good_borderless_table(rows):
                    out.append((tuple(t.bbox), _rows_to_md(rows)))
    except Exception:  # noqa: BLE001
        return []
    return out


def extract_pdf(path: str) -> tuple[str, ImgList]:
    """位置保真:每頁的「文字塊 / 表格 / 圖片」依座標(上→下,左→右)排序後輸出。

    舊版 PDF 走 ConvertAPI→DOCX→mammoth 自然 inline;我們直接在 PDF 層做版面排序,
    避免 get_text 把圖片/表格丟失或錯位(之前的 bug:圖片全被丟到頁尾)。
    強化:fitz 漏抓表 → pdfplumber 補無框線表;整頁無文字(掃描檔)→ RapidOCR 補文字。
    """
    import fitz

    doc = fitz.open(path)
    parts: list[str] = []
    images: ImgList = []
    seen: set[int] = set()
    total_pages = doc.page_count
    unrecovered_scan = 0  # 疑似掃描頁(大圖+文字稀少)但 OCR 沒救回 → 用來擋「靜默吐空白」
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

            # fitz 沒抓到任何表 → pdfplumber 補無框線/複雜表(過品質閘防誤判)
            if not table_rects:
                for bbox, md in _pdfplumber_borderless(path, page.number):
                    if md:
                        table_rects.append(fitz.Rect(bbox))
                        items.append((bbox[1], bbox[0], "text", md))

            # 文字塊(排除已被表格涵蓋的)
            blocks = page.get_text("blocks")
            for b in blocks:
                x0, y0, x1, y1, txt, _no, btype = b[:7]
                if btype != 0 or not txt.strip():
                    continue
                if any(_rect_inside((x0, y0, x1, y1), tr) for tr in table_rects):
                    continue
                items.append((y0, x0, "text", txt.strip()))

            # 圖片資訊(含座標)—— 先取,供 OCR 判定「是否真為掃描頁」與後續插入用
            try:
                infos = page.get_image_info(xrefs=True)
            except Exception:  # noqa: BLE001
                infos = []

            # 疑似掃描/圖片頁 → OCR 補文字。判定不只看「整頁無字」(掃描檔常帶頁碼/
            # 浮水印/頁尾這層薄文字會 >10 字而被漏判),改看「大圖佔版面過半且文字稀少」。
            page_area = abs(page.rect.get_area()) or 1.0
            max_img_frac = max(
                (abs(fitz.Rect(i["bbox"]).get_area()) / page_area for i in infos if i.get("bbox")),
                default=0.0,
            )
            page_chars = sum(len((b[4] or "").strip()) for b in blocks if b[6] == 0)
            suspected_scan = (max_img_frac >= 0.5 and page_chars < 100) or (page_chars < 10 and bool(infos))
            if suspected_scan:
                ocr = _ocr_page(page)
                if ocr and len(ocr.strip()) >= 20:
                    items.append((-1.0, 0.0, "text", ocr))  # OCR 文字置於頁首
                else:  # OCR 沒救回(未裝/失敗/糊掉)→ 計為未還原的掃描頁
                    unrecovered_scan += 1

            # 圖片(含座標)→ 依位置插入;xref 全域去重(重複 logo 只留一次)
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
    text = "\n\n".join(p for p in parts if p and p.strip())
    # 防「靜默吐空白/缺頁」:掃描檔常帶薄文字層讓全文勉強過字數門檻,因此除了「全文過短」
    # 也用「未還原掃描頁佔比過半」把關 —— 任一成立就明確報錯,不讓無法閱讀的掃描 PDF
    # 帶著空白/殘缺內容跑完整條昂貴 AI 流程。
    sparse = len(text.strip()) < 100
    mostly_scanned = total_pages > 0 and unrecovered_scan / total_pages >= 0.5
    if unrecovered_scan and (sparse or mostly_scanned):
        hint = ("OCR 引擎未安裝,請 `uv sync --extra ocr` 後重試"
                if _ocr_engine_get() is None else "OCR 無法辨識內容(掃描品質過低)")
        raise ValueError(
            f"PDF 疑為掃描/圖片型,{unrecovered_scan}/{total_pages} 頁文字無法擷取:{hint};"
            "或改提供可選取文字的 PDF/DOCX"
        )
    return text, images


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


def extract_odt(path: str) -> tuple[str, ImgList]:
    """.odt(OpenDocument)→ 純 Python 抽取(odfdo,免 LibreOffice)。

    依 body 順序走標題/段落/清單/表格/圖,保位 —— 與 DOCX 路徑同級保真。
    """
    import re

    from odfdo import Document

    doc = Document(path)
    parts: list[str] = []
    images: ImgList = []
    # odfdo 的 inner_text 會把圖框渲染成「(Pictures/xxx.png)」混進文字,清掉(href 必為 Pictures/)
    _img_artifact = re.compile(r"\(Pictures/[^)]*\)")

    def _text(el) -> str:
        return _img_artifact.sub("", el.inner_text).strip()

    def emit_images(el) -> None:
        for img in el.get_elements("descendant::draw:image"):
            url = img.get_attribute("xlink:href")
            if not url:
                continue
            try:
                blob = doc.get_part(url)
            except Exception:  # noqa: BLE001
                continue
            if not blob:
                continue
            ext = url.rsplit(".", 1)[-1] if "." in url else "png"
            images.append((blob, _norm_ext(ext)))
            parts.append(f"{{{{IMG{len(images) - 1}}}}}")

    for child in doc.body.children:
        tag = child.tag
        if tag == "text:h":  # 標題 → #
            lvl = child.get_attribute("text:outline-level") or "2"
            level = int(lvl) if str(lvl).isdigit() else 2
            emit_images(child)
            txt = _text(child)
            if txt:
                parts.append("#" * min(level, 6) + " " + txt)
        elif tag == "text:p":  # 段落(內嵌圖落在段落位置)
            emit_images(child)
            txt = _text(child)
            if txt:
                parts.append(txt)
        elif tag == "text:list":  # 清單 → -
            for item in child.get_elements("descendant::text:list-item"):
                t = _text(item)
                if t:
                    parts.append("- " + t)
        elif tag == "table:table":  # 表格 → markdown
            try:
                rows = child.get_values()
            except Exception:  # noqa: BLE001
                rows = []
            md = _rows_to_md([["" if c is None else str(c) for c in r] for r in rows])
            if md:
                parts.append(md)
        elif tag == "draw:frame":  # body 層浮動圖框
            emit_images(child)
    return "\n\n".join(p for p in parts if p and p.strip()), images


def _find_soffice() -> str | None:
    """找 LibreOffice headless 執行檔(.doc/.odt 唯一可靠的 OSS 轉檔路徑)。"""
    import glob
    import shutil

    for name in ("soffice", "libreoffice"):
        hit = shutil.which(name)
        if hit:
            return hit
    for pat in (
        "/Applications/LibreOffice.app/Contents/MacOS/soffice",
        "/opt/homebrew/bin/soffice",
        "/usr/bin/soffice",
        "/usr/local/bin/soffice",
    ):
        hits = glob.glob(pat)
        if hits:
            return hits[0]
    return None


def _soffice_to_docx(path: str) -> str:
    """.doc/.odt → .docx(LibreOffice headless),回傳暫存 docx 路徑。"""
    import subprocess
    import tempfile

    soffice = _find_soffice()
    if not soffice:
        raise ValueError(
            f"{Path(path).suffix.lower()} 需 LibreOffice 轉檔(未偵測到 soffice);"
            "請 `brew install --cask libreoffice`,或先另存為 .docx/.pdf 再上傳"
        )
    outdir = tempfile.mkdtemp(prefix="soffice_")
    try:
        subprocess.run(
            [soffice, "--headless", "--convert-to", "docx", "--outdir", outdir, path],
            check=True, capture_output=True, timeout=90,
        )
    except subprocess.TimeoutExpired as exc:
        raise ValueError("LibreOffice 轉檔逾時(檔案可能過大或損毀)") from exc
    except subprocess.CalledProcessError as exc:
        raise ValueError(f"LibreOffice 轉檔失敗: {exc.stderr.decode()[:200]}") from exc
    out = Path(outdir) / (Path(path).stem + ".docx")
    if not out.exists():
        raise ValueError("LibreOffice 轉檔未產生 .docx(檔案可能損毀)")
    return str(out)


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
    if ext == ".odt":  # 純 Python(odfdo),免 LibreOffice
        return extract_odt(path)
    if ext in (".doc", ".pages"):  # 舊二進位無純 Python 路徑 → LibreOffice 轉 docx
        return extract_docx(_soffice_to_docx(path))
    if ext in _IMG_EXTS:
        raise ValueError(f"{ext} 為圖片檔,需 OCR(尚未支援);請提供文字稿 .docx/.pdf/.md")
    raise ValueError(f"不支援的檔案類型: {ext}")
