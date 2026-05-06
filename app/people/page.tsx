'use client'

import { useEffect, useState } from 'react'
import { NavBar } from '@/components/NavBar'
import { RealtimeProvider } from '@/components/RealtimeProvider'
import { PersonAvatar } from '@/components/PersonChip'
import { Person } from '@/lib/supabase'
import { getPeople, getAllEvents } from '@/lib/queries'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { EventWithDetails } from '@/lib/supabase'
import { parseISO, differenceInCalendarDays, isWithinInterval, format } from 'date-fns'

function getSharedDays(a: Person, b: Person, events: EventWithDetails[]) {
  // Collect all date ranges where each person appears
  const aRanges = events
    .filter((e) => e.participants.some((p) => p.person_id === a.id))
    .map((e) => ({ start: parseISO(e.start_date), end: parseISO(e.end_date) }))
  const bRanges = events
    .filter((e) => e.participants.some((p) => p.person_id === b.id))
    .map((e) => ({ start: parseISO(e.start_date), end: parseISO(e.end_date) }))

  if (!aRanges.length || !bRanges.length) return { days: 0, overlaps: [] }

  // Find date range to check
  const allDates = [...aRanges, ...bRanges]
  const minDate = new Date(Math.min(...allDates.map((r) => r.start.getTime())))
  const maxDate = new Date(Math.max(...allDates.map((r) => r.end.getTime())))

  const overlaps: { start: Date; end: Date }[] = []
  let totalDays = 0
  const cursor = new Date(minDate)

  while (cursor <= maxDate) {
    const inA = aRanges.some((r) => isWithinInterval(cursor, { start: r.start, end: r.end }))
    const inB = bRanges.some((r) => isWithinInterval(cursor, { start: r.start, end: r.end }))
    if (inA && inB) {
      totalDays++
      const last = overlaps[overlaps.length - 1]
      const prev = new Date(cursor)
      prev.setDate(prev.getDate() - 1)
      if (last && last.end.getTime() >= prev.getTime()) {
        last.end = new Date(cursor)
      } else {
        overlaps.push({ start: new Date(cursor), end: new Date(cursor) })
      }
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  return { days: totalDays, overlaps }
}

function OverlapCalculator({ people, events }: { people: Person[]; events: EventWithDetails[] }) {
  const [a, setA] = useState<string>('')
  const [b, setB] = useState<string>('')

  const personA = people.find((p) => p.id === a)
  const personB = people.find((p) => p.id === b)
  const result = personA && personB ? getSharedDays(personA, personB, events) : null

  return (
    <div className="mt-6 bg-white rounded-2xl border border-[#ede8e0] p-4" style={{ boxShadow: '0 1px 4px rgba(100,60,10,0.07)' }}>
      <h2 className="text-sm font-semibold text-[#1a1614] mb-3">Overlap Calculator</h2>
      <div className="flex items-center gap-2">
        <select
          value={a}
          onChange={(e) => setA(e.target.value)}
          className="flex-1 border border-[#ede8e0] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#5b4cf5]/30 bg-[#faf7f2] text-[#1a1614]"
        >
          <option value="">Person A</option>
          {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <span className="text-[#9c8b75] text-sm font-medium">×</span>
        <select
          value={b}
          onChange={(e) => setB(e.target.value)}
          className="flex-1 border border-[#ede8e0] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#5b4cf5]/30 bg-[#faf7f2] text-[#1a1614]"
        >
          <option value="">Person B</option>
          {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {result && a !== b && (
        <div className="mt-3">
          {result.days === 0 ? (
            <p className="text-sm text-[#9c8b75]">No overlapping days found.</p>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: personA!.color }} />
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: personB!.color }} />
                <span className="text-sm font-semibold text-[#1a1614]">{result.days} shared day{result.days !== 1 ? 's' : ''}</span>
              </div>
              <div className="space-y-1">
                {result.overlaps.slice(0, 5).map((o, i) => (
                  <div key={i} className="text-xs text-[#9c8b75]">
                    {o.start.getTime() === o.end.getTime()
                      ? format(o.start, 'MMM d')
                      : `${format(o.start, 'MMM d')} – ${format(o.end, 'MMM d')}`}
                    {' '}
                    <span className="text-[#9c8b75]/60">
                      ({differenceInCalendarDays(o.end, o.start) + 1} day{differenceInCalendarDays(o.end, o.start) > 0 ? 's' : ''})
                    </span>
                  </div>
                ))}
                {result.overlaps.length > 5 && (
                  <div className="text-xs text-[#9c8b75]/60">+{result.overlaps.length - 5} more periods</div>
                )}
              </div>
            </>
          )}
        </div>
      )}
      {a === b && a !== '' && (
        <p className="text-xs text-[#9c8b75] mt-2">Pick two different people.</p>
      )}
    </div>
  )
}

function PeopleContent() {
  const [people, setPeople] = useState<Person[]>([])
  const [events, setEvents] = useState<EventWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [showOverlap, setShowOverlap] = useState(false)

  useEffect(() => {
    Promise.all([getPeople(), getAllEvents()]).then(([p, e]) => {
      setPeople(p)
      setEvents(e)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="skeleton h-6 w-24 rounded mb-4" />
        <div className="bg-white rounded-2xl border border-[#ede8e0] overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-b border-[#ede8e0] last:border-0">
              <div className="skeleton w-9 h-9 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <div className="skeleton h-3.5 rounded w-28" />
                <div className="skeleton h-2.5 rounded w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-[#1a1614] mb-1">People</h1>
      <p className="text-sm text-[#9c8b75] mb-5">Everyone joining the trip.</p>

      <div className="bg-white rounded-2xl border border-[#ede8e0] overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(100,60,10,0.07)' }}>
        {people.length === 0 && (
          <div className="text-center text-[#9c8b75] py-8 text-sm">No people yet — add yourself from the home screen.</div>
        )}
        {people.map((person) => (
          <div key={person.id} className="border-b border-[#ede8e0] last:border-0">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <PersonAvatar person={person} size="md" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#1a1614]">{person.name}</div>
                {person.status && (
                  <div className="text-xs text-[#9c8b75] truncate mt-0.5">{person.status}</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Overlap Calculator */}
      {people.length >= 2 && (
        <>
          <button
            onClick={() => setShowOverlap((v) => !v)}
            className="mt-4 flex items-center gap-1.5 text-sm font-medium text-[#9c8b75] hover:text-[#1a1614] transition-colors"
          >
            {showOverlap ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Overlap Calculator
          </button>
          {showOverlap && <OverlapCalculator people={people} events={events} />}
        </>
      )}
    </div>
  )
}

export default function PeoplePage() {
  return (
    <RealtimeProvider>
      <div className="flex flex-col min-h-screen bg-[#faf7f2]">
        <NavBar />
        <PeopleContent />
      </div>
    </RealtimeProvider>
  )
}
