'use client'

/**
 * Centralized current-person state. Replaces the scattered pattern of:
 *   const id = localStorage.getItem('currentPersonId')
 *   getPeople().then(...)
 *
 * Returns { person, loading, refresh }. Exposes a helper to set/clear
 * the current person consistently (writes localStorage AND fires
 * personUpdated/personSignedOut events).
 */

import { useCallback, useEffect, useState } from 'react'
import { Person } from '@/lib/supabase'
import { getPeople } from '@/lib/queries'

export function useCurrentPerson() {
  const [person, setPerson] = useState<Person | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (typeof window === 'undefined') return
    const id = localStorage.getItem('currentPersonId')
    if (!id) { setPerson(null); setLoading(false); return }
    try {
      const people = await getPeople()
      const found = people.find((p) => p.id === id) ?? null
      setPerson(found)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => { void refresh() })
    function onUpdate() { void refresh() }
    function onSignOut() { setPerson(null); setLoading(false) }
    window.addEventListener('personUpdated', onUpdate)
    window.addEventListener('personSignedOut', onSignOut)
    return () => {
      window.removeEventListener('personUpdated', onUpdate)
      window.removeEventListener('personSignedOut', onSignOut)
    }
  }, [refresh])

  return { person, loading, refresh }
}

/** Helper used by sign-in flows. */
export function setCurrentPerson(person: Person) {
  localStorage.setItem('currentPersonId', person.id)
  localStorage.setItem('currentPersonName', person.name)
  window.dispatchEvent(new CustomEvent('personUpdated', { detail: { name: person.name, color: person.color } }))
}

export function clearCurrentPerson() {
  localStorage.removeItem('currentPersonId')
  localStorage.removeItem('currentPersonName')
  window.dispatchEvent(new Event('personSignedOut'))
}
