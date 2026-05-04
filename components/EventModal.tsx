'use client'

import { format, parseISO } from 'date-fns'
import { useRouter } from 'next/navigation'
import { EventWithDetails } from '@/lib/supabase'
import { PersonChip } from './PersonChip'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface EventModalProps {
  date: Date | null
  events: EventWithDetails[]
  onClose: () => void
}

export function EventModal({ date, events, onClose }: EventModalProps) {
  const router = useRouter()

  if (!date) return null

  const dateStr = format(date, 'yyyy-MM-dd')

  function goToNew() {
    router.push(`/events/new?date=${dateStr}`)
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

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {events.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Nothing planned yet</p>
          ) : (
            events.map((event) => (
              <button
                key={event.id}
                onClick={() => { router.push(`/events/${event.id}`); onClose() }}
                className="w-full text-left rounded-xl border border-gray-100 p-3 hover:border-indigo-200 hover:bg-indigo-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-medium text-sm text-gray-900">{event.title}</span>
                  <span className="text-sm flex-shrink-0">
                    {event.location.emoji} {event.location.name}
                  </span>
                </div>
                <div className="text-xs text-gray-400 mb-2">
                  {format(parseISO(event.start_date), 'MMM d')} – {format(parseISO(event.end_date), 'MMM d')}
                </div>
                <div className="flex flex-wrap gap-1">
                  {event.participants.map((p) => (
                    <PersonChip key={p.id} person={p.person} small />
                  ))}
                </div>
                {event.notes && (
                  <p className="text-xs text-gray-400 mt-2 line-clamp-2">{event.notes}</p>
                )}
              </button>
            ))
          )}
        </div>

        <Button onClick={goToNew} className="w-full mt-2">
          + Add event on this day
        </Button>
      </DialogContent>
    </Dialog>
  )
}
