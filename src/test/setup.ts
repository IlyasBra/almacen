import '@testing-library/jest-dom/vitest'
// In-memory IndexedDB so Dexie works under jsdom.
import 'fake-indexeddb/auto'

import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// jsdom does not implement modal <dialog>. Minimal stand-in: toggle the
// `open` attribute and fire "close" like a real browser does.
if (!('showModal' in HTMLDialogElement.prototype)) {
  Object.assign(HTMLDialogElement.prototype, {
    showModal(this: HTMLDialogElement) {
      this.setAttribute('open', '')
    },
    close(this: HTMLDialogElement) {
      if (!this.open) return
      this.removeAttribute('open')
      this.dispatchEvent(new Event('close'))
    },
  })
}

// jsdom does not implement matchMedia. Minimal stand-in: nothing ever matches.
if (typeof window.matchMedia !== 'function') {
  Object.assign(window, {
    matchMedia: (query: string): MediaQueryList =>
      ({
        matches: false,
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }) as unknown as MediaQueryList,
  })
}

afterEach(() => {
  cleanup()
  // Preferences are stored in localStorage; keep tests independent.
  window.localStorage.clear()
  document.documentElement.classList.remove('dark')
})
