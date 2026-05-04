'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { useRouter } from 'next/navigation'
import { EventWithDetails } from '@/lib/supabase'
import { PersonAvatar } from './PersonChip'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getLocationIcon } from '@/lib/locationIcons'
import { deleteEvent } from '@/lib/queries'

interface EventModalProps {
  date: Date | null
  events: EventWithDetails[]
  onClose: () => void
}

export function EventModal({ date, events, onClose }: EventModalProps) {
  const router = useRouter()
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  if (!date) return null

  const dateStr = format(date, 'yyyy-MM-dd')

  function goToNew() {
    router.push(`/events/new?date=${dateStr}`)
    onClose()
  }

  async function handleDelete(id: string) {
    setDeleting(true)
    await deleteEvent(id)
    setConfirmDelete(null)
    setDeleting(false)
    onClose()
  }

  return (
    <Dialog open={!!date} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm w-full">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {format(date, 'EEEE, MMMM d')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2.5 max-h-96 overflow-y-auto">
          {events.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Nothing planned yet</p>
          ) : (
            events.map((event) => {
              const Icon = getLocationIcon(event.location.emoji)
              return (
                <div key={event.id} className="rounded-xl border border-gray-100 overflow-hidden">
                  <button
                    onClick={() => { router.push(`/events/${event.id}`); onClose() }}
                    className="w-full text-left p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="font-medium text-sm text-gray-900">{event.title}</span>
                      <span className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0 bg-gray-100 rounded-full px-2 py-0.5">
                        <Icon className="w-3 h-3" />
                        {event.location.name}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mb-2">
                      {format(parseISO(event.start_date), 'MMM d')} – {format(parseISO(event.end_date), 'MMM d')}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {event.participants.map((p) => (
                        <PersonAvatar key={p.id} person={p.person} size="sm" />
                      ))}
                    </div>
                    {event.notes && (
                      <p className="text-xs text-gray-400 mt-2 line-clamp-2">{event.notes}</p>
                    )}
                  </button>

                  {confirmDelete === event.id ? (
                    <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border-t border-red-100">
                      <span className="text-xs text-red-600 flex-1">Delete this event?</span>
                      <button
                        onClick={() => handleDelete(event.id)}
                        disabled={deleting}
                        className="text-xs font-medium text-white bg-red-500 px-2.5 py-1 rounded-full"
                      >
                        {deleting ? '...' : 'Yes, delete'}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="text-xs text-gray-500 px-2 py-1"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex border-t border-gray-50">
                      <button
                        onClick={() => { router.push(`/events/${event.id}`); onClose() }}
                        className="flex-1 text-xs text-indigo-600 py-2 hover:bg-indigo-50 transition-colors font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setConfirmDelete(event.id)}
                        className="flex-1 text-xs text-red-400 py-2 hover:bg-red-50 transition-colors border-l border-gray-50"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        <Button onClick={goToNew} className="w-full mt-1">
          + Add event on this day
        </Button>
      </DialogContent>
    </Dialog>
  )
}
