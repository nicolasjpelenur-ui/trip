'use client'

import { useState } from 'react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, isSameDay,
  isWithinInterval, parseISO, format, eachWeekOfInterval,
  addDays, addMonths, getDay,
} from 'date-fns'
import { EventWithDetails } from '@/lib/supabase'
import { EventModal } from './EventModal'
import { useTripContext } from './RealtimeProvider'
import { getLocationIcon } from '@/lib/locationIcons'
import { LayoutGrid, Columns2 } from 'lucide-react'

const DAY_HEADERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const EVENT_ROW_H = 20
const MAX_ROWS = 3

function getEventsForDay(events: EventWithDetails[], day: Date) {
  return events.filter((e) => {
    const start = parseISO(e.start_date)
    const end = parseISO(e.end_date)
    return isWithinInterval(day, { start, end }) || isSameDay(day, start) || isSameDay(day, end)
  })
}

interface WeekBar {
  event: EventWithDetails
  colStart: number
  colSpan: number
  row: number
  startsHere: boolean
  endsHere: boolean
}

function getWeekBars(events: EventWithDetails[], weekStart: Date): WeekBar[] {
  const weekEnd = addDays(weekStart, 6)
  const rows: (string | null)[] = [null, null, null, null]
  const bars: WeekBar[] = []

  const relevant = events
    .filter((e) => parseISO(e.start_date) <= weekEnd && parseISO(e.end_date) >= weekStart)
    .sort((a, b) => parseISO(a.start_date).getTime() - parseISO(b.start_date).getTime())

  for (const event of relevant) {
    const start = parseISO(event.start_date)
    const end = parseISO(event.end_date)
    const cStart = start < weekStart ? weekStart : start
    const cEnd = end > weekEnd ? weekEnd : end
    const colStart = getDay(cStart)
    const colSpan = getDay(cEnd) - colStart + 1
    const row = rows.findIndex((r) => r === null || r === event.id)
    if (row >= 0 && row < MAX_ROWS) {
      rows[row] = event.id
      bars.push({ event, colStart, colSpan, row, startsHere: start >= weekStart, endsHere: end <= weekEnd })
    }
  }
  return bars
}

function MonthGrid({
  month, events, onDayClick, compact = false,
}: {
  month: Date
  events: EventWithDetails[]
  onDayClick: (d: Date) => void
  compact?: boolean
}) {
  const weeks = eachWeekOfInterval({
    start: startOfWeek(startOfMonth(month)),
    end: endOfWeek(endOfMonth(month)),
  })

  return (
    <div className="flex flex-col flex-1 min-w-0">
      {/* Month label (compact mode) */}
      {compact && (
        <div className="text-center text-sm font-semibold text-[#1a1614] py-2 border-b border-[#ede8e0]">
          {format(month, 'MMMM yyyy')}
        </div>
      )}

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-[#ede8e0]">
        {DAY_HEADERS.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-semibold text-[#9c8b75] py-1.5 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      {/* Weeks */}
      <div className="flex-1">
        {weeks.map((weekStart) => {
          const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) })
          const bars = getWeekBars(events, weekStart)

          return (
            <div key={weekStart.toISOString()} className="relative border-b border-[#ede8e0] last:border-0">
              <div className="grid grid-cols-7">
                {days.map((day) => {
                  const inMonth = isSameMonth(day, month)
                  const today = isToday(day)
                  const dayCount = getEventsForDay(events, day).length
                  const overflow = dayCount - MAX_ROWS

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => onDayClick(day)}
                      className={`border-r border-[#ede8e0] last:border-r-0 text-left hover:bg-[#f3efe8]/60 active:bg-[#ede8e0] transition-colors ${!inMonth ? 'opacity-30' : ''}`}
                      style={{ minHeight: compact ? 70 : 88, padding: '3px 3px 2px 3px' }}
                    >
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
                        today ? 'bg-[#5b4cf5] text-white' : 'text-[#1a1614]'
                      }`}>
                        {format(day, 'd')}
                      </span>
                      <div style={{ height: MAX_ROWS * EVENT_ROW_H }} />
                      {overflow > 0 && (
                        <div className="text-[9px] text-[#9c8b75] px-0.5">+{overflow}</div>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Event bars overlay */}
              <div className="absolute inset-0 pointer-events-none" style={{ top: 30 }}>
                {bars.map(({ event, colStart, colSpan, row, startsHere, endsHere }) => {
                  const p0 = event.participants[0]
                  if (!p0) return null
                  const Icon = getLocationIcon(event.location.emoji)
                  const PAD = 2
                  return (
                    <div
                      key={`${event.id}-${weekStart.toISOString()}`}
                      className="absolute pointer-events-auto cursor-pointer hover:brightness-90 transition-all animate-bar"
                      style={{
                        left: `calc(${(colStart / 7) * 100}% + ${startsHere ? PAD : 0}px)`,
                        width: `calc(${(colSpan / 7) * 100}% - ${(startsHere ? PAD : 0) + (endsHere ? PAD : 0)}px)`,
                        top: row * EVENT_ROW_H + 1,
                        height: EVENT_ROW_H - 3,
                        backgroundColor: p0.person.color,
                        borderRadius: `${startsHere ? 4 : 0}px ${endsHere ? 4 : 0}px ${endsHere ? 4 : 0}px ${startsHere ? 4 : 0}px`,
                        display: 'flex', alignItems: 'center',
                        paddingLeft: startsHere ? 4 : 1,
                        paddingRight: 3,
                        overflow: 'hidden',
                        zIndex: 10,
                      }}
                      onClick={() => onDayClick(days[colStart])}
                    >
                      {startsHere && (
                        <>
                          <Icon className="text-white/70 flex-shrink-0" style={{ width: 9, height: 9, marginRight: 2 }} />
                          <span className="text-white text-[9px] font-medium truncate leading-none">{event.title}</span>
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
    </div>
  )
}

export function CalendarGrid() {
  const { events, currentMonth, setCurrentMonth, loading, people, setExtraMonth } = useTripContext()
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [activePeople, setActivePeople] = useState<Set<string> | null>(null)
  const [viewMode, setViewMode] = useState<'1' | '2'>('1')

  function toggleViewMode() {
    const next = viewMode === '1' ? '2' : '1'
    setViewMode(next)
    setExtraMonth(next === '2')
  }

  const nextMonth = addMonths(currentMonth, 1)
  const activeIds = activePeople ?? new Set(people.map((p) => p.id))

  const filteredEvents = events
    .map((e) => ({ ...e, participants: e.participants.filter((p) => activeIds.has(p.person_id)) }))
    .filter((e) => e.participants.length > 0)

  const selectedEvents = selectedDay ? getEventsForDay(filteredEvents, selectedDay) : []

  function togglePerson(id: string) {
    setActivePeople((prev) => {
      const base = prev ?? new Set(people.map((p) => p.id))
      const next = new Set(base)
      if (next.has(id) && next.size > 1) next.delete(id)
      else if (!next.has(id)) next.add(id)
      return next
    })
  }

  function prev() { setCurrentMonth(addMonths(currentMonth, -1)) }
  function next() { setCurrentMonth(addMonths(currentMonth, 1)) }

  return (
    <div className="flex flex-col h-full bg-[#faf8f5]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#ede8e0] bg-white">
        <button onClick={prev} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f3efe8] transition-colors text-[#9c8b75]">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-[#1a1614] tracking-tight">
            {viewMode === '2'
              ? `${format(currentMonth, 'MMM')} – ${format(nextMonth, 'MMM yyyy')}`
              : format(currentMonth, 'MMMM yyyy')}
          </h2>
          <button
            onClick={toggleViewMode}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              viewMode === '2' ? 'bg-[#5b4cf5] text-white' : 'bg-[#f3efe8] text-[#9c8b75] hover:bg-[#ede8e0]'
            }`}
            title="Toggle dual-month view"
          >
            {viewMode === '2' ? <Columns2 className="w-3.5 h-3.5" /> : <LayoutGrid className="w-3.5 h-3.5" />}
            <span>{viewMode === '2' ? '2 months' : '1 month'}</span>
          </button>
        </div>

        <button onClick={next} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f3efe8] transition-colors text-[#9c8b75]">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Person filter */}
      {people.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[#ede8e0] bg-white overflow-x-auto">
          <span className="text-[11px] text-[#9c8b75] font-medium flex-shrink-0">Show:</span>
          {people.map((p) => (
            <button
              key={p.id}
              onClick={() => togglePerson(p.id)}
              className="flex items-center gap-1.5 flex-shrink-0 rounded-full px-2 py-1 text-[11px] font-medium transition-all"
              style={{
                backgroundColor: activeIds.has(p.id) ? p.color + '1a' : '#f3efe8',
                color: activeIds.has(p.id) ? p.color : '#9c8b75',
                border: `1.5px solid ${activeIds.has(p.id) ? p.color + '55' : 'transparent'}`,
              }}
            >
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                style={{ backgroundColor: activeIds.has(p.id) ? p.color : '#d4c9b8' }}>
                {p.name.charAt(0)}
              </span>
              {p.name.split(' ')[0]}
            </button>
          ))}
          {loading && <span className="text-[10px] text-[#9c8b75]/50 ml-auto animate-pulse">syncing…</span>}
        </div>
      )}

      {/* Calendar body */}
      <div className={`flex-1 overflow-y-auto ${viewMode === '2' ? 'grid grid-cols-2 sm:grid-cols-2 divide-x divide-[#ede8e0]' : 'flex flex-col'}`}>
        <MonthGrid month={currentMonth} events={filteredEvents} onDayClick={setSelectedDay} compact={viewMode === '2'} />
        {viewMode === '2' && (
          <MonthGrid month={nextMonth} events={filteredEvents} onDayClick={setSelectedDay} compact />
        )}
      </div>

      <EventModal date={selectedDay} events={selectedEvents} onClose={() => setSelectedDay(null)} />
    </div>
  )
}
