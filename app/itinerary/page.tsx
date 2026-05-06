'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import {
  CalendarDays, ChevronRight, Clock, Map, MapPin,
} from 'lucide-react'
import { NavBar } from '@/components/NavBar'
import { RealtimeProvider } from '@/components/RealtimeProvider'
import { PersonAvatar } from '@/components/PersonChip'
import { getLocationColor, getLocationIcon } from '@/lib/locationIcons'
import { getAllEvents, getPeople } from '@/lib/queries'
import { getEventItinerary } from '@/lib/itineraryQueries'
import { EventWithDetails, ItineraryDayWithItems, Person } from '@/lib/supabase'
import { canSeeEvent, today } from '@/lib/eventUtils'
import { createElement } from 'react'

function eventStatus(event: EventWithDetails) {
  const t = today()
  const start = parseISO(event.start_date)
  const end = parseISO(event.end_date)
  const daysTo = differenceInCalendarDays(start, t)
  const daysLeft = differenceInCalendarDays(end, t)
  if (daysTo > 0) return { label: `${daysTo}d away`, color: '#5b4cf5', inProgress: false }
  if (daysLeft >= 0) return { label: `Day ${Math.abs(daysTo) + 1}`, color: '#2ba96a', inProgress: true }
  return { label: 'Finished', color: '#9c8b75', inProgress: false }
}

function ItineraryCard({ event, currentPersonId }: { event: EventWithDetails; currentPersonId: string }) {
  const [expanded, setExpanded] = useState(false)
  const [days, setDays] = useState<ItineraryDayWithItems[] | null>(null)
  const [loading, setLoading] = useState(false)
  const color = getLocationColor(event.location.id)
  const Icon = getLocationIcon(event.location.emoji)
  const status = eventStatus(event)
  const range = `${format(parseISO(event.start_date), 'MMM d')} – ${format(parseISO(event.end_date), 'MMM d, yyyy')}`
  const totalDays = differenceInCalendarDays(parseISO(event.end_date), parseISO(event.start_date)) + 1

  async function toggle() {
    if (!expanded && days === null) {
      setLoading(true)
      try {
        const result = await getEventItinerary(event)
        setDays(result)
      } finally {
        setLoading(false)
      }
    }
    setExpanded((v) => !v)
  }

  const todayStr = format(today(), 'yyyy-MM-dd')
  const todayDay = days?.find((d) => d.day_date === todayStr)
  const highlightDay = todayDay ?? days?.[0]

  return (
    <div className="bg-white border border-[#ede8e0] rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 6px rgba(100,60,10,0.08)' }}>
      {/* Colour strip */}
      <div className="h-1.5" style={{ backgroundColor: color }} />

      {/* Header */}
      <button onClick={toggle} className="w-full text-left px-4 pt-3.5 pb-3 hover:bg-[#faf8f5] transition-colors">
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: `${color}22` }}>
            {createElement(Icon, { className: 'w-4 h-4', style: { color } })}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold text-[#1a1614] truncate">{event.title}</h3>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${status.color}18`, color: status.color }}>
                {status.label}
              </span>
            </div>
            <p className="text-xs text-[#9c8b75] mt-0.5">{event.location.name}</p>
            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[#9c8b75]">
              <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{range}</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{totalDays} day{totalDays !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-0.5 mt-2">
              {event.participants.slice(0, 6).map((p, i) => (
                <span key={p.id} style={{ marginLeft: i > 0 ? -5 : 0, zIndex: 6 - i }}>
                  <PersonAvatar person={p.person} size="sm" />
                </span>
              ))}
              {event.participants.length > 6 && (
                <span className="text-[10px] text-[#9c8b75] ml-1.5">+{event.participants.length - 6}</span>
              )}
            </div>
          </div>
          <ChevronRight className={`w-4 h-4 text-[#c9b99f] flex-shrink-0 mt-1 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </div>
      </button>

      {/* Expanded itinerary preview */}
      {expanded && (
        <div className="border-t border-[#ede8e0]">
          {loading ? (
            <div className="px-4 py-4 text-sm text-[#9c8b75] animate-pulse">Loading itinerary…</div>
          ) : !days || days.every((d) => d.items.length === 0) ? (
            <div className="px-4 py-4 text-center">
              <Map className="w-7 h-7 text-[#c9b99f] mx-auto mb-2" />
              <p className="text-sm text-[#9c8b75]">No itinerary items yet.</p>
              <Link href={`/events/${event.id}`} className="text-xs text-[#5b4cf5] font-medium mt-1 inline-block hover:underline">
                Start planning →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#f3efe8]">
              {/* Show today if in progress, otherwise first two days with items */}
              {(highlightDay ? [highlightDay] : []).concat(
                (days ?? []).filter((d) => d.items.length > 0 && d !== highlightDay).slice(0, highlightDay ? 1 : 2)
              ).map((day) => (
                <div key={day.id} className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-3.5 h-3.5 text-[#e8724a] flex-shrink-0" />
                    <span className="text-[11px] font-semibold text-[#6b5d4f] uppercase tracking-wide">
                      {day.day_date === todayStr
                        ? 'Today'
                        : format(parseISO(day.day_date), 'EEEE, MMM d')}
                      {day.title ? ` · ${day.title}` : ''}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {day.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 text-xs rounded-lg bg-[#f3efe8] px-2.5 py-1.5">
                        {item.start_time && (
                          <span className="text-[10px] font-medium text-[#9c8b75] w-10 flex-shrink-0">{item.start_time.slice(0, 5)}</span>
                        )}
                        <span className="font-medium text-[#1a1614] truncate flex-1">{item.title}</span>
                        {item.place_name && <span className="text-[10px] text-[#9c8b75] truncate">{item.place_name}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="px-4 pb-3.5 pt-2 flex gap-2">
            <Link
              href={`/events/${event.id}`}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[#5b4cf5] text-white text-sm font-medium py-2 hover:bg-[#4a3dd4] transition-colors"
            >
              Open full itinerary
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

function ItineraryContent() {
  const router = useRouter()
  const [currentPerson, setCurrentPerson] = useState<Person | null>(null)
  const [myEvents, setMyEvents] = useState<EventWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const personId = localStorage.getItem('currentPersonId')
      if (!personId) { router.replace('/'); return }
      const [people, allEvents] = await Promise.all([getPeople(), getAllEvents()])
      if (cancelled) return
      const person = people.find((p) => p.id === personId) ?? null
      if (!person) { router.replace('/'); return }

      const participated = allEvents
        .filter((e) =>
          canSeeEvent(e, personId) &&
          (e.created_by === personId || e.participants.some((p) => p.person_id === personId))
        )
        .sort((a, b) => {
          // In-progress first, then upcoming, then finished
          const t = today()
          const aEnd = parseISO(a.end_date)
          const bEnd = parseISO(b.end_date)
          const aInProg = parseISO(a.start_date) <= t && aEnd >= t
          const bInProg = parseISO(b.start_date) <= t && bEnd >= t
          if (aInProg !== bInProg) return aInProg ? -1 : 1
          const aFuture = parseISO(a.start_date) > t
          const bFuture = parseISO(b.start_date) > t
          if (aFuture !== bFuture) return aFuture ? -1 : 1
          return parseISO(a.start_date).getTime() - parseISO(b.start_date).getTime()
        })

      if (cancelled) return
      setCurrentPerson(person)
      setMyEvents(participated)
      setLoading(false)
    }
    queueMicrotask(() => { void load() })
    return () => { cancelled = true }
  }, [router])

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-2xl skeleton" />)}
      </div>
    )
  }

  if (!currentPerson) return null

  const t = today()
  const upcoming = myEvents.filter((e) => parseISO(e.end_date) >= t)
  const past = myEvents.filter((e) => parseISO(e.end_date) < t)

  return (
    <main className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <span className="w-10 h-10 rounded-xl bg-[#fdf0ea] flex items-center justify-center">
          <Map className="w-5 h-5 text-[#e8724a]" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-[#1a1614]">My Itineraries</h1>
          <p className="text-sm text-[#9c8b75]">Events you're part of — tap to see the day-by-day plan</p>
        </div>
      </div>

      {myEvents.length === 0 ? (
        <div className="text-center py-16">
          <Map className="w-12 h-12 text-[#c9b99f] mx-auto mb-3" />
          <h2 className="text-base font-semibold text-[#1a1614]">No events yet</h2>
          <p className="text-sm text-[#9c8b75] mt-1 mb-4">Create an event on the calendar and start filling in the itinerary.</p>
          <Link href="/calendar" className="inline-flex items-center gap-1.5 bg-[#5b4cf5] text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-[#4a3dd4]">
            <CalendarDays className="w-4 h-4" /> Go to calendar
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {upcoming.length > 0 && (
            <>
              <h2 className="text-xs font-semibold text-[#9c8b75] uppercase tracking-wider">Upcoming & in progress</h2>
              {upcoming.map((event) => (
                <ItineraryCard key={event.id} event={event} currentPersonId={currentPerson.id} />
              ))}
            </>
          )}
          {past.length > 0 && (
            <>
              <h2 className="text-xs font-semibold text-[#9c8b75] uppercase tracking-wider mt-2">Past events</h2>
              {past.map((event) => (
                <ItineraryCard key={event.id} event={event} currentPersonId={currentPerson.id} />
              ))}
            </>
          )}
        </div>
      )}
    </main>
  )
}

export default function ItineraryPage() {
  return (
    <RealtimeProvider>
      <div className="flex flex-col min-h-screen bg-[#faf8f5]">
        <NavBar />
        <ItineraryContent />
      </div>
    </RealtimeProvider>
  )
}
