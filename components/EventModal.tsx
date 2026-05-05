'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { EventWithDetails, Person } from '@/lib/supabase'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { deleteEvent, logActivity } from '@/lib/queries'
import { getPeople } from '@/lib/queries'
import { EventComments } from './EventComments'
import { EventForm } from './EventForm'
import { EventSummaryCard } from './EventSummaryCard'
import { Pencil, Trash2, Plus, ArrowLeft } from 'lucide-react'

interface EventModalProps {
  date: Date | null
  events: EventWithDetails[]
  onClose: () => void
  onRefresh: () => void
  createRange?: { start: string; end: string } | null
}

export function EventModal({ date, events, onClose, onRefresh, createRange }: EventModalProps) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [currentPerson, setCurrentPerson] = useState<Person | null>(null)
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

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
      setConfirmDelete(null)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  // When a drag range is provided, jump straight into create mode
  useEffect(() => {
    if (createRange) setCreating(true)
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

  function handleFormSuccess() {
    setCreating(false)
    setEditingId(null)
    onRefresh()
  }

  const editingEvent = editingId ? events.find((e) => e.id === editingId) : undefined

  return (
    <Dialog open={!!date} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm w-full animate-sheet border-[#ede8e0]" style={{ backgroundColor: '#faf8f5' }}>
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
                  return (
                    <div
                      key={event.id}
                      className="bg-white rounded-2xl border border-[#ede8e0] overflow-hidden transition-all"
                      style={{ boxShadow: '0 1px 4px rgba(100,60,10,0.07)' }}
                    >
                      <button
                        onClick={() => setExpandedEvent(expanded ? null : event.id)}
                        className="w-full text-left hover:bg-[#faf8f5] transition-colors"
                      >
                        <EventSummaryCard event={event} />
                      </button>

                      {expanded && (
                        <div className="px-3.5 pb-3.5">
                          <EventComments eventId={event.id} currentPerson={currentPerson} />
                        </div>
                      )}

                      {(() => {
                        const canEdit = currentPerson && (
                          event.created_by === currentPerson.id ||
                          event.participants.some((p) => p.person_id === currentPerson.id)
                        )
                        if (!canEdit) {
                          return (
                            <div className="flex border-t border-[#ede8e0]">
                              <Link
                                href={`/events/${event.id}`}
                                className="flex-1 flex items-center justify-center gap-1.5 text-xs text-[#5b4cf5] py-2.5 hover:bg-[#f3efe8] transition-colors font-medium"
                              >
                                Open itinerary
                              </Link>
                            </div>
                          )
                        }
                        return confirmDelete === event.id ? (
                          <div className="flex items-center gap-2 px-3.5 py-2.5 bg-red-50 border-t border-red-100">
                            <span className="text-xs text-red-600 flex-1">Delete this event?</span>
                            <button onClick={() => handleDelete(event.id)} disabled={deleting}
                              className="text-xs font-medium text-white bg-red-500 px-2.5 py-1 rounded-full">
                              {deleting ? '…' : 'Yes'}
                            </button>
                            <button onClick={() => setConfirmDelete(null)} className="text-xs text-[#9c8b75] px-2 py-1">Cancel</button>
                          </div>
                        ) : (
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
