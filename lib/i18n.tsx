'use client'

/**
 * Tiny in-house i18n. ~50 lines, no dependencies.
 *
 * Why custom and not next-intl?
 * - We don't want URL-based locale segments (would force /en/dashboard restructure)
 * - The app is small enough that a key-based lookup with localStorage is fine
 * - This avoids ~100KB of next-intl bundle for a feature we use lightly
 *
 * Adding a string: add the key to `messages/en.ts` AND `messages/es.ts`.
 * Missing keys fall back to the key itself (so untranslated strings are visible).
 */

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { messages, Locale } from '@/messages'

const STORAGE_KEY = 'trip:locale'

interface I18nContextValue {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

function lookup(obj: unknown, parts: string[]): string | null {
  let cursor: unknown = obj
  for (const p of parts) {
    if (cursor && typeof cursor === 'object' && p in (cursor as Record<string, unknown>)) {
      cursor = (cursor as Record<string, unknown>)[p]
    } else {
      return null
    }
  }
  return typeof cursor === 'string' ? cursor : null
}

function interpolate(str: string, vars?: Record<string, string | number>) {
  if (!vars) return str
  return str.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m))
}

export function I18nProvider({ children }: { children: ReactNode }) {
  // Default 'en' on the server; client useEffect rehydrates from localStorage.
  const [locale, setLocaleState] = useState<Locale>('en')

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'en' || saved === 'es') setLocaleState(saved)
  }, [])

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    localStorage.setItem(STORAGE_KEY, l)
    document.documentElement.lang = l
  }, [])

  const t = useCallback((key: string, vars?: Record<string, string | number>) => {
    const parts = key.split('.')
    const value = lookup(messages[locale], parts) ?? lookup(messages.en, parts)
    return interpolate(value ?? key, vars)
  }, [locale])

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useT() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useT must be used inside I18nProvider')
  return ctx
}
