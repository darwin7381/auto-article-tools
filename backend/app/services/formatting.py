"""進階組稿 —— 忠實移植舊版 ArticleFormattingProcessor + article-templates.ts。

對「上稿內文(wordpress.content)」做 BlockTempo 上稿規範格式化:
標題層級正規化 → 引言區塊 → 開頭押註(插在引言後) → Dropcap 首字 → 結尾押註(前加分隔線)
→ TG Banner + 相關閱讀。每項可由參數開關。

押註內容由呼叫端(resolve_disclaimers)決定(版本/Strapi/內建,已替換供稿方),這裡只負責插入位置。
"""

from __future__ import annotations

import re
from dataclasses import dataclass

# ── 範本常數(複刻自 src/config/article-templates.ts CommonTemplates)──
DROPCAP_STYLE = (
    '<span class="dropcap " style="background-color: #ffffff; color: #000000; '
    'border-color: #ffffff;">'
)
TG_BANNER = (
    '<a href="https://t.me/blocktemponews/"><img class="alignnone wp-image-194701 size-full" '
    'src="https://image.blocktempo.com/2022/11/動區官網tg-banner-1116.png" alt="" '
    'width="800" height="164" /></a>'
)
RELATED_HEADER = "<h5>📍相關報導📍</h5>"
RELATED_DEFAULT = [
    ("https://www.blocktempo.com/sample-article-1/", "範例相關文章標題一"),
    ("https://www.blocktempo.com/sample-article-2/", "範例相關文章標題二"),
    ("https://www.blocktempo.com/sample-article-3/", "範例相關文章標題三"),
]
_INTRO_LINK = (
    '<br>（{label}：<span style="color: #ff6600;">'
    '<a style="color: #ff6600;" href="{url}" target="_blank" rel="noopener">{title}</a></span>）'
)


@dataclass
class FormatOptions:
    headings: bool = True       # 標題層級正規化 h2→h3…
    intro_quote: bool = True    # 引言區塊
    dropcap: bool = True        # 首字放大
    related: bool = True        # TG banner + 相關閱讀
    sponsored: bool = False     # 廣編稿:相關閱讀用紅色連結


def normalize_headings(html: str) -> str:
    """不動 h1,h2→h3 / h3→h4 / h4→h5;由高到低避免連鎖替換。"""
    html = re.sub(r"<h4([^>]*)>", r"<h5\1>", html, flags=re.I)
    html = re.sub(r"</h4>", "</h5>", html, flags=re.I)
    html = re.sub(r"<h3([^>]*)>", r"<h4\1>", html, flags=re.I)
    html = re.sub(r"</h3>", "</h4>", html, flags=re.I)
    html = re.sub(r"<h2([^>]*)>", r"<h3\1>", html, flags=re.I)
    html = re.sub(r"</h2>", "</h3>", html, flags=re.I)
    return html


def build_intro_quote(excerpt: str, context: tuple[str, str] | None = None,
                      background: tuple[str, str] | None = None) -> str:
    """引言區塊。前情提要/背景補充有提供才加(不塞假佔位連結;改進自舊版)。"""
    body = (excerpt or "").strip() or "（請補摘要引言）"
    extra = ""
    if context and context[0]:
        extra += _INTRO_LINK.format(label="前情提要", url=context[0], title=context[1] or context[0])
    if background and background[0]:
        extra += _INTRO_LINK.format(label="背景補充", url=background[0], title=background[1] or background[0])
    return f'<p class="intro_quote">{body}{extra}</p>'


def apply_dropcap(html: str) -> str:
    """第一個非引言段落的首個實際文字字元包成 dropcap(跳過空白/HTML 標籤)。"""
    paras = re.findall(r"<p[^>]*>.*?</p>", html, flags=re.I | re.S)
    target = next((p for p in paras if 'class="intro_quote"' not in p), None)
    if not target:
        return html
    m = re.match(r"(<p[^>]*>)(.*?)(</p>)", target, flags=re.I | re.S)
    if not m:
        return html
    open_tag, inner, close_tag = m.group(1), m.group(2), m.group(3)
    i = 0
    while i < len(inner):
        ch = inner[i]
        if ch.isspace():
            i += 1
            continue
        if ch == "<":
            end = inner.find(">", i)
            if end == -1:
                return html
            i = end + 1
            continue
        break
    else:
        return html
    first = inner[i]
    if first in "<>&\n\r\t":
        return html
    new_inner = f"{inner[:i]}{DROPCAP_STYLE}{first}</span>{inner[i + 1:]}"
    return html.replace(target, open_tag + new_inner + close_tag, 1)


def insert_header_disclaimer(html: str, disclaimer: str) -> str:
    """開頭押註:有引言區塊則插在其後(<br><br> 分隔),否則插在最前。"""
    if not disclaimer:
        return html
    m = re.search(r'(<p class="intro_quote">[\s\S]*?</p>)', html)
    if m:
        intro = m.group(1)
        rest = html[html.index(intro) + len(intro):]
        return intro + "<br><br>" + disclaimer + rest.lstrip()
    return disclaimer + html


def append_footer_disclaimer(html: str, disclaimer: str) -> str:
    """結尾押註:前加分隔線。"""
    if not disclaimer:
        return html
    return html + f"\n\n<hr />\n\n{disclaimer}"


def append_tg_and_related(html: str, sponsored: bool,
                          articles: list[tuple[str, str]] | None = None) -> str:
    arts = articles or RELATED_DEFAULT
    if sponsored:
        links = [f'<strong><span style="color: #ff0000;"><a href="{u}">{t}</a></span></strong>'
                 for u, t in arts]
    else:
        links = [f'<strong><a href="{u}">{t}</a></strong>' for u, t in arts]
    section = RELATED_HEADER + "\n" + "\n\n".join(links)
    return f"{html}\n\n{TG_BANNER}\n\n{section}"


def format_article(
    body_html: str,
    *,
    excerpt: str = "",
    header_disclaimer: str = "",
    footer_disclaimer: str = "",
    opts: FormatOptions | None = None,
    context: tuple[str, str] | None = None,
    background: tuple[str, str] | None = None,
) -> str:
    """完整組稿,回傳格式化後的「上稿內文」HTML(順序同舊版)。"""
    o = opts or FormatOptions()
    html = body_html
    if o.headings:
        html = normalize_headings(html)
    if o.intro_quote:
        html = build_intro_quote(excerpt, context, background) + "\n\n&nbsp;\n\n" + html
    html = insert_header_disclaimer(html, header_disclaimer)
    if o.dropcap:
        html = apply_dropcap(html)
    html = append_footer_disclaimer(html, footer_disclaimer)
    if o.related:
        html = append_tg_and_related(html, o.sponsored)
    return html
