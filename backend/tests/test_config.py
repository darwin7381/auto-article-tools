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


def test_site_config_displayname_match_and_content_priority(db):
    from app.services import site_config
    # 無 name、靠 displayName 子字串比對;template 缺 → 退 content 欄位
    _add_siteconfig("header_disclaimer", {"displayName": "廣編 sponsored 範本", "content": "BY-CONTENT", "isActive": True})
    assert site_config.disclaimer("header_disclaimer", "sponsored") == "BY-CONTENT"


def test_site_config_authors_and_has(db):
    from app.services import site_config
    assert site_config.has_site_config() is False
    _add_siteconfig("author", {"name": "Alice", "id": 1})
    assert site_config.has_site_config() is True
    assert any(a.get("name") == "Alice" for a in site_config.authors())


# ───────────────────────── versions 錯誤分支 / list / footer 對稱 ─────────────────────────

def test_versions_activate_delete_false_branches(db):
    assert versions.activate("agent:x", 999999) is False     # 不存在
    assert versions.delete_version("agent:x", 999999) is False


def test_list_versions_newest_first_single_active(db):
    versions.create_version("agent:c", "v1", {"model": "a"})
    versions.create_version("agent:c", "v2", {"model": "b"})
    lst = versions.list_versions("agent:c")
    assert [v["name"] for v in lst] == ["v2", "v1"]          # 最新在前
    assert sum(1 for v in lst if v["is_active"]) == 1        # 永遠只有一個生效


def test_disclaimers_footer_3tier(db):
    _add_siteconfig("footer_disclaimer", {"name": "sponsored", "template": "S-FTR", "isActive": True})
    _, footer, _ = resolve_disclaimers("sponsored")
    assert footer == "S-FTR"                                 # Strapi footer 蓋過內建
    versions.create_version("disclaimer", "v1",
                            {"header_disclaimers": {}, "footer_disclaimers": {"sponsored": "V-FTR"}})
    _, footer2, _ = resolve_disclaimers("sponsored")
    assert footer2 == "V-FTR"                                # 版本 footer 最高優先


# ───────────────────────── versions API 空名 400 ─────────────────────────

def test_create_version_empty_name_400(db):
    from fastapi.testclient import TestClient
    from app.main import app
    with TestClient(app) as c:
        r = c.post("/versions/agent:c", json={"name": "  ", "data": {}})
        assert r.status_code == 400


def test_versions_activate_delete_happy_and_404_api(db):
    from fastapi.testclient import TestClient
    from app.main import app
    with TestClient(app) as c:
        v1 = c.post("/versions/agent:c", json={"name": "v1", "data": {"model": "a"}}).json()["id"]
        v2 = c.post("/versions/agent:c", json={"name": "v2", "data": {"model": "b"}}).json()["id"]
        assert c.post(f"/versions/agent:c/{v1}/activate").status_code == 200
        assert c.get("/versions/agent:c").json()["active_id"] == v1   # 切回 v1 生效
        assert c.post("/versions/agent:c/999999/activate").status_code == 404
        assert c.request("DELETE", f"/versions/agent:c/{v2}").status_code in (200, 204)
        assert c.request("DELETE", "/versions/agent:c/999999").status_code == 404


# ───────────────────────── agents API(取代 R2 後台)─────────────────────────

def test_agents_api_list_get_update(db):
    from fastapi.testclient import TestClient
    from app.main import app
    _add_agent(name="contentAgent", provider="openrouter", model="m", system_prompt="SYS")
    with TestClient(app) as c:
        assert any(a["name"] == "contentAgent" for a in c.get("/agents").json())
        assert c.get("/agents/contentAgent").json()["model"] == "m"
        assert c.get("/agents/__none__").status_code == 404
        u = c.put("/agents/contentAgent", json={"model": "m2"})
        assert u.status_code == 200 and u.json()["model"] == "m2"      # 部分更新
        assert c.put("/agents/__none__", json={"model": "x"}).status_code == 404


def test_agents_default_and_reset_404(db):
    from fastapi.testclient import TestClient
    from app.main import app
    with TestClient(app) as c:
        assert c.get("/agents/__none__/default").status_code == 404    # 無 seed → 404
        assert c.post("/agents/__none__/reset").status_code == 404
