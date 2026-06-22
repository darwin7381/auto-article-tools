import { describe, expect, test } from 'vitest'
import { friendlyError, isTransientDown } from '../api'

const FRP_404 = '<!DOCTYPE html><html><head><title>Not Found</title></head><body><h1>The page you requested was not found.</h1><p>powered by <a href="https://github.com/fatedier/frp">frp</a></p></body></html>'

describe('friendlyError — 不把整頁 HTML 丟給使用者', () => {
  test('frp 404 HTML → 友善訊息(不含 HTML 標籤)', () => {
    const m = friendlyError(404, FRP_404)
    expect(m).toContain('後端暫時無法連線')
    expect(m).not.toContain('<')
    expect(m).not.toMatch(/DOCTYPE|html/i)
  })
  test('FastAPI JSON detail → 取 detail', () => {
    expect(friendlyError(400, JSON.stringify({ detail: '不支援的檔案類型 .xyz' }))).toBe('不支援的檔案類型 .xyz')
  })
  test('純文字短錯誤 → 帶狀態碼', () => {
    expect(friendlyError(500, 'boom')).toContain('boom')
  })
})

describe('isTransientDown — 後端重啟空窗才重試', () => {
  test('frp 404 HTML 視為暫時性', () => {
    expect(isTransientDown(404, FRP_404)).toBe(true)
  })
  test('502 / 503 視為暫時性', () => {
    expect(isTransientDown(502, '')).toBe(true)
    expect(isTransientDown(503, '')).toBe(true)
  })
  test('真正的 API 404(JSON)不重試', () => {
    expect(isTransientDown(404, JSON.stringify({ detail: 'not found' }))).toBe(false)
  })
  test('400 業務錯誤不重試', () => {
    expect(isTransientDown(400, JSON.stringify({ detail: 'bad' }))).toBe(false)
  })
})
