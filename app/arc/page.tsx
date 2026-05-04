'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { NavBar } from '@/components/NavBar'
import { RealtimeProvider } from '@/components/RealtimeProvider'
import { getAllEvents, getPeople } from '@/lib/queries'
import { Person, EventWithDetails } from '@/lib/supabase'
import { getLocationIcon, getLocationColor } from '@/lib/locationIcons'
import { parseISO, format, eachMonthOfInterval, startOfMonth, endOfMonth,
  differenceInCalendarDays, isToday, addDays } from 'date-fns'

const DAY_PX = 22
const ROW_H = 36
const HEADER_H = 48
const NAME_W = 96

function buildDayAxis(minDate: Date, maxDate: Date) {
  const days: Date[] = []
  let d = new Date(minDate)
  while (d <= maxDate) {
    days.push(new Date(d))
    d = addDays(d, 1)
  }
  return days
}

function ArcContent() {
  const router = useRouter()
  const [people, setPeople] = useState<Person[]>([])
  const [events, setEvents] = useState<EventWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [colorMode, setColorMode] = useState<'person' | 'location'>('person')
  const todayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!localStorage.getItem('currentPersonId')) { router.replace('/'); return }
    Promise.all([getPeople(), getAllEvents()]).then(([p, e]) => {
      setPeople(p)
      setEvents(e)
      setLoading(false)
    })
  }, [router])

  useEffect(() => {
    if (!loading) {
      setTimeout(() => todayRef.current?.scrollIntoView({ inline: 'center', behavior: 'smooth' }), 100)
    }
  }, [loading])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="skeleton h-6 w-32 rounded mb-6" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-10 rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 text-center py-16">
        <p className="text-[#9c8b75]">No events yet — add some from the calendar.</p>
      </div>
    )
  }

  const allStarts = events.map((e) => parseISO(e.start_date))
  const allEnds = events.map((e) => parseISO(e.end_date))
  const minDate = new Date(Math.min(...allStarts.map((d) => d.getTime())))
  const maxDate = new Date(Math.max(...allEnds.map((d) => d.getTime())))
  // Pad 3 days on each side
  const axisStart = addDays(minDate, -3)
  const axisEnd = addDays(maxDate, 3)
  const days = buildDayAxis(axisStart, axisEnd)
  const totalDays = days.length

  const months = eachMonthOfInterval({ start: axisStart, end: axisEnd })
  const today = new Date()

  function dayOffset(date: Date) {
    return differenceInCalendarDays(date, axisStart)
  }

  const totalWidth = totalDays * DAY_PX

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page header */}
      <div className="px-5 py-3 border-b border-[#ede8e0] bg-white flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-[#1a1614]">Trip Arc</h1>
          <p className="text-xs text-[#9c8b75]">{format(minDate, 'MMM d')} – {format(maxDate, 'MMM d, yyyy')}</p>
        </div>
        <button
          onClick={() => setColorMode((m) => m === 'person' ? 'location' : 'person')}
          className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
            colorMode === 'location' ? 'bg-[#e8724a] text-white' : 'bg-[#f3efe8] text-[#9c8b75] hover:bg-[#ede8e0]'
          }`}
        >
          {colorMode === 'location' ? 'by place' : 'by person'}
        </button>
      </div>

      {/* Scrollable arc */}
      <div className="flex-1 overflow-auto">
        <div style={{ minWidth: NAME_W + totalWidth + 24 }}>
          {/* Month / day header */}
          <div className="sticky top-0 z-20 bg-white border-b border-[#ede8e0]" style={{ height: HEADER_H }}>
            <div className="flex">
              <div style={{ width: NAME_W, flexShrink: 0 }} />
              <div className="relative" style={{ width: totalWidth, height: HEADER_H }}>
                {/* Month labels */}
                {months.map((m) => {
                  const mStart = startOfMonth(m)
                  const mEnd = endOfMonth(m)
                  const left = Math.max(0, dayOffset(mStart)) * DAY_PX
                  const right = Math.min(totalDays - 1, dayOffset(mEnd)) * DAY_PX + DAY_PX
                  return (
                    <div
                      key={m.toISOString()}
                      className="absolute top-1 text-[10px] font-semibold text-[#9c8b75] uppercase tracking-wider"
                      style={{ left, width: right - left, textAlign: 'center' }}
                    >
                      {format(m, 'MMM yyyy')}
                    </div>
                  )
                })}
                {/* Day numbers */}
                <div className="absolute bottom-1 flex" style={{ left: 0 }}>
                  {days.map((d, i) => {
                    const isMon = d.getDay() === 1
                    const td = isToday(d)
                    return (
                      <div
                        key={i}
                        ref={td ? todayRef : undefined}
                        style={{ width: DAY_PX }}
                        className={`text-center text-[9px] flex-shrink-0 ${
                          td ? 'font-bold text-[#5b4cf5]' : isMon ? 'text-[#9c8b75]' : 'text-transparent'
                        }`}
                      >
                        {isMon || td ? format(d, 'd') : '·'}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Person rows */}
          {people.map((person) => {
            const personEvents = events.filter((e) =>
              e.participants.some((p) => p.person_id === person.id)
            )
            return (
              <div
                key={person.id}
                className="flex items-center border-b border-[#ede8e0] last:border-0 hover:bg-[#faf8f5]/60"
                style={{ height: ROW_H }}
              >
                {/* Name */}
                <div
                  className="flex items-center gap-1.5 px-3 flex-shrink-0"
                  style={{ width: NAME_W }}
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                    style={{ backgroundColor: person.color }}
                  >
                    {person.name.charAt(0)}
                  </div>
                  <span className="text-xs font-medium text-[#1a1614] truncate">{person.name.split(' ')[0]}</span>
                </div>

                {/* Events in this row */}
                <div className="relative flex-1 flex-shrink-0" style={{ width: totalWidth, height: ROW_H }}>
                  {/* Today line */}
                  {today >= axisStart && today <= axisEnd && (
                    <div
                      className="absolute top-0 bottom-0 w-px bg-[#5b4cf5]/30 z-10 pointer-events-none"
                      style={{ left: dayOffset(today) * DAY_PX + DAY_PX / 2 }}
                    />
                  )}

                  {personEvents.map((event) => {
                    const eStart = parseISO(event.start_date)
                    const eEnd = parseISO(event.end_date)
                    const left = dayOffset(eStart) * DAY_PX
                    const width = (differenceInCalendarDays(eEnd, eStart) + 1) * DAY_PX
                    const color = colorMode === 'location'
                      ? getLocationColor(event.location.id)
                      : person.color
                    const Icon = getLocationIcon(event.location.emoji)
                    return (
                      <div
                        key={event.id}
                        className="absolute top-1/2 -translate-y-1/2 rounded-md cursor-pointer hover:brightness-90 transition-all animate-bar flex items-center overflow-hidden"
                        style={{
                          left,
                          width: Math.max(width - 2, DAY_PX),
                          height: ROW_H - 10,
                          backgroundColor: color,
                          paddingLeft: 4,
                          paddingRight: 2,
                          zIndex: 5,
                        }}
                        title={`${event.title} · ${format(eStart, 'MMM d')}–${format(eEnd, 'MMM d')}`}
                        onClick={() => router.push(`/events/${event.id}`)}
                      >
                        <Icon className="text-white/70 flex-shrink-0" style={{ width: 9, height: 9, marginRight: 3 }} />
                        <span className="text-white text-[9px] font-medium truncate leading-none">{event.title}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function ArcPage() {
  return (
    <RealtimeProvider>
      <div className="flex flex-col h-screen bg-[#faf8f5]">
        <NavBar />
        <ArcContent />
      </div>
    </RealtimeProvider>
  )
}
