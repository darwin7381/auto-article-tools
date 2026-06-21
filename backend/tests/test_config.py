"""設定 / 版本管理 + 押註解析 —— get_agent_config overlay、resolve_disclaimers 3-tier、site_config。"""

from __future__ import annotations

import pytest
from sqlmodel import select

from app.models import AgentConfig, ConfigVersion, SiteConfig, get_session, init_db
from app.services import versions
from app.services.agent_config import get_agent_config
from app.services.templates import resolve_disclaimers


@pytest.fixture
def db():
    init_db()
    with get_session() as s:  # 乾淨起點,隔離各測試
        for model in (ConfigVersion, SiteConfig, AgentConfig):
            for r in s.exec(select(model)).all():
                s.delete(r)
        s.commit()
    yield


def _add_agent(**kw):
    with get_session() as s:
        s.add(AgentConfig(**kw))
        s.commit()


def _add_siteconfig(kind, value):
    import json
    with get_session() as s:
        s.add(SiteConfig(kind=kind, value_json=json.dumps(value, ensure_ascii=False)))
        s.commit()


# ───────────────────────── get_agent_config overlay ─────────────────────────

def test_agent_config_base_no_version(db):
    _add_agent(name="contentAgent", provider="openrouter", model="base-m", system_prompt="BASE")
    cfg = get_agent_config("contentAgent")
    assert cfg.model == "base-m" and cfg.system_prompt == "BASE"


def test_agent_config_version_overlays_base(db):
    _add_agent(name="contentAgent", provider="openrouter", model="base-m", system_prompt="BASE")
    versions.create_version("agent:contentAgent", "v1", {"system_prompt": "AAA", "model": "v-model"})
    cfg = get_agent_config("contentAgent")
    assert cfg.system_prompt == "AAA"      # 版本覆蓋
    assert cfg.model == "v-model"          # 版本覆蓋
    assert cfg.provider == "openrouter"    # 版本沒給 → 沿用 base


def test_agent_config_missing_raises(db):
    with pytest.raises(KeyError):
        get_agent_config("nonexistent")


# ───────────────────────── resolve_disclaimers 3-tier ─────────────────────────

def test_disclaimers_builtin(db):
    header, footer, name = resolve_disclaimers("sponsored")
    assert "廣編稿" in header and "廣編免責" in footer and name == "廣編稿"


def test_disclaimers_supplier_substitution(db):
    header, _, _ = resolve_disclaimers("sponsored", supplier="動區動趨")
    assert "動區動趨" in header and "［撰稿方名稱］" not in header


def test_disclaimers_none_kind_empty(db):
    header, footer, _ = resolve_disclaimers("regular")   # regular header/footer 預設皆 none
    assert header == "" and footer == ""
    h2, _, _ = resolve_disclaimers("sponsored", header_kind="none")
    assert h2 == ""


def test_disclaimers_strapi_over_builtin(db):
    _add_siteconfig("header_disclaimer", {"name": "sponsored", "template": "STRAPI-H", "isActive": True})
    header, _, _ = resolve_disclaimers("sponsored")
    assert header == "STRAPI-H"            # Strapi 蓋過內建


def test_disclaimers_version_over_strapi(db):
    _add_siteconfig("header_disclaimer", {"name": "sponsored", "template": "STRAPI-H", "isActive": True})
    versions.create_version("disclaimer", "v1", {"header_disclaimers": {"sponsored": "VER-H"},
                                                 "footer_disclaimers": {}})
    header, _, _ = resolve_disclaimers("sponsored")
    assert header == "VER-H"               # 具名版本最高優先


# ───────────────────────── site_config.disclaimer ─────────────────────────

def test_site_config_disclaimer_isactive_filter(db):
    from app.services import site_config
    _add_siteconfig("footer_disclaimer", {"name": "sponsored", "template": "OLD", "isActive": False})
    _add_siteconfig("footer_disclaimer", {"name": "sponsored", "template": "NEW", "isActive": True})
    assert site_config.disclaimer("footer_disclaimer", "sponsored") == "NEW"  # 跳過 isActive=False


def test_site_config_disclaimer_missing_returns_empty(db):
    from app.services import site_config
    assert site_config.disclaimer("header_disclaimer", "sponsored") == ""
