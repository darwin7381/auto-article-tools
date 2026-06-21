import { describe, expect, test } from 'vitest'
import { jobSource, relTime } from '../App'
import type { Job } from '../api'

const job = (input: unknown): Job => ({ input } as unknown as Job)

describe('jobSource', () => {
  test('URL → 去協定的網域路徑', () => {
    expect(jobSource(job({ url: 'https://medium.com/@x/post' }))).toContain('medium.com')
  })
  test('檔案 → 取檔名', () => {
    expect(jobSource(job({ file: '/data/uploads/abc.docx' }))).toBe('abc.docx')
  })
  test('皆無 → —', () => {
    expect(jobSource(job({}))).toBe('—')
  })
})

describe('relTime', () => {
  test('剛剛 → 秒前', () => {
    expect(relTime(new Date().toISOString())).toContain('秒前')
  })
  test('回傳非空字串', () => {
    expect(relTime('2020-01-01T00:00:00Z')).toMatch(/前/)
  })
})
