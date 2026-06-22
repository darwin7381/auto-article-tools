import { describe, expect, test } from 'vitest'
import { mdToSafeHtml } from '../Stages'

describe('mdToSafeHtml — XSS 消毒', () => {
  test('剝除 <script>', () => {
    const out = mdToSafeHtml('正常內文\n\n<script>alert(1)</script>')
    expect(out).not.toContain('<script')
    expect(out).toContain('正常內文')
  })

  test('剝除 img onerror 事件處理器(<img> 變回無事件屬性)', () => {
    const out = mdToSafeHtml('<img src=x onerror="alert(1)">')
    expect(out).toContain('<img')
    expect(out).not.toMatch(/onerror\s*=/i)   // 事件屬性被剝除(留下的只是無害的轉義文字)
  })

  test('剝除 javascript: 連結', () => {
    const out = mdToSafeHtml('[click](javascript:alert(1))')
    expect(out).not.toContain('javascript:')
  })

  test('保留正常 markdown 結構(表格/標題)', () => {
    const out = mdToSafeHtml('# 標題\n\n| a | b |\n| --- | --- |\n| 1 | 2 |')
    expect(out).toContain('<table')
    expect(out).toContain('<h1')
    expect(out).toContain('標題')
  })
})
