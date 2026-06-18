"""格式轉換保真度測試 —— 每種輸入格式都實際抽取,斷言圖片/表格/文字沒丟失或搞壞。

格式轉換是最容易掉東西的環節,這裡用真實素材(input-example)做端到端斷言。
缺素材時 skip(CI 無素材也不會誤紅)。
"""

from __future__ import annotations

import os

import pytest

from app.services.extract import extract_document
from app.services.markdown import md_to_html

EX = os.path.join(os.path.dirname(__file__), "..", "..", "input-example")


def _f(name: str) -> str:
    p = os.path.join(EX, name)
    if not os.path.exists(p):
        pytest.skip(f"缺素材 {name}")
    return p


# ── 檔案抽取:文字 + 圖片 + 表格 保真度 ──
def test_docx_text_and_image():
    """繁中 docx:抽到文字 + 內嵌圖片佔位符。"""
    text, images = extract_document(_f("【新聞稿】_HashKey_PRO將在第二季度正式上線，支援法幣交易對.docx"))
    assert "HashKey" in text
    assert len(images) >= 1                      # 有內嵌圖
    assert "{{IMG0}}" in text                    # 圖片位置標記在內文


def test_docx_simplified_chinese():
    """简中 docx:抽到文字 + 圖。"""
    text, images = extract_document(_f("中文埋点WEEX强势亮相_Consensus_HK，与行业精英携手推动以AI_赋能加密交易.docx"))
    assert len(text) > 300 and len(images) >= 1


def test_pdf_text_only():
    """英文純文字 PDF:抽到文字、無圖。"""
    text, images = extract_document(_f("Bluefin - article content.pdf"))
    assert "Bluefin" in text and len(images) == 0


def test_pdf_with_tables_and_images():
    """數碼港 PDF:表格轉 markdown(保留結構)+ 內嵌圖,重複 logo 去重。"""
    text, images = extract_document(_f("新聞稿數碼港Web3-Innovators-Season系列主題活動.pdf"))
    assert text.count("|---|") >= 2              # 至少 2 個 markdown 表格
    assert "活動亮點" in text                     # 表格內容確實抽到
    assert len(images) == 4                       # 8 次出現去重成 4 張唯一圖


def test_unsupported_type_rejected(tmp_path):
    f = tmp_path / "a.xyz"
    f.write_text("x")
    with pytest.raises(ValueError):
        extract_document(str(f))


# ── markdown → HTML:圖片/表格不丟不壞 ──
def test_md_html_table_renders():
    html = md_to_html("| 欄1 | 欄2 |\n|---|---|\n| a | b |")
    assert "<table>" in html and "<td>a</td>" in html


def test_md_html_image_figure():
    html = md_to_html("文字\n\n![](https://x/a.png)\n\n更多")
    assert 'figure class="article-image"' in html and 'loading="lazy"' in html
