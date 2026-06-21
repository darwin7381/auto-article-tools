# evals/fixtures

評估用參考素材。真實進稿素材在 repo 的 `input-example/`(docx 繁/简、pdf 英/繁、md);
合成夾具由 `backend/tests/test_conversion.py` 即時產生(免外部素材、可斷言排列位置)。

content-faithfulness 評審需要「原文 + 成稿」配對:跑一條真實 article 後,
取 extract 階段輸出當原文、wp.content 當成稿,交給 subagent 比對。
