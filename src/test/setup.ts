import '@testing-library/jest-dom/vitest'
// In-memory IndexedDB so Dexie works under jsdom.
import 'fake-indexeddb/auto'

import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'

import { setLanguagePreference } from '@/i18n'

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

// The tests assert on Spanish texts, whatever the language of the machine running them.
beforeEach(() => {
  setLanguagePreference('es', { persist: false })
})

afterEach(() => {
  cleanup()
  // Preferences are stored in localStorage; keep tests independent.
  window.localStorage.clear()
  document.documentElement.classList.remove('dark')
})
