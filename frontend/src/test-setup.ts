import '@testing-library/jest-dom/vitest'

// jsdom 無網路連線:讓 fetch 一律拒絕(元件已 .catch),避免測試噴未處理錯誤。
globalThis.fetch = (() => Promise.reject(new Error('no network in test'))) as typeof fetch
