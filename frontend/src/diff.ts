/** 行級 diff（LCS）——讓編輯一眼看出 AI 在這一步改了什麼。 */

export type DiffLine = { kind: 'same' | 'add' | 'del'; text: string }

export function lineDiff(oldText: string, newText: string, maxLines = 400): DiffLine[] {
  const a = oldText.split('\n').slice(0, maxLines)
  const b = newText.split('\n').slice(0, maxLines)
  const n = a.length, m = b.length
  // LCS DP（行數已裁切，n*m 安全）
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
  const out: DiffLine[] = []
  let i = 0, j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) { out.push({ kind: 'same', text: a[i] }); i++; j++ }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ kind: 'del', text: a[i] }); i++ }
    else { out.push({ kind: 'add', text: b[j] }); j++ }
  }
  while (i < n) out.push({ kind: 'del', text: a[i++] })
  while (j < m) out.push({ kind: 'add', text: b[j++] })
  return out
}

/** 摺疊連續未變動行（保留前後 1 行上下文），diff 才看得到重點。 */
export function collapseSame(lines: DiffLine[], context = 1): (DiffLine | { kind: 'skip'; count: number })[] {
  const out: (DiffLine | { kind: 'skip'; count: number })[] = []
  let buf: DiffLine[] = []
  const flush = (isEnd: boolean) => {
    if (buf.length <= context * 2 + 1) { out.push(...buf) }
    else {
      out.push(...buf.slice(0, context))
      out.push({ kind: 'skip', count: buf.length - context * (isEnd ? 1 : 2) })
      if (!isEnd) out.push(...buf.slice(-context))
    }
    buf = []
  }
  for (const l of lines) {
    if (l.kind === 'same') buf.push(l)
    else { flush(false); out.push(l) }
  }
  flush(true)
  return out
}
