import { describe, expect, test } from 'vitest'
import { safeUrl } from '../Editor'

describe('safeUrl — 編輯器插入連結/圖片的網址防護', () => {
  test('放行 http/https/mailto', () => {
    expect(safeUrl('https://example.com/a')).toBe('https://example.com/a')
    expect(safeUrl('http://x.io')).toBe('http://x.io')
    expect(safeUrl('mailto:a@b.com')).toBe('mailto:a@b.com')
  })
  test('裸網域補 https', () => {
    expect(safeUrl('blocktempo.com/post')).toBe('https://blocktempo.com/post')
    expect(safeUrl('//cdn.x.com/i.png')).toBe('https://cdn.x.com/i.png')
  })
  test('擋掉 javascript: / data: / vbscript: 等注入', () => {
    expect(safeUrl('javascript:alert(1)')).toBeNull()
    expect(safeUrl('data:text/html,<script>')).toBeNull()
    expect(safeUrl('  JavaScript:alert(1)')).toBeNull()
    expect(safeUrl('vbscript:msgbox')).toBeNull()
  })
  test('空字串 / 純文字 → null', () => {
    expect(safeUrl('')).toBeNull()
    expect(safeUrl('just text')).toBeNull()
  })
})
