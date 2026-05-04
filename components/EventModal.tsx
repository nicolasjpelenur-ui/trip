'use client'

import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { useRouter } from 'next/navigation'
import { EventWithDetails, Person } from '@/lib/supabase'
import { PersonAvatar } from './PersonChip'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getLocationIcon } from '@/lib/locationIcons'
import { deleteEvent, logActivity } from '@/lib/queries'
import { getPeople } from '@/lib/queries'
import { EventComments } from './EventComments'
import { Pencil, Trash2 } from 'lucide-react'

interface EventModalProps {
  date: Date | null
  events: EventWithDetails[]
  onClose: () => void
}

export function EventModal({ date, events, onClose }: EventModalProps) {
  const router = useRouter()
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [currentPerson, setCurrentPerson] = useState<Person | null>(null)
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null)

  useEffect(() => {
    const id = localStorage.getItem('currentPersonId')
    if (id) getPeople().then((people) => setCurrentPerson(people.find((p) => p.id === id) ?? null))
  }, [])

  useEffect(() => {
    if (events.length === 1) setExpandedEvent(events[0].id)
    else setExpandedEvent(null)
  }, [events])

  if (!date) return null

  async function handleDelete(id: string) {
    setDeleting(true)
    const personId = localStorage.getItem('currentPersonId')
    const event = events.find((e) => e.id === id)
    try {
      await deleteEvent(id)
      if (event) logActivity(personId, 'deleted_event', event.title, 'event', id)
      setConfirmDelete(null)
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={!!date} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm w-full animate-sheet border-[#ede8e0]" style={{ backgroundColor: '#faf8f5' }}>
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-[#1a1614]">
            {format(date, 'EEEE, MMMM d')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2.5 max-h-[70vh] overflow-y-auto -mx-1 px-1">
          {events.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-[#9c8b75]">Nothing planned yet</p>
            </div>
          ) : (
            events.map((event) => {
              const Icon = getLocationIcon(event.location.emoji)
              const expanded = expandedEvent === event.id
              return (
                <div
                  key={event.id}
                  className="bg-white rounded-2xl border border-[#ede8e0] overflow-hidden transition-all"
                  style={{ boxShadow: '0 1px 4px rgba(100,60,10,0.07)' }}
                >
                  <button
                    onClick={() => setExpandedEvent(expanded ? null : event.id)}
                    className="w-full text-left p-3.5 hover:bg-[#faf8f5] transition-colors"
                  >
                    {/* Color bar */}
                    <div
                      className="h-1 rounded-full mb-2.5"
                      style={{
                        background: event.participants.length > 1
                          ? `linear-gradient(to right, ${event.participants.map(p => p.person.color).join(', ')})`
                          : event.participants[0]?.person.color ?? '#ede8e0'
                      }}
                    />
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="font-semibold text-sm text-[#1a1614]">{event.title}</span>
                      <span className="flex items-center gap-1 text-[11px] text-[#9c8b75] flex-shrink-0 bg-[#f3efe8] rounded-full px-2 py-0.5">
                        <Icon className="w-3 h-3" />
                        {event.location.name}
                      </span>
                    </div>
                    <div className="text-xs text-[#9c8b75] mb-2.5">
                      {format(parseISO(event.start_date), 'MMM d')} – {format(parseISO(event.end_date), 'MMM d')}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {event.participants.map((p) => (
                        <PersonAvatar key={p.id} person={p.person} size="sm" />
                      ))}
                    </div>
                    {event.notes && (
                      <p className="text-xs text-[#9c8b75] mt-2 line-clamp-2">{event.notes}</p>
                    )}
                  </button>

                  {/* Comments + reactions (expanded) */}
                  {expanded && (
                    <div className="px-3.5 pb-3.5">
                      <EventComments eventId={event.id} currentPerson={currentPerson} />
                    </div>
                  )}

                  {/* Action row */}
                  {confirmDelete === event.id ? (
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
                      <button
                        onClick={() => { router.push(`/events/${event.id}`); onClose() }}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs text-[#5b4cf5] py-2.5 hover:bg-[#f3efe8] transition-colors font-medium"
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
                  )}
                </div>
              )
            })
          )}
        </div>

        <Button
          onClick={() => { router.push(`/events/new?date=${format(date, 'yyyy-MM-dd')}`); onClose() }}
          className="w-full mt-1 bg-[#5b4cf5] hover:bg-[#4a3dd4]"
        >
          + Add event on this day
        </Button>
      </DialogContent>
    </Dialog>
  )
}
