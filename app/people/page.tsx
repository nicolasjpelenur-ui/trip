'use client'

import { useEffect, useState } from 'react'
import { NavBar } from '@/components/NavBar'
import { RealtimeProvider } from '@/components/RealtimeProvider'
import { PersonAvatar } from '@/components/PersonChip'
import { Person } from '@/lib/supabase'
import { getPeople, updatePerson, updatePersonStatus, getAllEvents } from '@/lib/queries'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react'
import { EventWithDetails } from '@/lib/supabase'
import { parseISO, differenceInCalendarDays, isWithinInterval, format } from 'date-fns'

const COLORS = [
  '#6366f1', '#ec4899', '#f97316', '#10b981',
  '#3b82f6', '#a855f7', '#ef4444', '#14b8a6',
  '#f59e0b', '#84cc16', '#06b6d4', '#d946ef',
  '#f43f5e', '#22c55e', '#0ea5e9', '#e11d48',
  '#7c3aed', '#db2777', '#ea580c', '#16a34a',
  '#2563eb', '#9333ea', '#0891b2', '#65a30d',
]

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
  let cursor = new Date(minDate)

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
          className="flex-1 border border-[#ede8e0] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#5b4cf5]/30 bg-[#faf8f5] text-[#1a1614]"
        >
          <option value="">Person A</option>
          {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <span className="text-[#9c8b75] text-sm font-medium">×</span>
        <select
          value={b}
          onChange={(e) => setB(e.target.value)}
          className="flex-1 border border-[#ede8e0] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#5b4cf5]/30 bg-[#faf8f5] text-[#1a1614]"
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
  const [editing, setEditing] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [showOverlap, setShowOverlap] = useState(false)
  // Password setup
  const [pwEmail, setPwEmail] = useState('')
  const [pwPassword, setPwPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwDone, setPwDone] = useState(false)
  const currentPersonId = typeof window !== 'undefined' ? localStorage.getItem('currentPersonId') : null

  useEffect(() => {
    Promise.all([getPeople(), getAllEvents()]).then(([p, e]) => {
      setPeople(p)
      setEvents(e)
      setLoading(false)
    })
  }, [])

  function startEdit(person: Person) {
    setEditing(person.id)
    setEditName(person.name)
    setEditColor(person.color)
    setEditStatus(person.status ?? '')
  }

  async function saveEdit(id: string) {
    await updatePerson(id, { name: editName, color: editColor })
    await updatePersonStatus(id, editStatus)
    setPeople((prev) =>
      prev.map((p) => p.id === id ? { ...p, name: editName, color: editColor, status: editStatus } : p)
    )
    if (id === currentPersonId) {
      localStorage.setItem('currentPersonName', editName)
      window.dispatchEvent(new CustomEvent('personUpdated', { detail: { name: editName, color: editColor } }))
    }
    setEditing(null)
    setPwEmail(''); setPwPassword(''); setPwError(''); setPwDone(false)
  }

  async function handleSetPassword(personId: string) {
    if (!pwEmail.trim() || pwPassword.length < 6) {
      setPwError('Email and password (min 6 chars) required.')
      return
    }
    setPwSaving(true)
    setPwError('')
    const { data, error } = await supabase.auth.signUp({ email: pwEmail.trim(), password: pwPassword })
    if (error) { setPwError(error.message); setPwSaving(false); return }
    if (data.user) {
      await supabase.from('people').update({ auth_user_id: data.user.id, email: pwEmail.trim() }).eq('id', personId)
      setPeople((prev) => prev.map((p) => p.id === personId ? { ...p, auth_user_id: data.user!.id, email: pwEmail.trim() } : p))
      setPwDone(true)
    }
    setPwSaving(false)
  }

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
            {editing === person.id ? (
              <div className="p-4 space-y-3 bg-[#faf8f5]">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                    style={{ backgroundColor: editColor }}
                  >
                    {editName.charAt(0).toUpperCase() || '?'}
                  </div>
                  <input
                    autoFocus
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 border border-[#ede8e0] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#5b4cf5]/30 bg-white"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Status (e.g. In Valencia, Arriving June 5…)"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  maxLength={60}
                  className="w-full border border-[#ede8e0] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#5b4cf5]/30 bg-white"
                />
                <div>
                  <p className="text-xs text-[#9c8b75] mb-2">Color</p>
                  <div className="flex gap-2 flex-wrap">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setEditColor(c)}
                        className={`w-7 h-7 rounded-full transition-all ${editColor === c ? 'scale-125 ring-2 ring-offset-1 ring-[#9c8b75]' : 'hover:scale-110'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                {/* Password setup — own profile only */}
                {person.id === currentPersonId && (
                  <div className="border-t border-[#ede8e0] pt-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#9c8b75]" />
                      <p className="text-xs font-medium text-[#9c8b75]">Password protection</p>
                    </div>
                    {person.auth_user_id || pwDone ? (
                      <p className="text-xs text-green-600 font-medium">Password is set — profile protected</p>
                    ) : (
                      <div className="space-y-2">
                        <input
                          type="email"
                          placeholder="Email"
                          value={pwEmail}
                          onChange={(e) => setPwEmail(e.target.value)}
                          className="w-full border border-[#ede8e0] rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#5b4cf5]/30 bg-white"
                        />
                        <div className="relative">
                          <input
                            type={showPw ? 'text' : 'password'}
                            placeholder="New password (min 6 chars)"
                            value={pwPassword}
                            onChange={(e) => setPwPassword(e.target.value)}
                            className="w-full border border-[#ede8e0] rounded-xl px-3 py-2 pr-8 text-xs outline-none focus:ring-2 focus:ring-[#5b4cf5]/30 bg-white"
                          />
                          <button type="button" onClick={() => setShowPw((v) => !v)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9c8b75]">
                            {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        {pwError && <p className="text-[11px] text-red-500">{pwError}</p>}
                        <p className="text-[10px] text-[#9c8b75]">
                          Requires email confirmation disabled in Supabase Auth settings.
                        </p>
                        <button
                          onClick={() => handleSetPassword(person.id)}
                          disabled={pwSaving || !pwEmail || pwPassword.length < 6}
                          className="text-xs font-medium text-[#5b4cf5] border border-[#5b4cf5]/30 px-3 py-1.5 rounded-xl hover:bg-[#5b4cf5]/5 disabled:opacity-40 transition-colors"
                        >
                          {pwSaving ? 'Setting…' : 'Set password'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => saveEdit(person.id)}
                    className="bg-[#5b4cf5] text-white text-xs font-medium px-4 py-2 rounded-xl hover:bg-[#4a3dd4] transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="text-[#9c8b75] text-xs border border-[#ede8e0] px-4 py-2 rounded-xl hover:bg-[#f3efe8] transition-colors bg-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 px-4 py-3.5">
                <PersonAvatar person={person} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[#1a1614]">{person.name}</div>
                  {person.status && (
                    <div className="text-xs text-[#9c8b75] truncate mt-0.5">{person.status}</div>
                  )}
                </div>
                {person.id === currentPersonId && (
                  <button
                    onClick={() => startEdit(person)}
                    className="text-xs text-[#9c8b75] hover:text-[#5b4cf5] transition-colors px-2 py-1"
                  >
                    Edit
                  </button>
                )}
              </div>
            )}
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
      <div className="flex flex-col min-h-screen bg-[#faf8f5]">
        <NavBar />
        <PeopleContent />
      </div>
    </RealtimeProvider>
  )
}
