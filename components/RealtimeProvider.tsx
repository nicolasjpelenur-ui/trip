'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { supabase, Person, Location, EventWithDetails } from '@/lib/supabase'
import { getPeople, getLocations, getEventsInRange } from '@/lib/queries'
import { startOfMonth, endOfMonth, addMonths, format } from 'date-fns'

export interface PresenceEntry {
  personId: string
  name: string
  color: string
  page: string
}

interface TripContextValue {
  people: Person[]
  locations: Location[]
  events: EventWithDetails[]
  currentMonth: Date
  setCurrentMonth: (d: Date) => void
  refresh: () => Promise<void>
  loading: boolean
  viewMonths: number
  setViewMonths: (n: number) => void
  onlinePersonIds: Set<string>
}

const TripContext = createContext<TripContextValue | null>(null)

export function useTripContext() {
  const ctx = useContext(TripContext)
  if (!ctx) throw new Error('useTripContext must be used inside RealtimeProvider')
  return ctx
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [viewMonths, setViewMonths] = useState(1)
  const [people, setPeople] = useState<Person[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [events, setEvents] = useState<EventWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [onlinePersonIds, setOnlinePersonIds] = useState<Set<string>>(new Set())

  const refresh = useCallback(async () => {
    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
    const end = format(endOfMonth(addMonths(currentMonth, viewMonths - 1)), 'yyyy-MM-dd')
    const [p, l, e] = await Promise.all([
      getPeople(),
      getLocations(),
      getEventsInRange(start, end),
    ])
    setPeople(p)
    setLocations(l)
    setEvents(e)
    setLoading(false)
  }, [currentMonth, viewMonths])

  useEffect(() => {
    queueMicrotask(() => {
      setLoading(true)
      void refresh()
    })
  }, [refresh])

  useEffect(() => {
    const channel = supabase
      .channel('trip-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_participants' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'people' }, refresh)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [refresh])

  // Presence tracking
  useEffect(() => {
    const personId = typeof window !== 'undefined' ? localStorage.getItem('currentPersonId') : null
    const personName = typeof window !== 'undefined' ? localStorage.getItem('currentPersonName') : null
    if (!personId || !personName) return

    const presenceChannel = supabase.channel('trip-presence', {
      config: { presence: { key: personId } },
    })

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState<PresenceEntry>()
        const ids = new Set<string>()
        for (const entries of Object.values(state)) {
          for (const e of entries) {
            if (e.personId) ids.add(e.personId)
          }
        }
        setOnlinePersonIds(ids)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const { data } = await supabase.from('people').select('color').eq('id', personId).single()
          await presenceChannel.track({
            personId,
            name: personName,
            color: data?.color ?? '#5b4cf5',
            page: window.location.pathname,
          })
        }
      })

    return () => { supabase.removeChannel(presenceChannel) }
  }, [])

  return (
    <TripContext.Provider value={{ people, locations, events, currentMonth, setCurrentMonth, refresh, loading, viewMonths, setViewMonths, onlinePersonIds }}>
      {children}
    </TripContext.Provider>
  )
}
