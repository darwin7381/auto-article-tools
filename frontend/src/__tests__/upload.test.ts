import { describe, expect, test } from 'vitest'
import { ACCEPT, acceptOk } from '../Upload'

describe('acceptOk', () => {
  test('接受支援的副檔名', () => {
    for (const ext of ['a.pdf', 'b.docx', 'c.md', 'd.txt', 'e.html', 'f.htm', 'g.rtf', 'h.doc', 'i.odt']) {
      expect(acceptOk(ext)).toBe(true)
    }
  })
  test('拒絕不支援的副檔名', () => {
    expect(acceptOk('x.exe')).toBe(false)
    expect(acceptOk('noext')).toBe(false)
  })
  test('ACCEPT 與舊版相比已擴充', () => {
    expect(ACCEPT).toContain('.odt')
    expect(ACCEPT).toContain('.html')
  })
})
