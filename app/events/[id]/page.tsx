'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { CalendarDays, ChevronLeft, EyeOff, Home, MapPin, Pencil, Users } from 'lucide-react'
import { NavBar } from '@/components/NavBar'
import { RealtimeProvider } from '@/components/RealtimeProvider'
import { EventComments } from '@/components/EventComments'
import { EventSummaryCard } from '@/components/EventSummaryCard'
import { ItineraryPlanner } from '@/components/ItineraryPlanner'
import { PersonAvatar } from '@/components/PersonChip'
import { EventWithDetails, Person } from '@/lib/supabase'
import { getEvent, getPeople } from '@/lib/queries'

function canSeeEvent(event: EventWithDetails, personId: string | null) {
  if ((event.visibility ?? 'all') === 'all') return true
  if (!personId) return false
  return (
    event.created_by === personId ||
    event.participants.some((participant) => participant.person_id === personId) ||
    (event.viewers ?? []).some((viewer) => viewer.person_id === personId)
  )
}

function canEditEvent(event: EventWithDetails, personId: string | null) {
  if (!personId) return false
  return event.created_by === personId || event.participants.some((participant) => participant.person_id === personId)
}

function EventDetailContent({ id }: { id: string }) {
  const router = useRouter()
  const [event, setEvent] = useState<EventWithDetails | null>(null)
  const [currentPerson, setCurrentPerson] = useState<Person | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    queueMicrotask(async () => {
      const personId = localStorage.getItem('currentPersonId')
      const [loadedEvent, people] = await Promise.all([getEvent(id), getPeople()])
      setEvent(loadedEvent)
      setCurrentPerson(people.find((person) => person.id === personId) ?? null)
      setLoading(false)
    })
  }, [id])

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
  const stayingCount = event.participants.filter((participant) => participant.staying_at_apartment).length

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <button onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-sm text-[#9c8b75] hover:text-[#1a1614]">
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        {canEdit && (
          <Link href={`/events/${event.id}/edit`} className="inline-flex items-center gap-1.5 rounded-xl bg-[#5b4cf5] px-3 py-2 text-sm font-medium text-white hover:bg-[#4a3dd4]">
            <Pencil className="w-4 h-4" />
            Edit event
          </Link>
        )}
      </div>

      <EventSummaryCard event={event} showCountdown />

      <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-4">
          <div className="rounded-xl border border-[#ede8e0] bg-white p-4" style={{ boxShadow: '0 1px 4px rgba(100,60,10,0.07)' }}>
            <h2 className="text-sm font-semibold text-[#1a1614] mb-3">Overview</h2>
            <div className="space-y-2 text-sm text-[#9c8b75]">
              <p className="flex items-center gap-2"><CalendarDays className="w-4 h-4" /> {format(parseISO(event.start_date), 'MMM d, yyyy')} - {format(parseISO(event.end_date), 'MMM d, yyyy')}</p>
              <p className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {event.location.name}</p>
              <p className="flex items-center gap-2"><Users className="w-4 h-4" /> {event.participants.length} participant{event.participants.length === 1 ? '' : 's'}</p>
              {stayingCount > 0 && <p className="flex items-center gap-2"><Home className="w-4 h-4" /> {stayingCount} staying at the apartment</p>}
              {event.visibility !== 'all' && <p className="flex items-center gap-2"><EyeOff className="w-4 h-4" /> Private event</p>}
            </div>
            {event.notes && <p className="text-sm text-[#1a1614] mt-4 leading-relaxed">{event.notes}</p>}
            {event.participants.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-[#9c8b75] mb-2">People</p>
                <div className="flex flex-wrap gap-2">
                  {event.participants.map((participant) => (
                    <span key={participant.id} className="inline-flex items-center gap-1.5 rounded-full bg-[#f3efe8] px-2 py-1 text-xs text-[#1a1614]">
                      <PersonAvatar person={participant.person} size="sm" />
                      {participant.person.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-[#ede8e0] bg-white p-4" style={{ boxShadow: '0 1px 4px rgba(100,60,10,0.07)' }}>
            <h2 className="text-sm font-semibold text-[#1a1614]">Discussion and polls</h2>
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
