'use client'

import { useState } from 'react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, isSameDay,
  isWithinInterval, parseISO, format, eachWeekOfInterval,
  addDays, getDay,
} from 'date-fns'
import { EventWithDetails } from '@/lib/supabase'
import { PersonAvatar } from './PersonChip'
import { EventModal } from './EventModal'
import { useTripContext } from './RealtimeProvider'
import { getLocationIcon } from '@/lib/locationIcons'

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const EVENT_ROW_HEIGHT = 22 // px per event row in a day cell
const MAX_EVENT_ROWS = 3

function getEventsForDay(events: EventWithDetails[], day: Date): EventWithDetails[] {
  return events.filter((e) => {
    const start = parseISO(e.start_date)
    const end = parseISO(e.end_date)
    return isWithinInterval(day, { start, end }) || isSameDay(day, start) || isSameDay(day, end)
  })
}

interface WeekEventBar {
  event: EventWithDetails
  colStart: number  // 0-6
  colSpan: number   // 1-7
  row: number
  startsThisWeek: boolean
  endsThisWeek: boolean
}

function getWeekBars(events: EventWithDetails[], weekStart: Date): WeekEventBar[] {
  const weekEnd = addDays(weekStart, 6)
  const rows: (string | null)[] = [null, null, null, null]
  const bars: WeekEventBar[] = []

  const relevant = events.filter((e) => {
    const start = parseISO(e.start_date)
    const end = parseISO(e.end_date)
    return start <= weekEnd && end >= weekStart
  }).sort((a, b) => parseISO(a.start_date).getTime() - parseISO(b.start_date).getTime())

  for (const event of relevant) {
    const start = parseISO(event.start_date)
    const end = parseISO(event.end_date)
    const clampedStart = start < weekStart ? weekStart : start
    const clampedEnd = end > weekEnd ? weekEnd : end
    const colStart = getDay(clampedStart)
    const colSpan = getDay(clampedEnd) - colStart + 1
    const startsThisWeek = start >= weekStart
    const endsThisWeek = end <= weekEnd

    let row = rows.findIndex((r) => r === null || r === event.id)
    if (row === -1) row = MAX_EVENT_ROWS
    if (row < MAX_EVENT_ROWS) {
      rows[row] = event.id
      bars.push({ event, colStart, colSpan, row, startsThisWeek, endsThisWeek })
    }
  }
  return bars
}

export function CalendarGrid() {
  const { events, currentMonth, setCurrentMonth, loading, people } = useTripContext()
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [activePeople, setActivePeople] = useState<Set<string> | null>(null)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const gridStart = startOfWeek(monthStart)
  const gridEnd = endOfWeek(monthEnd)
  const weeks = eachWeekOfInterval({ start: gridStart, end: gridEnd })

  const activeIds = activePeople ?? new Set(people.map((p) => p.id))

  const filteredEvents = events.map((e) => ({
    ...e,
    participants: e.participants.filter((p) => activeIds.has(p.person_id)),
  })).filter((e) => e.participants.length > 0)

  const selectedEvents = selectedDay ? getEventsForDay(filteredEvents, selectedDay) : []

  function togglePerson(id: string) {
    setActivePeople((prev) => {
      const base = prev ?? new Set(people.map((p) => p.id))
      const next = new Set(base)
      if (next.has(id) && next.size > 1) {
        next.delete(id)
      } else if (!next.has(id)) {
        next.add(id)
      }
      return next
    })
  }

  function prevMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }
  function nextMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Month header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-base font-semibold text-gray-900 tracking-tight">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Person filter */}
      {people.length > 0 && (
        <div className="flex items-center gap-2 px-5 py-2.5 border-b border-gray-100 overflow-x-auto">
          <span className="text-xs text-gray-400 font-medium flex-shrink-0">Show:</span>
          {people.map((p) => (
            <button
              key={p.id}
              onClick={() => togglePerson(p.id)}
              className="flex items-center gap-1.5 flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-all"
              style={{
                backgroundColor: activeIds.has(p.id) ? p.color + '22' : '#f3f4f6',
                color: activeIds.has(p.id) ? p.color : '#9ca3af',
                border: `1.5px solid ${activeIds.has(p.id) ? p.color + '66' : 'transparent'}`,
              }}
            >
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                style={{ backgroundColor: activeIds.has(p.id) ? p.color : '#d1d5db' }}
              >
                {p.name.charAt(0).toUpperCase()}
              </span>
              {p.name.split(' ')[0]}
            </button>
          ))}
          {loading && <span className="text-xs text-gray-300 ml-auto">syncing...</span>}
        </div>
      )}

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {DAY_HEADERS.map((d) => (
          <div key={d} className="text-center text-[11px] font-semibold text-gray-400 py-2 tracking-wider uppercase">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar weeks */}
      <div className="flex-1 overflow-y-auto">
        {weeks.map((weekStart) => {
          const weekDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) })
          const bars = getWeekBars(filteredEvents, weekStart)

          return (
            <div key={weekStart.toISOString()} className="relative border-b border-gray-100 last:border-0">
              {/* Day cells row */}
              <div className="grid grid-cols-7">
                {weekDays.map((day) => {
                  const inMonth = isSameMonth(day, currentMonth)
                  const today = isToday(day)
                  const dayEventCount = getEventsForDay(filteredEvents, day).length
                  const overflow = dayEventCount - MAX_EVENT_ROWS

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDay(day)}
                      className={`border-r border-gray-100 last:border-r-0 text-left hover:bg-indigo-50/40 transition-colors ${!inMonth ? 'bg-gray-50/50' : ''}`}
                      style={{ paddingTop: 4, paddingLeft: 4, paddingRight: 4, paddingBottom: overflow > 0 ? 2 : 4, minHeight: 88 }}
                    >
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
                          today
                            ? 'bg-indigo-600 text-white'
                            : inMonth
                            ? 'text-gray-700'
                            : 'text-gray-300'
                        }`}
                      >
                        {format(day, 'd')}
                      </span>
                      {/* spacer for event bars */}
                      <div style={{ height: MAX_EVENT_ROWS * EVENT_ROW_HEIGHT + 2 }} />
                      {overflow > 0 && (
                        <div className="text-[10px] text-gray-400 px-0.5 -mt-1">+{overflow}</div>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Event bars overlay */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ top: 30 }}
              >
                {bars.map(({ event, colStart, colSpan, row, startsThisWeek, endsThisWeek }) => {
                  const firstParticipant = event.participants[0]
                  if (!firstParticipant) return null
                  const color = firstParticipant.person.color
                  const Icon = getLocationIcon(event.location.emoji)

                  const leftPct = (colStart / 7) * 100
                  const widthPct = (colSpan / 7) * 100
                  const topPx = row * EVENT_ROW_HEIGHT + 2
                  const PADDING = 2

                  return (
                    <div
                      key={`${event.id}-${weekStart.toISOString()}`}
                      className="absolute pointer-events-auto cursor-pointer hover:brightness-90 transition-all"
                      style={{
                        left: `calc(${leftPct}% + ${startsThisWeek ? PADDING : 0}px)`,
                        width: `calc(${widthPct}% - ${(startsThisWeek ? PADDING : 0) + (endsThisWeek ? PADDING : 0)}px)`,
                        top: topPx,
                        height: EVENT_ROW_HEIGHT - 3,
                        backgroundColor: color,
                        borderRadius: `${startsThisWeek ? 4 : 0}px ${endsThisWeek ? 4 : 0}px ${endsThisWeek ? 4 : 0}px ${startsThisWeek ? 4 : 0}px`,
                        display: 'flex',
                        alignItems: 'center',
                        paddingLeft: startsThisWeek ? 5 : 2,
                        paddingRight: 4,
                        overflow: 'hidden',
                        zIndex: 10,
                      }}
                      onClick={() => setSelectedDay(weekDays[colStart])}
                    >
                      {startsThisWeek && (
                        <>
                          <Icon className="text-white/80 flex-shrink-0" style={{ width: 10, height: 10, marginRight: 3 }} />
                          <span className="text-white text-[10px] font-medium truncate leading-none">
                            {event.title}
                          </span>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <EventModal
        date={selectedDay}
        events={selectedEvents}
        onClose={() => setSelectedDay(null)}
      />
    </div>
  )
}
