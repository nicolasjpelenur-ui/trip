'use client'

import { useEffect } from 'react'

/**
 * Registers the service worker on the client. Mounted once at the app root.
 * Skipped in development to avoid stale-cache headaches; only runs in production.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    if (process.env.NODE_ENV !== 'production') return
    navigator.serviceWorker.register('/sw.js').catch(() => { /* non-fatal */ })
  }, [])
  return null
}
