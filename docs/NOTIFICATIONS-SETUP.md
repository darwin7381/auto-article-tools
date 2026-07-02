# 通知外送 —— 已接線待啟用(Joey 指示:之後再一起動)

> 狀態:**後端全部接好,外送凍結中**。沒設環境變數 = 只寫 DB 通知 log(卡片抽屜可見),不外送。
> 啟用只需兩個環境變數,不用改任何程式。2026-07-02。

## 啟用方式(之後要動時)

`backend/.env` 加:

```
TELEGRAM_BOT_TOKEN=<BotFather 拿的 token>
TELEGRAM_CHAT_ID=<部門群 chat id>
```

重啟後端即生效。實作在 `app/services/notify.py`(背景 thread 外送、8s timeout、失敗只記 log 絕不阻塞業務)。

## 已接上通知的觸發點(啟用即全部生效)

### 狀態機驅動(`NOTIFY_ON_STATUS`,services/board.py)
| 進入狀態 | 通知誰 | 內容 |
|---|---|---|
| 等待上稿(awaiting_upload,AI 轉稿完成自動進入) | 編輯部 | 請審稿 + 上稿 |
| 已完成初稿(draft_done) | 編輯部(主審) | 請主審 |
| 客戶潤稿中(client_review) | BD | 請交客戶過稿 |
| 待 LINE 發佈(awaiting_line) | 編輯部 | 今晚 LINE 檔待發 |
| 等待 BD 結案(awaiting_bd_close) | BD | 請回傳客戶並結案 |

### 排程心跳驅動(`worker/scheduler.py`,每 60s,AutomationEvent 防重複)
| 條件 | 通知誰 |
|---|---|
| 初稿 deadline 24h 內 / 逾期 | 編輯部 |
| 發佈 deadline 24h 內 / 逾期 | BD |
| scheduled_publish_at 到點 | 編輯部(執行發佈) |
| Banner takedown_date 到期 | 編輯部(下架) |
| 合約 14 天內到期 / 任一品項額度剩 ≤1 | BD |
| 每日晨報(台北 9:00,`digest_hour_local` 可調) | 群(全文彙總) |

### 手動觸發
- 卡片「通知 BD 回傳客戶」按鈕(附發佈連結,並自動進「等待 BD 結案」狀態)。

## 之後一起動時的待辦(記錄,現在不做)
- [ ] 建 bot + 拿群 chat id,填 env,重啟。
- [ ] 分流:編輯部群 / BD 群分開送(現在單一 chat id;notify.py 加 per-channel chat id 即可)。
- [ ] In-app 通知中心(鈴鐺 + 未讀數;DB Notification 資料已齊,純前端)。
- [ ] @人:名字 → TG username 對映表。
- [ ] 通知偏好(誰要收哪類)。
