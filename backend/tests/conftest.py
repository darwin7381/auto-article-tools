"""測試用：在 import app 前把 DB / 資料夾指向暫存，隔離真實 data/app.db。"""

from __future__ import annotations

import os
import tempfile

_tmp = tempfile.mkdtemp(prefix="bdtest-")
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
os.environ["DATA_DIR"] = _tmp
os.environ.setdefault("MAX_CONCURRENT_JOBS", "4")
# 排程心跳在測試裡不自動跑(改由測試直接呼叫 run_once / 各 check,確保決定論)
os.environ.setdefault("SCHEDULER_ENABLED", "false")
