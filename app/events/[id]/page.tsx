'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { format, parseISO, differenceInCalendarDays } from 'date-fns'
import {
  CalendarDays, ChevronLeft, EyeOff, Home,
  MapPin, Pencil, UserMinus, UserPlus, Users,
} from 'lucide-react'
import { NavBar } from '@/components/NavBar'
import { RealtimeProvider } from '@/components/RealtimeProvider'
import { EventComments } from '@/components/EventComments'
import { EventSummaryCard } from '@/components/EventSummaryCard'
import { ItineraryPlanner } from '@/components/ItineraryPlanner'
import { PersonAvatar } from '@/components/PersonChip'
import { EventWithDetails, Person } from '@/lib/supabase'
import { getEvent, getPeople, logActivity, upsertEventParticipant, removeEventParticipant } from '@/lib/queries'
import { canSeeEvent, canEditEvent } from '@/lib/eventUtils'

/** Banner shown when the logged-in user is not yet a participant */
function JoinBanner({
  event,
  currentPerson,
  onJoined,
}: {
  event: EventWithDetails
  currentPerson: Person
  onJoined: () => void
}) {
  const [arrival, setArrival] = useState(event.start_date)
  const [departure, setDeparture] = useState(event.end_date)
  const [staying, setStaying] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const totalDays = differenceInCalendarDays(parseISO(event.end_date), parseISO(event.start_date)) + 1
  const customDays = differenceInCalendarDays(parseISO(departure), parseISO(arrival)) + 1
  const isPartial = arrival !== event.start_date || departure !== event.end_date

  async function handleJoin() {
    setSaving(true)
    try {
      await upsertEventParticipant(event.id, currentPerson.id, {
        staying_at_apartment: staying,
        arrival_date: arrival !== event.start_date ? arrival : null,
        departure_date: departure !== event.end_date ? departure : null,
      })
      logActivity(currentPerson.id, 'joined_event', event.title, 'event', event.id)
      onJoined()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border-2 border-[#5b4cf5]/25 bg-[#5b4cf5]/5 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#5b4cf5] flex items-center justify-center flex-shrink-0 mt-0.5">
          <UserPlus className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#1a1614]">You're not part of this event yet</p>
          <p className="text-xs text-[#9c8b75] mt-0.5">
            The event runs {totalDays} day{totalDays !== 1 ? 's' : ''} — you can join for the full stay or just the days you'll be there.
          </p>
        </div>
      </div>

      {/* Quick join (full stay) or expand for custom dates */}
      {!expanded ? (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleJoin}
            disabled={saving}
            className="flex items-center gap-1.5 text-sm font-semibold text-white bg-[#5b4cf5] px-4 py-2 rounded-xl hover:bg-[#4a3dd4] disabled:opacity-50 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            {saving ? 'Joining…' : `Join for full stay (${format(parseISO(event.start_date), 'MMM d')} – ${format(parseISO(event.end_date), 'MMM d')})`}
          </button>
          <button
            onClick={() => setExpanded(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-[#5b4cf5] px-4 py-2 rounded-xl border border-[#5b4cf5]/30 hover:bg-[#5b4cf5]/8 transition-colors"
          >
            <CalendarDays className="w-4 h-4" />
            I'm joining for different dates
          </button>
        </div>
      ) : (
        <div className="space-y-3 bg-white rounded-xl p-3 border border-[#ede8e0]">
          <p className="text-xs font-semibold text-[#1a1614]">Choose your arrival and departure</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-[#9c8b75] block mb-1">Your arrival</label>
              <input
                type="date"
                value={arrival}
                onChange={(e) => { setArrival(e.target.value); if (departure < e.target.value) setDeparture(e.target.value) }}
                className="w-full border border-[#ede8e0] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#5b4cf5]/30 bg-[#faf8f5] text-[#1a1614]"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[#9c8b75] block mb-1">Your departure</label>
              <input
                type="date"
                value={departure}
                min={arrival}
                onChange={(e) => setDeparture(e.target.value)}
                className="w-full border border-[#ede8e0] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#5b4cf5]/30 bg-[#faf8f5] text-[#1a1614]"
              />
            </div>
          </div>

          {isPartial && (
            <p className="text-xs text-[#5b4cf5] bg-[#5b4cf5]/8 rounded-lg px-2.5 py-1.5">
              You'll be there for {customDays} day{customDays !== 1 ? 's' : ''} out of {totalDays}. The calendar bar will extend to cover your dates.
            </p>
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={staying}
              onChange={(e) => setStaying(e.target.checked)}
              className="rounded border-[#ede8e0] accent-[#5b4cf5]"
            />
            <span className="text-sm text-[#6b5d4f] flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5 text-[#e8724a]" />
              I'll be staying at the apartment
            </span>
          </label>

          <div className="flex gap-2">
            <button
              onClick={handleJoin}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold text-white bg-[#5b4cf5] py-2.5 rounded-xl hover:bg-[#4a3dd4] disabled:opacity-50 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              {saving ? 'Joining…' : 'Confirm & join'}
            </button>
            <button
              onClick={() => setExpanded(false)}
              className="text-sm text-[#9c8b75] px-4 py-2.5 rounded-xl hover:bg-[#f3efe8] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Shows each participant with their individual date range */
function ParticipantRoster({ event }: { event: EventWithDetails }) {
  return (
    <div className="space-y-2">
      {event.participants.map((p) => {
        const arrival = p.arrival_date ?? event.start_date
        const departure = p.departure_date ?? event.end_date
        const hasCustom = p.arrival_date || p.departure_date
        return (
          <div key={p.id} className="flex items-center gap-2.5 rounded-xl bg-[#f3efe8] px-3 py-2">
            <PersonAvatar person={p.person} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#1a1614] truncate">{p.person.name}</p>
              <p className="text-[11px] text-[#9c8b75]">
                {hasCustom
                  ? `${format(parseISO(arrival), 'MMM d')} – ${format(parseISO(departure), 'MMM d')}`
                  : 'Full stay'}
              </p>
            </div>
            {p.staying_at_apartment && (
              <span className="flex items-center gap-1 text-[10px] font-medium text-[#e8724a] bg-[#fdf0ea] rounded-full px-2 py-0.5">
                <Home className="w-3 h-3" /> Apt
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

function EventDetailContent({ id }: { id: string }) {
  const router = useRouter()
  const [event, setEvent] = useState<EventWithDetails | null>(null)
  const [currentPerson, setCurrentPerson] = useState<Person | null>(null)
  const [loading, setLoading] = useState(true)
  const [leaving, setLeaving] = useState(false)

  async function load() {
    const personId = localStorage.getItem('currentPersonId')
    const [loadedEvent, people] = await Promise.all([getEvent(id), getPeople()])
    setEvent(loadedEvent)
    setCurrentPerson(people.find((p) => p.id === personId) ?? null)
    setLoading(false)
  }

  useEffect(() => {
    queueMicrotask(() => { void load() })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleLeave() {
    if (!event || !currentPerson) return
    setLeaving(true)
    try {
      await removeEventParticipant(event.id, currentPerson.id)
      logActivity(currentPerson.id, 'left_event', event.title, 'event', event.id)
      void load()
    } finally {
      setLeaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <div className="skeleton h-10 w-48 rounded-xl" />
        <div className="skeleton h-48 rounded-xl" />
        <div className="skeleton h-64 rounded-xl" />
      </div>
    )
  }

  if (!event) return <div className="text-center py-8 text-[#9c8b75]">Event not found</div>

  const currentPersonId = currentPerson?.id ?? null
  if (!canSeeEvent(event, currentPersonId)) {
    return <div className="text-center py-8 text-[#9c8b75]">You do not have access to this event.</div>
  }

  const canEdit = canEditEvent(event, currentPersonId)
  const isParticipant = currentPerson
    ? event.participants.some((p) => p.person_id === currentPerson.id)
    : false
  const isCreator = currentPerson ? event.created_by === currentPerson.id : false
  const showJoinBanner = currentPerson && !isParticipant && !isCreator
  const stayingCount = event.participants.filter((p) => p.staying_at_apartment).length

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm text-[#9c8b75] hover:text-[#1a1614]"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-2">
          {isParticipant && !isCreator && (
            <button
              onClick={handleLeave}
              disabled={leaving}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#ede8e0] bg-white text-[#e8724a] px-3 py-2 text-sm font-medium hover:bg-[#fdf0ea] disabled:opacity-50 transition-colors"
            >
              <UserMinus className="w-4 h-4" />
              {leaving ? 'Leaving…' : 'Leave event'}
            </button>
          )}
          {canEdit && (
            <Link
              href={`/events/${event.id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#5b4cf5] px-3 py-2 text-sm font-medium text-white hover:bg-[#4a3dd4]"
            >
              <Pencil className="w-4 h-4" /> Edit event
            </Link>
          )}
        </div>
      </div>

      <EventSummaryCard event={event} showCountdown />

      {/* Join banner — only for logged-in non-participants */}
      {showJoinBanner && (
        <JoinBanner
          event={event}
          currentPerson={currentPerson}
          onJoined={() => { void load() }}
        />
      )}

      <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-4">
          {/* Overview */}
          <div className="rounded-xl border border-[#ede8e0] bg-white p-4" style={{ boxShadow: '0 1px 4px rgba(100,60,10,0.07)' }}>
            <h2 className="text-sm font-semibold text-[#1a1614] mb-3">Overview</h2>
            <div className="space-y-2 text-sm text-[#9c8b75]">
              <p className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 flex-shrink-0" />
                {format(parseISO(event.start_date), 'MMM d, yyyy')} – {format(parseISO(event.end_date), 'MMM d, yyyy')}
              </p>
              <p className="flex items-center gap-2"><MapPin className="w-4 h-4 flex-shrink-0" /> {event.location.name}</p>
              <p className="flex items-center gap-2">
                <Users className="w-4 h-4 flex-shrink-0" />
                {event.participants.length} participant{event.participants.length === 1 ? '' : 's'}
              </p>
              {stayingCount > 0 && (
                <p className="flex items-center gap-2"><Home className="w-4 h-4 flex-shrink-0" /> {stayingCount} staying at the apartment</p>
              )}
              {event.visibility !== 'all' && (
                <p className="flex items-center gap-2"><EyeOff className="w-4 h-4 flex-shrink-0" /> Private event</p>
              )}
            </div>
            {event.notes && <p className="text-sm text-[#1a1614] mt-4 leading-relaxed">{event.notes}</p>}

            {/* Participant roster with individual date ranges */}
            {event.participants.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-[#9c8b75] mb-2">Who's going</p>
                <ParticipantRoster event={event} />
              </div>
            )}
          </div>

          <div className="rounded-xl border border-[#ede8e0] bg-white p-4" style={{ boxShadow: '0 1px 4px rgba(100,60,10,0.07)' }}>
            <h2 className="text-sm font-semibold text-[#1a1614]">Discussion & polls</h2>
            <EventComments eventId={event.id} currentPerson={currentPerson} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold text-[#1a1614]">Itinerary</h2>
              <p className="text-sm text-[#9c8b75]">Plan each day with activities, places, and flexible timing.</p>
            </div>
          </div>
          <ItineraryPlanner event={event} canEdit={canEdit} currentPersonId={currentPersonId} />
        </div>
      </section>
    </main>
  )
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  return (
    <RealtimeProvider>
      <div className="flex flex-col min-h-screen bg-[#faf8f5]">
        <NavBar />
        <EventDetailContent id={id} />
      </div>
    </RealtimeProvider>
  )
}
