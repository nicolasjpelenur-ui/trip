'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { EventWithDetails, Person } from '@/lib/supabase'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { deleteEvent, logActivity, upsertEventParticipant, removeEventParticipant } from '@/lib/queries'
import { getPeople } from '@/lib/queries'
import { EventComments } from './EventComments'
import { EventForm } from './EventForm'
import { EventSummaryCard } from './EventSummaryCard'
import { PersonAvatar } from './PersonChip'
import { ArrowLeft, CalendarDays, Check, Home, Pencil, Plus, Trash2, UserPlus, UserMinus } from 'lucide-react'

interface EventModalProps {
  date: Date | null
  events: EventWithDetails[]
  onClose: () => void
  onRefresh: () => void
  createRange?: { start: string; end: string } | null
}

/** Two-step join panel: quick full-stay button, or expand for custom dates */
function JoinEventPanel({
  event,
  currentPerson,
  onDone,
}: {
  event: EventWithDetails
  currentPerson: Person
  onDone: () => void
}) {
  const [customDates, setCustomDates] = useState(false)
  const [arrival, setArrival] = useState(event.start_date)
  const [departure, setDeparture] = useState(event.end_date)
  const [staying, setStaying] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleJoin(useCustom: boolean) {
    setSaving(true)
    try {
      await upsertEventParticipant(event.id, currentPerson.id, {
        staying_at_apartment: staying,
        arrival_date: useCustom && arrival !== event.start_date ? arrival : null,
        departure_date: useCustom && departure !== event.end_date ? departure : null,
      })
      logActivity(currentPerson.id, 'joined_event', event.title, 'event', event.id)
      onDone()
    } finally {
      setSaving(false)
    }
  }

  const rangeLabel = `${format(parseISO(event.start_date), 'MMM d')}–${format(parseISO(event.end_date), 'MMM d')}`

  return (
    <div className="px-3.5 pb-3.5 pt-2.5 border-t border-[#5b4cf5]/20 bg-[#5b4cf5]/5 space-y-2.5">
      <p className="text-xs font-semibold text-[#1a1614]">Join this event</p>

      {!customDates ? (
        <>
          {/* Quick join */}
          <button
            onClick={() => handleJoin(false)}
            disabled={saving}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-[#5b4cf5] py-2 rounded-xl hover:bg-[#4a3dd4] disabled:opacity-50 transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            {saving ? 'Joining…' : `Join full stay (${rangeLabel})`}
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setCustomDates(true)}
              className="flex-1 text-xs font-medium text-[#5b4cf5] py-1.5 rounded-xl border border-[#5b4cf5]/30 hover:bg-white transition-colors"
            >
              I am joining different dates
            </button>
            <button onClick={onDone} className="text-xs text-[#9c8b75] px-3 py-1.5 rounded-xl hover:bg-white transition-colors">
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Custom date pickers */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-medium text-[#9c8b75] block mb-1">Your arrival</label>
              <input type="date" value={arrival}
                onChange={(e) => { setArrival(e.target.value); if (departure < e.target.value) setDeparture(e.target.value) }}
                className="w-full border border-[#ede8e0] rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-[#5b4cf5]/30 bg-white text-[#1a1614]"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-[#9c8b75] block mb-1">Your departure</label>
              <input type="date" value={departure} min={arrival}
                onChange={(e) => setDeparture(e.target.value)}
                className="w-full border border-[#ede8e0] rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-[#5b4cf5]/30 bg-white text-[#1a1614]"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={staying} onChange={(e) => setStaying(e.target.checked)}
              className="rounded border-[#ede8e0] accent-[#5b4cf5]" />
            <span className="text-xs text-[#6b5d4f] flex items-center gap-1">
              <Home className="w-3 h-3 text-[#e8724a]" /> Staying at the apartment
            </span>
          </label>
          <div className="flex gap-2">
            <button onClick={() => handleJoin(true)} disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-[#5b4cf5] py-2 rounded-xl hover:bg-[#4a3dd4] disabled:opacity-50 transition-colors">
              <UserPlus className="w-3.5 h-3.5" />
              {saving ? 'Joining…' : 'Confirm & join'}
            </button>
            <button onClick={() => setCustomDates(false)} className="text-xs text-[#9c8b75] px-3 py-2 rounded-xl hover:bg-white transition-colors">
              Back
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/** Shows participants with their individual date ranges when they differ from event dates */
function ParticipantList({ event }: { event: EventWithDetails }) {
  if (event.participants.length === 0) return null
  const hasCustomDates = event.participants.some(
    (p) => p.arrival_date || p.departure_date
  )
  if (!hasCustomDates) return null

  return (
    <div className="px-3.5 pt-2 pb-1 space-y-1">
      <p className="text-[10px] font-semibold text-[#9c8b75] uppercase tracking-wide mb-1.5">Who is there when</p>
      {event.participants.map((p) => {
        const arrival = p.arrival_date ?? event.start_date
        const departure = p.departure_date ?? event.end_date
        const isFullStay = !p.arrival_date && !p.departure_date
        return (
          <div key={p.id} className="flex items-center gap-2">
            <PersonAvatar person={p.person} size="sm" />
            <span className="text-xs font-medium text-[#1a1614] flex-1">{p.person.name.split(' ')[0]}</span>
            {!isFullStay ? (
              <span className="flex items-center gap-1 text-[10px] text-[#5b4cf5] bg-[#5b4cf5]/8 rounded-full px-2 py-0.5 font-medium">
                <CalendarDays className="w-3 h-3" />
                {format(parseISO(arrival), 'MMM d')}–{format(parseISO(departure), 'MMM d')}
              </span>
            ) : (
              <span className="text-[10px] text-[#9c8b75]">Full stay</span>
            )}
            {p.staying_at_apartment && (
              <Home className="w-3 h-3 text-[#e8724a] flex-shrink-0" />
            )}
          </div>
        )
      })}
    </div>
  )
}

export function EventModal({ date, events, onClose, onRefresh, createRange }: EventModalProps) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [currentPerson, setCurrentPerson] = useState<Person | null>(null)
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [joiningId, setJoiningId] = useState<string | null>(null)
  const [leavingId, setLeavingId] = useState<string | null>(null)

  useEffect(() => {
    const id = localStorage.getItem('currentPersonId')
    if (id) getPeople().then((people) => setCurrentPerson(people.find((p) => p.id === id) ?? null))
  }, [])

  // Reset form state when the user selects a new date — NOT on every background refresh
  useEffect(() => {
    queueMicrotask(() => {
      if (events.length === 1) setExpandedEvent(events[0].id)
      else setExpandedEvent(null)
      setCreating(false)
      setEditingId(null)
      setJoiningId(null)
      setConfirmDelete(null)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  // When a drag range is provided, jump straight into create mode
  useEffect(() => {
    if (createRange) queueMicrotask(() => setCreating(true))
  }, [createRange])

  if (!date) return null

  const dateStr = format(date, 'yyyy-MM-dd')

  async function handleDelete(id: string) {
    setDeleting(true)
    const personId = localStorage.getItem('currentPersonId')
    const event = events.find((e) => e.id === id)
    try {
      await deleteEvent(id)
      if (event) logActivity(personId, 'deleted_event', event.title, 'event', id)
      setConfirmDelete(null)
      onRefresh()
      if (events.length <= 1) onClose()
    } finally {
      setDeleting(false)
    }
  }

  async function handleLeave(eventId: string) {
    if (!currentPerson) return
    setLeavingId(eventId)
    try {
      await removeEventParticipant(eventId, currentPerson.id)
      logActivity(currentPerson.id, 'left_event', events.find((e) => e.id === eventId)?.title ?? '', 'event', eventId)
      onRefresh()
    } finally {
      setLeavingId(null)
    }
  }

  function handleFormSuccess() {
    setCreating(false)
    setEditingId(null)
    onRefresh()
  }

  const editingEvent = editingId ? events.find((e) => e.id === editingId) : undefined

  return (
    <Dialog open={!!date} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm w-full animate-sheet border-[#ede8e0]" style={{ backgroundColor: '#faf7f2' }}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            {(creating || editingId) && (
              <button
                onClick={() => { setCreating(false); setEditingId(null) }}
                className="text-[#9c8b75] hover:text-[#1a1614] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <DialogTitle className="text-base font-semibold text-[#1a1614]">
              {creating
                ? 'New event'
                : editingEvent
                ? `Edit — ${editingEvent.title}`
                : format(date, 'EEEE, MMMM d')}
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Create / Edit form mode */}
        {(creating || editingId) ? (
          <div className="max-h-[70vh] overflow-y-auto -mx-1 px-1">
            <EventForm
              existing={editingEvent}
              defaultDate={createRange?.start ?? dateStr}
              defaultEndDate={createRange?.end ?? dateStr}
              onSuccess={handleFormSuccess}
              onCancel={() => { setCreating(false); setEditingId(null) }}
            />
          </div>
        ) : (
          <>
            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto -mx-1 px-1">
              {events.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-[#9c8b75]">Nothing planned yet</p>
                </div>
              ) : (
                events.map((event) => {
                  const expanded = expandedEvent === event.id
                  const isParticipant = currentPerson
                    ? event.participants.some((p) => p.person_id === currentPerson.id)
                    : false
                  const isCreator = currentPerson ? event.created_by === currentPerson.id : false
                  const canEdit = currentPerson && (isCreator || isParticipant)
                  const showJoin = joiningId === event.id

                  return (
                    <div
                      key={event.id}
                      className="bg-white rounded-2xl border border-[#ede8e0] overflow-hidden transition-all"
                      style={{ boxShadow: '0 1px 4px rgba(100,60,10,0.07)' }}
                    >
                      <button
                        onClick={() => setExpandedEvent(expanded ? null : event.id)}
                        className="w-full text-left hover:bg-[#faf7f2] transition-colors"
                      >
                        <EventSummaryCard event={event} />
                      </button>

                      {currentPerson && (
                        <div className={`mx-3.5 mt-1.5 mb-1 inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-2.5 py-0.5 ${
                          isParticipant ? 'text-green-700 bg-green-50' : 'text-[#9c8b75] bg-[#f3efe8]'
                        }`}>
                          {isParticipant
                            ? <><Check className="w-3 h-3" /> You are going</>
                            : <><span className="w-1.5 h-1.5 rounded-full bg-[#c9b99f]" /> Not joined</>
                          }
                        </div>
                      )}

                      {/* Participant dates breakdown (when any differ from event dates) */}
                      {expanded && <ParticipantList event={event} />}

                      {expanded && (
                        <div className="px-3.5 pb-3.5">
                          <EventComments eventId={event.id} currentPerson={currentPerson} />
                        </div>
                      )}

                      {/* Join panel */}
                      {showJoin && currentPerson && (
                        <JoinEventPanel
                          event={event}
                          currentPerson={currentPerson}
                          onDone={() => { setJoiningId(null); onRefresh() }}
                        />
                      )}

                      {/* Action bar */}
                      {!showJoin && (() => {
                        // Non-participants who can't edit: show View + Join
                        if (!canEdit) {
                          return (
                            <div className="flex border-t border-[#ede8e0]">
                              {currentPerson ? (
                                <button
                                  onClick={() => setJoiningId(event.id)}
                                  className="flex-1 flex items-center justify-center gap-1.5 text-xs text-white bg-[#5b4cf5] py-2.5 hover:bg-[#4a3dd4] transition-colors font-semibold"
                                >
                                  <UserPlus className="w-3 h-3" /> Join event
                                </button>
                              ) : (
                                <Link
                                  href={`/events/${event.id}`}
                                  className="flex-1 flex items-center justify-center gap-1.5 text-xs text-[#5b4cf5] py-2.5 hover:bg-[#f3efe8] transition-colors font-medium"
                                >
                                  Open itinerary
                                </Link>
                              )}
                            </div>
                          )
                        }

                        // Delete confirm
                        if (confirmDelete === event.id) {
                          return (
                            <div className="flex items-center gap-2 px-3.5 py-2.5 bg-red-50 border-t border-red-100">
                              <span className="text-xs text-red-600 flex-1">Delete this event?</span>
                              <button onClick={() => handleDelete(event.id)} disabled={deleting}
                                className="text-xs font-medium text-white bg-red-500 px-2.5 py-1 rounded-full">
                                {deleting ? '…' : 'Yes'}
                              </button>
                              <button onClick={() => setConfirmDelete(null)} className="text-xs text-[#9c8b75] px-2 py-1">Cancel</button>
                            </div>
                          )
                        }

                        // Participant who isn't creator: Itinerary + Update my dates + Leave
                        if (isParticipant && !isCreator) {
                          return (
                            <div className="flex border-t border-[#ede8e0]">
                              <Link
                                href={`/events/${event.id}`}
                                className="flex-1 flex items-center justify-center gap-1.5 text-xs text-[#5b4cf5] py-2.5 hover:bg-[#f3efe8] transition-colors font-medium"
                              >
                                Itinerary
                              </Link>
                              <button
                                onClick={() => setJoiningId(event.id)}
                                className="flex-1 flex items-center justify-center gap-1.5 text-xs text-[#5b4cf5] py-2.5 hover:bg-[#f3efe8] transition-colors font-medium border-l border-[#ede8e0]"
                              >
                                <CalendarDays className="w-3 h-3" /> My dates
                              </button>
                              <button
                                onClick={() => handleLeave(event.id)}
                                disabled={leavingId === event.id}
                                className="flex-1 flex items-center justify-center gap-1.5 text-xs text-[#e8724a] py-2.5 hover:bg-[#fdf0ea] transition-colors border-l border-[#ede8e0]"
                              >
                                <UserMinus className="w-3 h-3" />
                                {leavingId === event.id ? '…' : 'Leave'}
                              </button>
                            </div>
                          )
                        }

                        // Creator: Itinerary + Edit + Delete
                        return (
                          <div className="flex border-t border-[#ede8e0]">
                            <Link
                              href={`/events/${event.id}`}
                              className="flex-1 flex items-center justify-center gap-1.5 text-xs text-[#5b4cf5] py-2.5 hover:bg-[#f3efe8] transition-colors font-medium"
                            >
                              Itinerary
                            </Link>
                            <button
                              onClick={() => setEditingId(event.id)}
                              className="flex-1 flex items-center justify-center gap-1.5 text-xs text-[#5b4cf5] py-2.5 hover:bg-[#f3efe8] transition-colors font-medium border-l border-[#ede8e0]"
                            >
                              <Pencil className="w-3 h-3" /> Edit
                            </button>
                            <button
                              onClick={() => setConfirmDelete(event.id)}
                              className="flex-1 flex items-center justify-center gap-1.5 text-xs text-[#e8724a] py-2.5 hover:bg-[#fdf0ea] transition-colors border-l border-[#ede8e0]"
                            >
                              <Trash2 className="w-3 h-3" /> Delete
                            </button>
                          </div>
                        )
                      })()}
                    </div>
                  )
                })
              )}
            </div>

            <button
              onClick={() => setCreating(true)}
              className="w-full mt-1 flex items-center justify-center gap-2 bg-[#5b4cf5] hover:bg-[#4a3dd4] text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" /> Add event on this day
            </button>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
