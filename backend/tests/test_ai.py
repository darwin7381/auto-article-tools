"""AI 內容處理 —— 3 個 LLM 階段(mock LLM,不打網路)+ chat() 重試/空回/clamp + _fill。"""

from __future__ import annotations

from types import SimpleNamespace

import httpx
import pytest


def _cfg(**kw):
    base = dict(provider="openrouter", model="m", system_prompt="sys",
                user_prompt="UP", temperature=0.3, max_tokens=1000)
    base.update(kw)
    return SimpleNamespace(**base)


# ───────────────────────── _fill ─────────────────────────

def test_fill_substitutes_and_appends():
    from app.workflows.article import _fill

    assert _fill("前${md}後", "C", "md") == "前C後"      # 有 placeholder → 取代
    assert _fill("無佔位", "C", "md") == "無佔位\n\nC"     # 無 placeholder → 附在後面


# ───────────────────────── 三個 LLM 階段(mock)─────────────────────────

async def test_content_ai_stage(monkeypatch):
    from app.workflows import article

    seen = {}

    async def fake_chat(provider, model, system, user, temperature, max_tokens):
        seen["user"] = user
        seen["model"] = model
        return "標準化後內文(繁中)"

    monkeypatch.setattr(article, "get_agent_config",
                        lambda name: _cfg(user_prompt="改寫:${markdownContent}"))
    monkeypatch.setattr(article, "chat", fake_chat)
    out = await article.s_content_ai({"markdown": "原始简体"}, None)
    assert out["markdown"] == "標準化後內文(繁中)"
    assert "原始简体" in seen["user"]               # markdownContent 已填入 prompt
    assert out["model"] == "openrouter/m"


async def test_pr_writer_stage(monkeypatch):
    from app.workflows import article

    async def fake_chat(provider, model, system, user, temperature, max_tokens):
        return "潤飾為新聞稿"

    monkeypatch.setattr(article, "get_agent_config", lambda name: _cfg())
    monkeypatch.setattr(article, "chat", fake_chat)
    out = await article.s_pr_writer({"markdown": "x"}, None)
    assert out["markdown"] == "潤飾為新聞稿"


async def test_copy_editing_stage(monkeypatch):
    from app.workflows import article
    from app.workflows.article import WordPressParams

    captured = {}

    async def fake_structured(provider, model, system, user, response_model, temperature, max_tokens):
        captured["user"] = user
        assert response_model is WordPressParams
        return WordPressParams(title="標題", content="<p>內文</p>", excerpt="摘要",
                               slug="hello-world", categories=[{"id": 1}], tags=[{"id": 2}])

    monkeypatch.setattr(article, "get_agent_config", lambda name: _cfg(user_prompt="抽:${content}"))
    monkeypatch.setattr(article, "structured", fake_structured)
    out = await article.s_copy_editing({"html": "<p>內文</p>"}, None)
    wp = out["wordpress"]
    assert wp["title"] == "標題" and wp["slug"] == "hello-world"
    assert wp["categories"] == [{"id": 1}] and wp["tags"] == [{"id": 2}]
    assert "<p>內文</p>" in captured["user"]          # content 已填入 prompt


# ───────────────────────── chat() 行為(mock httpx)─────────────────────────

class _Resp:
    def __init__(self, status=200, data=None):
        self.status_code = status
        self._data = data or {}

    def raise_for_status(self):
        if self.status_code >= 400:
            raise httpx.HTTPStatusError("e", request=httpx.Request("POST", "http://x"), response=self)  # type: ignore[arg-type]

    def json(self):
        return self._data


class _Client:
    """每次 post 取 responses 下一個(Exception 則 raise),記錄最後 payload。
    chat() 每次 retry 會新建 AsyncClient,故索引用 state 跨實例共享。"""

    def __init__(self, responses, sink, state):
        self._responses = responses
        self._sink = sink
        self._state = state

    async def __aenter__(self):
        return self

    async def __aexit__(self, *a):
        return False

    async def post(self, url, headers=None, json=None):
        self._sink["payload"] = json
        i = self._state["i"]
        self._state["i"] += 1
        item = self._responses[min(i, len(self._responses) - 1)]
        if isinstance(item, Exception):
            raise item
        return item


def _ok(content="內容OK"):
    return _Resp(200, {"choices": [{"message": {"content": content}, "finish_reason": "stop"}],
                       "usage": {"total_tokens": 5}})


@pytest.fixture(autouse=True)
def _no_sleep(monkeypatch):
    async def _s(*a, **k):
        return None
    monkeypatch.setattr("asyncio.sleep", _s)


def _patch_llm(monkeypatch, responses, sink):
    from app.services import llm
    state = {"i": 0}
    monkeypatch.setattr(llm, "_api_key", lambda p: "test-key")
    monkeypatch.setattr(llm.httpx, "AsyncClient", lambda **kw: _Client(responses, sink, state))


async def test_chat_retries_then_succeeds(monkeypatch):
    from app.services.llm import chat

    sink = {}
    _patch_llm(monkeypatch, [httpx.TimeoutException("t"), _Resp(503), _ok("第三次成功")], sink)
    out = await chat("openrouter", "m", "s", "u")
    assert out == "第三次成功"


async def test_chat_empty_content_raises(monkeypatch):
    from app.services.llm import chat

    sink = {}
    empty = _Resp(200, {"choices": [{"message": {"content": ""}, "finish_reason": "length"}]})
    _patch_llm(monkeypatch, [empty], sink)
    with pytest.raises(RuntimeError, match="失敗"):
        await chat("openrouter", "m", "s", "u")


async def test_chat_4xx_no_retry(monkeypatch):
    from app.services.llm import chat

    sink = {"n": 0}

    class _CountClient(_Client):
        async def post(self, url, headers=None, json=None):
            sink["n"] += 1
            return _Resp(401)

    from app.services import llm
    monkeypatch.setattr(llm, "_api_key", lambda p: "k")
    monkeypatch.setattr(llm.httpx, "AsyncClient", lambda **kw: _CountClient([], sink, {"i": 0}))
    with pytest.raises(httpx.HTTPStatusError):
        await chat("openrouter", "m", "s", "u")
    assert sink["n"] == 1                              # 4xx 不重試


async def test_chat_max_tokens_clamped(monkeypatch):
    from app.services.llm import chat

    sink = {}
    _patch_llm(monkeypatch, [_ok()], sink)
    await chat("openrouter", "m", "s", "u", max_tokens=999999)
    assert sink["payload"]["max_tokens"] == 64000     # 上限夾到 64000


async def test_chat_unknown_provider_raises():
    from app.services.llm import chat

    with pytest.raises(RuntimeError, match="provider"):
        await chat("nope", "m", "s", "u")


async def test_structured_returns_obj_and_records_usage(monkeypatch):
    """structured():instructor 包裝回 pydantic 物件 + usage 入 contextvar(mock instructor/openai)。"""
    import instructor

    from app.services import llm
    from app.workflows.article import WordPressParams

    class _Completions:
        async def create_with_completion(self, **kw):
            assert kw["response_model"] is WordPressParams
            comp = SimpleNamespace(usage=SimpleNamespace(prompt_tokens=1, completion_tokens=2, total_tokens=3))
            return WordPressParams(title="T", content="C"), comp

    class _FakeClient:
        chat = SimpleNamespace(completions=_Completions())

    monkeypatch.setattr(llm, "_api_key", lambda p: "k")
    monkeypatch.setattr("openai.AsyncOpenAI", lambda **kw: object())
    monkeypatch.setattr(instructor, "from_openai", lambda client, mode=None: _FakeClient())

    llm.usage_var.set([])
    obj = await llm.structured("openrouter", "m", "s", "u", WordPressParams)
    assert obj.title == "T"
    assert llm.usage_var.get()[0]["total_tokens"] == 3   # usage 記入 contextvar


def test_fidelity_guard_detects_dropped_table():
    from app.workflows.article import _fidelity_guard

    before = "文字\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n\n更多"
    after = "改寫後的文字,沒有表格了"
    out, warns = _fidelity_guard(before, after)
    assert warns and "表格" in warns[0]
    assert out == after  # 表格不自動補(位置會錯),只警示


def test_fidelity_guard_reinjects_dropped_image():
    from app.workflows.article import _fidelity_guard

    before = "前文 ![](https://x/a.png) 中間 ![](https://x/b.jpg) 後文"
    after = "改寫後只剩 ![](https://x/a.png)"   # b.jpg 被 AI 丟了
    out, warns = _fidelity_guard(before, after)
    assert any("圖片遺失" in w for w in warns)
    assert "https://x/b.jpg" in out             # 自動補回
    assert "https://x/a.png" in out


def test_fidelity_guard_reinjects_dropped_local_image():
    # 抽取的內嵌圖是相對路徑(/files/images/…),不是 http(s)。
    # 這是「上傳檔的圖被 AI 丟掉」的主路徑,絕不能漏。
    from app.workflows.article import _fidelity_guard

    before = "前文 ![](/files/images/a.png) 中 ![圖2](/files/images/b.jpg) 後"
    after = "改寫後只剩 ![](/files/images/a.png)"   # b.jpg 被 AI 丟了
    out, warns = _fidelity_guard(before, after)
    assert any("圖片遺失" in w for w in warns)
    assert "/files/images/b.jpg" in out            # 相對路徑也要自動補回
    assert "/files/images/a.png" in out


def test_fidelity_guard_clean_no_warning():
    from app.workflows.article import _fidelity_guard

    md = "文 ![](/files/images/a.png)\n\n| a |\n| --- |\n| 1 |"
    out, warns = _fidelity_guard(md, md)
    assert warns == [] and out == md


async def test_runner_captures_stage_tokens():
    """token contextvar 經真實 runner round-trip:stage 內 _record → runner 彙總成 stage 事件 tokens。"""
    from app.core.registry import WORKFLOWS, Workflow, register
    from app.core.stage import Stage
    from app.services import llm
    from app.worker.runner import run_workflow

    async def rec(data, ctx):
        llm._record({"total_tokens": 7})   # 模擬 LLM 呼叫記 token
        return data

    if "test_tok" not in WORKFLOWS:
        register(Workflow(name="test_tok", stages=[Stage("rec", rec)]))
    events = [e async for e in run_workflow("test_tok", {})]
    done = next(e for e in events if e.event == "stage" and e.data.get("status") == "done")
    assert done.data["tokens"] == 7
