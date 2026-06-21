"""設定 / 版本管理 + 押註解析 —— get_agent_config overlay、resolve_disclaimers(版本>內建)、agents API。"""

from __future__ import annotations

import pytest
from sqlmodel import select

from app.models import AgentConfig, ConfigVersion, get_session, init_db
from app.services import versions
from app.services.agent_config import get_agent_config
from app.services.templates import resolve_disclaimers


@pytest.fixture
def db():
    init_db()
    with get_session() as s:  # 乾淨起點,隔離各測試
        for model in (ConfigVersion, AgentConfig):
            for r in s.exec(select(model)).all():
                s.delete(r)
        s.commit()
    yield


def _add_agent(**kw):
    with get_session() as s:
        s.add(AgentConfig(**kw))
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


# ───────────────────────── resolve_disclaimers（版本 > 內建)─────────────────────────

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


def test_disclaimers_version_over_builtin(db):
    versions.create_version("disclaimer", "v1", {"header_disclaimers": {"sponsored": "VER-H"},
                                                 "footer_disclaimers": {}})
    header, _, _ = resolve_disclaimers("sponsored")
    assert header == "VER-H"               # 具名版本蓋過內建


def test_disclaimers_footer_version_over_builtin(db):
    versions.create_version("disclaimer", "v1",
                            {"header_disclaimers": {}, "footer_disclaimers": {"sponsored": "V-FTR"}})
    _, footer, _ = resolve_disclaimers("sponsored")
    assert footer == "V-FTR"


# ───────────────────────── versions(服務 + API)─────────────────────────

def test_versions_activate_delete_false_branches(db):
    assert versions.activate("agent:x", 999999) is False     # 不存在
    assert versions.delete_version("agent:x", 999999) is False


def test_list_versions_newest_first_single_active(db):
    versions.create_version("agent:c", "v1", {"model": "a"})
    versions.create_version("agent:c", "v2", {"model": "b"})
    lst = versions.list_versions("agent:c")
    assert [v["name"] for v in lst] == ["v2", "v1"]          # 最新在前
    assert sum(1 for v in lst if v["is_active"]) == 1        # 永遠只有一個生效


def test_create_version_empty_name_400(db):
    from fastapi.testclient import TestClient
    from app.main import app
    with TestClient(app) as c:
        assert c.post("/versions/agent:c", json={"name": "  ", "data": {}}).status_code == 400


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
