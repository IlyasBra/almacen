import { registerSW } from 'virtual:pwa-register'

/**
 * Registers the service worker that makes the app work offline. Only in
 * production builds (in dev it would cache stale code) and only where the
 * browser supports it: sandboxed frames and private modes can refuse it.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  try {
    registerSW({ immediate: true })
  } catch (error) {
    console.warn('Service worker could not be registered.', error)
  }
}
