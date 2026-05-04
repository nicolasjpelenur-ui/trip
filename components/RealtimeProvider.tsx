'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { supabase, Person, Location, EventWithDetails } from '@/lib/supabase'
import { getPeople, getLocations, getEventsInRange } from '@/lib/queries'
import { startOfMonth, endOfMonth, format } from 'date-fns'

interface TripContextValue {
  people: Person[]
  locations: Location[]
  events: EventWithDetails[]
  currentMonth: Date
  setCurrentMonth: (d: Date) => void
  refresh: () => Promise<void>
  loading: boolean
}

const TripContext = createContext<TripContextValue | null>(null)

export function useTripContext() {
  const ctx = useContext(TripContext)
  if (!ctx) throw new Error('useTripContext must be used inside RealtimeProvider')
  return ctx
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [people, setPeople] = useState<Person[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [events, setEvents] = useState<EventWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
    const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd')
    const [p, l, e] = await Promise.all([
      getPeople(),
      getLocations(),
      getEventsInRange(start, end),
    ])
    setPeople(p)
    setLocations(l)
    setEvents(e)
    setLoading(false)
  }, [currentMonth])

  useEffect(() => {
    setLoading(true)
    refresh()
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

  return (
    <TripContext.Provider value={{ people, locations, events, currentMonth, setCurrentMonth, refresh, loading }}>
      {children}
    </TripContext.Provider>
  )
}
