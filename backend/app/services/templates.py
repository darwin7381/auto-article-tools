"""文稿類型範本（押註/作者）—— 內建預設複刻自舊版 src/config/article-templates.ts。

優先序：DB SiteConfig（Strapi 匯入後）> 這裡的內建預設。
"""

from __future__ import annotations

from app.services import site_config

HEADER_DISCLAIMERS: dict[str, str] = {
    "sponsored": (
        '<span style="color: #808080;"><em>（本文為廣編稿，由［撰稿方名稱］ 撰文、提供，'
        "不代表動區立場，亦非投資建議、購買或出售建議。詳見文末責任警示。）</em></span>"
    ),
    "press-release": (
        '<span style="color: #808080;"><em>本文為新聞稿，由［撰稿方名稱］ 撰文、提供，'
        "不代表動區立場。</em></span>"
    ),
}

FOOTER_DISCLAIMERS: dict[str, str] = {
    "sponsored": (
        '<div class="alert alert-warning">（廣編免責聲明：本文內容為供稿者提供之廣宣稿件，'
        "供稿者與動區並無任何關係，本文亦不代表動區立場。本文無意提供任何投資、資產建議或法律意見，"
        "也不應被視為購買、出售或持有資產的要約。廣宣稿件內容所提及之任何服務、方案或工具等僅供參考，"
        "且最終實際內容或規則以供稿方之公布或說明為準，動區不對任何可能存在之風險或損失負責，"
        "提醒讀者進行任何決策或行為前務必自行謹慎查核。）</div>"
    ),
}

# 文稿類型 → 預設押註配置（同舊版 DefaultAdvancedSettings）
TYPE_DEFAULTS: dict[str, dict] = {
    "regular": {"name": "一般文章", "header": "none", "footer": "none", "author_id": None},
    "sponsored": {"name": "廣編稿", "header": "sponsored", "footer": "sponsored", "author_id": 1},
    "press-release": {"name": "新聞稿", "header": "press-release", "footer": "none", "author_id": 2},
}


def _disclaimer_sets() -> tuple[dict, dict]:
    """目前生效的押註範本集：優先用具名版本(ConfigVersion scope=disclaimer)，否則內建預設。"""
    from app.services import versions

    active = versions.active_version("disclaimer")
    if active:
        d = active["data"]
        return (d.get("header_disclaimers") or HEADER_DISCLAIMERS,
                d.get("footer_disclaimers") or FOOTER_DISCLAIMERS)
    return HEADER_DISCLAIMERS, FOOTER_DISCLAIMERS


def resolve_disclaimers(
    article_type: str,
    supplier: str = "",
    header_kind: str | None = None,
    footer_kind: str | None = None,
) -> tuple[str, str, str]:
    """回傳 (header_html, footer_html, 類型中文名)。supplier 會替換［撰稿方名稱］。

    優先序：押註具名版本 > Strapi(SiteConfig) > 內建預設。
    header/footer kind: none / sponsored / press-release；未指定則用該文稿類型的預設。
    """
    cfg = TYPE_DEFAULTS.get(article_type, TYPE_DEFAULTS["regular"])
    hk = header_kind if header_kind is not None else cfg["header"]
    fk = footer_kind if footer_kind is not None else cfg["footer"]
    header_set, footer_set = _disclaimer_sets()

    header = site_config.header_disclaimer() or header_set.get(hk, "")
    if hk == "none":
        header = ""
    footer = site_config.footer_disclaimer() or footer_set.get(fk, "")
    if fk == "none":
        footer = ""

    if supplier:
        header = header.replace("［撰稿方名稱］", supplier)
        footer = footer.replace("［撰稿方名稱］", supplier)
    return header, footer, cfg["name"]
