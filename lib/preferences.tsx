'use client'

/**
 * Local user preferences — text size, notification opt-ins.
 * Persisted to localStorage on this device. Language lives in i18n.tsx.
 */

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react'

export type TextSize = 'cozy' | 'default' | 'larger'

export interface NotificationPrefs {
  birthdays: boolean
  trips: boolean
  messages: boolean
  polls: boolean
}

interface Preferences {
  textSize: TextSize
  notifications: NotificationPrefs
}

const DEFAULTS: Preferences = {
  textSize: 'default',
  notifications: { birthdays: true, trips: true, messages: false, polls: true },
}

const STORAGE_KEY = 'trip:preferences'
const TEXT_SCALE: Record<TextSize, number> = { cozy: 0.94, default: 1.0, larger: 1.14 }

interface PreferencesContextValue extends Preferences {
  setTextSize: (s: TextSize) => void
  setNotificationPref: (key: keyof NotificationPrefs, value: boolean) => void
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null)

function applyTextSize(size: TextSize) {
  if (typeof document === 'undefined') return
  document.documentElement.style.setProperty('--font-scale', String(TEXT_SCALE[size]))
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Preferences>
        const merged: Preferences = {
          textSize: parsed.textSize ?? DEFAULTS.textSize,
          notifications: { ...DEFAULTS.notifications, ...(parsed.notifications ?? {}) },
        }
        setPrefs(merged)
        applyTextSize(merged.textSize)
      } else {
        applyTextSize(DEFAULTS.textSize)
      }
    } catch {
      applyTextSize(DEFAULTS.textSize)
    }
  }, [])

  const persist = useCallback((next: Preferences) => {
    setPrefs(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* quota */ }
  }, [])

  const setTextSize = useCallback((s: TextSize) => {
    applyTextSize(s)
    persist({ ...prefs, textSize: s })
  }, [prefs, persist])

  const setNotificationPref = useCallback((key: keyof NotificationPrefs, value: boolean) => {
    persist({ ...prefs, notifications: { ...prefs.notifications, [key]: value } })
  }, [prefs, persist])

  return (
    <PreferencesContext.Provider value={{ ...prefs, setTextSize, setNotificationPref }}>
      {children}
    </PreferencesContext.Provider>
  )
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext)
  if (!ctx) throw new Error('usePreferences must be used inside PreferencesProvider')
  return ctx
}
