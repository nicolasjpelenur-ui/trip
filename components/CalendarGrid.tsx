'use client'

import { useRef, useState, useCallback } from 'react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, isSameDay,
  isWithinInterval, parseISO, format, eachWeekOfInterval,
  addDays, addMonths, getDay, min, max,
} from 'date-fns'
import { EventWithDetails } from '@/lib/supabase'
import { EventModal } from './EventModal'
import { useTripContext } from './RealtimeProvider'
import { getLocationIcon, getLocationColor } from '@/lib/locationIcons'
import { updateEventDates } from '@/lib/queries'
import { Users, MapPin, ChevronDown } from 'lucide-react'

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

/** Effective date range for a bar: union of all participant arrival/departure dates */
function effectiveRange(event: EventWithDetails): { start: string; end: string } {
  return event.participants.reduce(
    (acc, p) => ({
      start: p.arrival_date && p.arrival_date < acc.start ? p.arrival_date : acc.start,
      end: p.departure_date && p.departure_date > acc.end ? p.departure_date : acc.end,
    }),
    { start: event.start_date, end: event.end_date }
  )
}

function getWeekBars(events: EventWithDetails[], weekStart: Date, previewResizeId?: string, previewResizeEnd?: Date): WeekBar[] {
  const weekEnd = addDays(weekStart, 6)
  const rows: (string | null)[] = [null, null, null, null]
  const bars: WeekBar[] = []

  const rangeCache = new Map(events.map((e) => [e.id, effectiveRange(e)]))

  const relevant = events
    .filter((e) => {
      const { start: es, end: ee } = rangeCache.get(e.id)!
      return parseISO(es) <= weekEnd && parseISO(ee) >= weekStart
    })
    .sort((a, b) => parseISO(a.start_date).getTime() - parseISO(b.start_date).getTime())

  for (const event of relevant) {
    const { start: effStart, end: effEnd } = rangeCache.get(event.id)!
    const start = parseISO(effStart)
    // Use preview end if we're resizing this event
    const end = (previewResizeId === event.id && previewResizeEnd) ? previewResizeEnd : parseISO(effEnd)
    const cStart = start < weekStart ? weekStart : start
    const cEnd = end > weekEnd ? weekEnd : end
    if (cEnd < cStart) continue
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

interface ResizeState {
  eventId: string
  startX: number
  weekStart: Date
  weekRowWidth: number
  origStartDate: string
  origEndDate: string
  previewEndDate: Date
}

function MonthGrid({
  month, events, onDayClick, onRangeSelect, compact = false, colorMode = 'person', onRefresh,
}: {
  month: Date
  events: EventWithDetails[]
  onDayClick: (d: Date) => void
  onRangeSelect: (start: string, end: string) => void
  compact?: boolean
  colorMode?: 'person' | 'location'
  onRefresh: () => void
}) {
  const [dragStart, setDragStart] = useState<Date | null>(null)
  const [dragEnd, setDragEnd] = useState<Date | null>(null)
  const [resizing, setResizing] = useState<ResizeState | null>(null)
  const weekRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const weeks = eachWeekOfInterval({
    start: startOfWeek(startOfMonth(month)),
    end: endOfWeek(endOfMonth(month)),
  })

  // Day drag-select helpers
  const dragMin = dragStart && dragEnd ? min([dragStart, dragEnd]) : null
  const dragMax = dragStart && dragEnd ? max([dragStart, dragEnd]) : null

  function isDragHighlighted(day: Date) {
    if (!dragMin || !dragMax) return false
    return isWithinInterval(day, { start: dragMin, end: dragMax })
  }

  function handleDayPointerDown(day: Date) {
    setDragStart(day)
    setDragEnd(day)
  }

  function handleDayPointerEnter(day: Date) {
    if (dragStart) setDragEnd(day)
  }

  function handleDayPointerUp(day: Date) {
    if (dragStart && dragEnd && !isSameDay(dragStart, dragEnd)) {
      const s = format(min([dragStart, dragEnd]), 'yyyy-MM-dd')
      const e = format(max([dragStart, dragEnd]), 'yyyy-MM-dd')
      onRangeSelect(s, e)
    } else {
      onDayClick(day)
    }
    setDragStart(null)
    setDragEnd(null)
  }

  // Resize helpers
  const handleResizePointerDown = useCallback((
    e: React.PointerEvent,
    event: EventWithDetails,
    weekStart: Date,
  ) => {
    e.stopPropagation()
    e.preventDefault()
    const rowKey = weekStart.toISOString()
    const rowEl = weekRefs.current.get(rowKey)
    if (!rowEl) return
    const rowRect = rowEl.getBoundingClientRect()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    setResizing({
      eventId: event.id,
      startX: e.clientX,
      weekStart,
      weekRowWidth: rowRect.width,
      origStartDate: event.start_date,
      origEndDate: event.end_date,
      previewEndDate: parseISO(event.end_date),
    })
  }, [])

  const handleResizePointerMove = useCallback((e: React.PointerEvent) => {
    if (!resizing) return
    const dayWidth = resizing.weekRowWidth / 7
    const dayDelta = Math.round((e.clientX - resizing.startX) / dayWidth)
    const newEnd = addDays(parseISO(resizing.origEndDate), dayDelta)
    const minEnd = parseISO(resizing.origStartDate)
    setResizing((r) => r ? { ...r, previewEndDate: newEnd < minEnd ? minEnd : newEnd } : null)
  }, [resizing])

  const handleResizePointerUp = useCallback(async () => {
    if (!resizing) return
    const newEnd = format(resizing.previewEndDate, 'yyyy-MM-dd')
    if (newEnd !== resizing.origEndDate) {
      await updateEventDates(resizing.eventId, resizing.origStartDate, newEnd)
      onRefresh()
    }
    setResizing(null)
  }, [resizing, onRefresh])

  return (
    <div className="flex flex-col flex-1 min-w-0">
      {compact && (
        <div className="text-center text-sm font-semibold text-[#1a1614] py-2 border-b border-[#ede8e0]">
          {format(month, 'MMMM yyyy')}
        </div>
      )}

      <div className="grid grid-cols-7 border-b border-[#ede8e0]">
        {DAY_HEADERS.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-semibold text-[#9c8b75] py-1.5 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      <div className="flex-1">
        {weeks.map((weekStart) => {
          const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) })
          const bars = getWeekBars(
            events, weekStart,
            resizing?.eventId,
            resizing?.weekStart.toISOString() === weekStart.toISOString() ? resizing?.previewEndDate : undefined,
          )
          const rowKey = weekStart.toISOString()

          return (
            <div
              key={rowKey}
              ref={(el) => { if (el) weekRefs.current.set(rowKey, el) }}
              className="relative border-b border-[#ede8e0] last:border-0"
              onPointerMove={resizing ? handleResizePointerMove : undefined}
              onPointerUp={resizing ? handleResizePointerUp : undefined}
            >
              <div className="grid grid-cols-7">
                {days.map((day) => {
                  const inMonth = isSameMonth(day, month)
                  const today = isToday(day)
                  const dayCount = getEventsForDay(events, day).length
                  const overflow = dayCount - MAX_ROWS
                  const highlighted = isDragHighlighted(day)

                  if (compact && !inMonth) {
                    return (
                      <div
                        key={day.toISOString()}
                        className="border-r border-[#ede8e0] last:border-r-0 bg-[#faf8f5]/60"
                        style={{ minHeight: 70 }}
                      />
                    )
                  }

                  return (
                    <button
                      key={day.toISOString()}
                      onPointerDown={() => handleDayPointerDown(day)}
                      onPointerEnter={() => handleDayPointerEnter(day)}
                      onPointerUp={() => handleDayPointerUp(day)}
                      className={`border-r border-[#ede8e0] last:border-r-0 text-left transition-colors select-none ${
                        highlighted
                          ? 'bg-[#5b4cf5]/10'
                          : !inMonth
                            ? 'opacity-30 hover:bg-[#f3efe8]/60'
                            : 'hover:bg-[#f3efe8]/60 active:bg-[#ede8e0]'
                      }`}
                      style={{ minHeight: compact ? 70 : 88, padding: '3px 3px 2px 3px' }}
                    >
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
                        today ? 'bg-[#5b4cf5] text-white' : 'text-[#1a1614]'
                      }`}>
                        {format(day, 'd')}
                      </span>
                      <div style={{ height: MAX_ROWS * EVENT_ROW_H }} />
                      {overflow > 0 && (
                        <div className="text-[9px] font-semibold text-[#5b4cf5] bg-[#5b4cf5]/10 rounded px-1 py-0.5 mx-0.5 leading-none">
                          +{overflow} more
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Event bars overlay */}
              <div className="absolute inset-0 pointer-events-none" style={{ top: 30 }}>
                {bars.map(({ event, colStart, colSpan, row, startsHere, endsHere }) => {
                  if (event.participants.length === 0) return null
                  const locationColor = getLocationColor(event.location.id)
                  const personColors = event.participants.map((p) => p.person.color)
                  const bgStyle = colorMode === 'location'
                    ? { backgroundColor: locationColor }
                    : personColors.length === 1
                      ? { backgroundColor: personColors[0] }
                      : { background: `linear-gradient(to right, ${personColors.join(', ')})` }
                  const Icon = getLocationIcon(event.location.emoji)
                  const PAD = 2
                  const isBeingResized = resizing?.eventId === event.id

                  return (
                    <div
                      key={`${event.id}-${rowKey}`}
                      className={`absolute pointer-events-auto cursor-pointer hover:brightness-90 transition-all ${isBeingResized ? '' : 'animate-bar'}`}
                      style={{
                        left: `calc(${(colStart / 7) * 100}% + ${startsHere ? PAD : 0}px)`,
                        width: `calc(${(colSpan / 7) * 100}% - ${(startsHere ? PAD : 0) + (endsHere ? PAD : 0)}px)`,
                        top: row * EVENT_ROW_H + 1,
                        height: EVENT_ROW_H - 3,
                        ...bgStyle,
                        borderRadius: `${startsHere ? 4 : 0}px ${endsHere ? 4 : 0}px ${endsHere ? 4 : 0}px ${startsHere ? 4 : 0}px`,
                        display: 'flex', alignItems: 'center',
                        paddingLeft: startsHere ? 4 : 1,
                        paddingRight: endsHere ? 8 : 3,
                        overflow: 'hidden',
                        zIndex: 10,
                        opacity: isBeingResized ? 0.85 : 1,
                      }}
                      onClick={() => !resizing && onDayClick(days[colStart])}
                    >
                      {startsHere && (
                        <>
                          <Icon className="text-white/70 flex-shrink-0" style={{ width: 9, height: 9, marginRight: 2 }} />
                          <span className="text-white text-[9px] font-medium truncate leading-none">{event.title}</span>
                        </>
                      )}
                      {/* Resize handle */}
                      {endsHere && (
                        <div
                          className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize flex items-center justify-center"
                          style={{ zIndex: 20 }}
                          onPointerDown={(e) => handleResizePointerDown(e, event, weekStart)}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="w-0.5 h-3 bg-white/50 rounded-full" />
                        </div>
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
  const { events, currentMonth, setCurrentMonth, loading, people, setViewMonths, onlinePersonIds, refresh } = useTripContext()
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [createRange, setCreateRange] = useState<{ start: string; end: string } | null>(null)
  const [activePeople, setActivePeople] = useState<Set<string> | null>(null)
  const [viewCount, setViewCount] = useState(1)
  const [colorMode, setColorMode] = useState<'person' | 'location'>('person')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear())
  const [pickerRangeStart, setPickerRangeStart] = useState<{ year: number; month: number } | null>(null)

  const today = startOfMonth(new Date())
  const isOnToday = currentMonth.getFullYear() === today.getFullYear() && currentMonth.getMonth() === today.getMonth()

  function changeViewCount(n: number) {
    setViewCount(n)
    setViewMonths(n)
  }

  function handlePickerMonth(year: number, month: number) {
    if (!pickerRangeStart) {
      setPickerRangeStart({ year, month })
    } else {
      const startTotal = pickerRangeStart.year * 12 + pickerRangeStart.month
      const endTotal = year * 12 + month
      if (endTotal < startTotal) {
        setPickerRangeStart({ year, month })
      } else {
        const span = endTotal - startTotal + 1
        setCurrentMonth(new Date(pickerRangeStart.year, pickerRangeStart.month, 1))
        changeViewCount(span)
        setPickerRangeStart(null)
        setPickerOpen(false)
      }
    }
  }

  const lastMonth = addMonths(currentMonth, viewCount - 1)
  const activeIds = activePeople ?? new Set(people.map((p) => p.id))
  const currentPersonId = typeof window !== 'undefined' ? localStorage.getItem('currentPersonId') : null

  const filteredEvents = events
    .filter((e) => {
      // Visibility: restricted events only show to allowed people
      const vis = e.visibility ?? 'all'
      if (vis !== 'all') {
        const canSee =
          (e.viewers ?? []).some((v) => v.person_id === currentPersonId) ||
          e.participants.some((p) => p.person_id === currentPersonId) ||
          e.created_by === currentPersonId
        if (!canSee) return false
      }
      // Person filter: hide only if the event *has* participants but none are active
      if (e.participants.length > 0 && !e.participants.some((p) => activeIds.has(p.person_id))) return false
      return true
    })
    .map((e) => ({ ...e, participants: e.participants.filter((p) => activeIds.has(p.person_id)) }))

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
  function goToday() { setCurrentMonth(new Date()) }

  function headerLabel() {
    if (viewCount === 1) return format(currentMonth, 'MMMM yyyy')
    return `${format(currentMonth, 'MMM yyyy')} – ${format(lastMonth, 'MMM yyyy')}`
  }

  const months = Array.from({ length: viewCount }, (_, i) => addMonths(currentMonth, i))
  const isMulti = viewCount > 1
  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  return (
    <div className="flex flex-col h-full bg-[#faf8f5]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#ede8e0] bg-white gap-2">
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={prev} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f3efe8] transition-colors text-[#9c8b75]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          {!isOnToday && (
            <button onClick={goToday} className="text-[11px] font-medium text-[#5b4cf5] px-2 py-1 rounded-full hover:bg-[#5b4cf5]/10 transition-colors whitespace-nowrap">
              Today
            </button>
          )}
        </div>

        <div className="flex flex-col items-center gap-1.5 min-w-0 relative">
          <button
            onClick={() => {
              setPickerOpen((v) => !v)
              setPickerYear(currentMonth.getFullYear())
              setPickerRangeStart(null)
            }}
            className="flex items-center gap-1 text-sm font-semibold text-[#1a1614] tracking-tight hover:text-[#5b4cf5] transition-colors"
          >
            {headerLabel()}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${pickerOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Month range picker */}
          {pickerOpen && (
            <div className="absolute top-full mt-1 z-50 bg-white border border-[#ede8e0] rounded-2xl p-3 w-60" style={{ boxShadow: '0 4px 20px rgba(100,60,10,0.12)' }}>
              <div className="flex items-center justify-between mb-1">
                <button onClick={() => setPickerYear((y) => y - 1)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-[#f3efe8] text-[#9c8b75]">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <span className="text-xs font-semibold text-[#1a1614]">{pickerYear}</span>
                <button onClick={() => setPickerYear((y) => y + 1)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-[#f3efe8] text-[#9c8b75]">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
              {pickerRangeStart && (
                <p className="text-[10px] text-[#9c8b75] text-center mb-1.5">
                  From {MONTH_NAMES[pickerRangeStart.month]} {pickerRangeStart.year} — click end month
                </p>
              )}
              <div className="grid grid-cols-3 gap-1">
                {MONTH_NAMES.map((name, i) => {
                  const isStart = pickerRangeStart?.year === pickerYear && pickerRangeStart?.month === i
                  const isCurrent = !pickerRangeStart && pickerYear === currentMonth.getFullYear() && i === currentMonth.getMonth()
                  const inRange = pickerRangeStart
                    ? (pickerYear * 12 + i) >= (pickerRangeStart.year * 12 + pickerRangeStart.month)
                    : false
                  return (
                    <button
                      key={i}
                      onClick={() => handlePickerMonth(pickerYear, i)}
                      className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        isStart ? 'bg-[#5b4cf5] text-white ring-2 ring-[#5b4cf5]/30' :
                        isCurrent ? 'bg-[#5b4cf5] text-white' :
                        inRange ? 'bg-[#5b4cf5]/10 text-[#5b4cf5]' :
                        'text-[#9c8b75] hover:bg-[#f3efe8] hover:text-[#1a1614]'
                      }`}
                    >
                      {name}
                    </button>
                  )
                })}
              </div>
              {pickerRangeStart && (
                <button onClick={() => setPickerRangeStart(null)} className="mt-2 w-full text-[10px] text-[#9c8b75] hover:text-[#1a1614] transition-colors">
                  Cancel range
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <div className="flex items-center bg-[#f3efe8] rounded-full p-0.5 gap-0.5">
              {[1, 2, 4].map((v) => (
                <button
                  key={v}
                  onClick={() => changeViewCount(v)}
                  className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${viewCount === v ? 'bg-white text-[#1a1614] shadow-sm' : 'text-[#9c8b75] hover:text-[#1a1614]'}`}
                >
                  {v}mo
                </button>
              ))}
            </div>
            <button
              onClick={() => setColorMode((m) => m === 'person' ? 'location' : 'person')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${colorMode === 'location' ? 'bg-[#e8724a] text-white' : 'text-[#9c8b75] hover:bg-[#f3efe8]'}`}
            >
              {colorMode === 'location' ? <MapPin className="w-3 h-3" /> : <Users className="w-3 h-3" />}
              {colorMode === 'location' ? 'place' : 'person'}
            </button>
          </div>
        </div>

        <button onClick={next} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f3efe8] transition-colors text-[#9c8b75] flex-shrink-0">
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
              <div className="relative">
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                  style={{ backgroundColor: activeIds.has(p.id) ? p.color : '#d4c9b8' }}>
                  {p.name.charAt(0)}
                </span>
                {onlinePersonIds.has(p.id) && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-400 border border-white" />
                )}
              </div>
              {p.name.split(' ')[0]}
            </button>
          ))}
          {loading && <span className="text-[10px] text-[#9c8b75]/50 ml-auto animate-pulse">syncing…</span>}
        </div>
      )}

      {/* Calendar body */}
      {isMulti ? (
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 divide-x divide-[#ede8e0]">
            {months.map((m) => (
              <MonthGrid key={m.toISOString()} month={m} events={filteredEvents} onDayClick={setSelectedDay} onRangeSelect={(s, e) => { setCreateRange({ start: s, end: e }); setSelectedDay(parseISO(s)) }} compact colorMode={colorMode} onRefresh={refresh} />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto flex flex-col">
          <MonthGrid month={currentMonth} events={filteredEvents} onDayClick={setSelectedDay} onRangeSelect={(s, e) => { setCreateRange({ start: s, end: e }); setSelectedDay(parseISO(s)) }} compact={false} colorMode={colorMode} onRefresh={refresh} />
        </div>
      )}

      <EventModal date={selectedDay} events={selectedEvents} createRange={createRange} onClose={() => { setSelectedDay(null); setCreateRange(null) }} onRefresh={refresh} />
    </div>
  )
}
