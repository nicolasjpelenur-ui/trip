'use client'

import { useState } from 'react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, isSameDay,
  isWithinInterval, parseISO, format,
} from 'date-fns'
import { EventWithDetails, PersonGroup } from '@/lib/supabase'
import { PersonChip } from './PersonChip'
import { EventModal } from './EventModal'
import { useTripContext } from './RealtimeProvider'

const GROUP_LABELS: Record<PersonGroup, string> = {
  us: 'Us',
  our_family: 'Our Family',
  partner_family: "Partner's Family",
}

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MAX_CHIPS_PER_DAY = 3

function getEventsForDay(events: EventWithDetails[], day: Date): EventWithDetails[] {
  return events.filter((e) => {
    const start = parseISO(e.start_date)
    const end = parseISO(e.end_date)
    return isWithinInterval(day, { start, end }) || isSameDay(day, start) || isSameDay(day, end)
  })
}

export function CalendarGrid() {
  const { events, currentMonth, setCurrentMonth, loading, people } = useTripContext()
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [activeGroups, setActiveGroups] = useState<Set<PersonGroup>>(new Set(['us', 'our_family', 'partner_family']))

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const gridStart = startOfWeek(monthStart)
  const gridEnd = endOfWeek(monthEnd)
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  function toggleGroup(g: PersonGroup) {
    setActiveGroups((prev) => {
      const next = new Set(prev)
      next.has(g) ? next.delete(g) : next.add(g)
      return next
    })
  }

  const activePersonIds = new Set(people.filter((p) => activeGroups.has(p.group)).map((p) => p.id))

  const filteredEvents = events.map((e) => ({
    ...e,
    participants: e.participants.filter((p) => activePersonIds.has(p.person_id)),
  })).filter((e) => e.participants.length > 0)

  const selectedEvents = selectedDay ? getEventsForDay(filteredEvents, selectedDay) : []

  function prevMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }
  function nextMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
          ←
        </button>
        <h2 className="text-lg font-semibold text-gray-900">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
          →
        </button>
      </div>

      {/* Group filter */}
      <div className="flex gap-2 px-4 py-2 border-b border-gray-100 bg-white flex-wrap">
        {(Object.entries(GROUP_LABELS) as [PersonGroup, string][]).map(([g, label]) => (
          <button
            key={g}
            onClick={() => toggleGroup(g)}
            className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
              activeGroups.has(g)
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            {label}
          </button>
        ))}

        {/* Legend */}
        <div className="ml-auto flex gap-2 flex-wrap items-center">
          {people.filter((p) => activePersonIds.has(p.id)).map((p) => (
            <PersonChip key={p.id} person={p} small />
          ))}
        </div>
      </div>

      {loading && (
        <div className="text-center text-gray-400 py-8 text-sm">Loading...</div>
      )}

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {DAY_HEADERS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 flex-1 overflow-y-auto">
        {days.map((day) => {
          const dayEvents = getEventsForDay(filteredEvents, day)
          const inMonth = isSameMonth(day, currentMonth)
          const today = isToday(day)
          const visible = dayEvents.slice(0, MAX_CHIPS_PER_DAY)
          const overflow = dayEvents.length - MAX_CHIPS_PER_DAY

          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDay(day)}
              className={`min-h-[80px] p-1.5 border-b border-r border-gray-100 text-left align-top transition-colors hover:bg-indigo-50 ${
                !inMonth ? 'opacity-30' : ''
              }`}
            >
              <span
                className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium mb-1 ${
                  today ? 'bg-indigo-600 text-white' : 'text-gray-700'
                }`}
              >
                {format(day, 'd')}
              </span>
              <div className="space-y-0.5">
                {visible.map((event) => {
                  const firstParticipant = event.participants[0]
                  if (!firstParticipant) return null
                  return (
                    <div
                      key={event.id}
                      className="text-[10px] px-1.5 py-0.5 rounded-full text-white truncate font-medium flex items-center gap-1"
                      style={{ backgroundColor: firstParticipant.person.color }}
                    >
                      <span className="truncate">{event.title}</span>
                    </div>
                  )
                })}
                {overflow > 0 && (
                  <div className="text-[10px] text-gray-400 px-1">+{overflow} more</div>
                )}
              </div>
            </button>
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
