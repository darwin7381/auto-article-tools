import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// 每個測試後強制卸載(避免多個 <App> 堆疊在 document.body → getByRole 撞到多個同名節點而 flaky)。
afterEach(() => cleanup())

// jsdom 無網路連線:讓 fetch 一律拒絕(元件已 .catch),避免測試噴未處理錯誤。
globalThis.fetch = (() => Promise.reject(new Error('no network in test'))) as typeof fetch
