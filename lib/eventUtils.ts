import { differenceInCalendarDays, parseISO } from 'date-fns'
import { EventWithDetails } from './supabase'

/** Returns today at midnight (safe for date comparisons). */
export function today(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

/** Returns true if the current user can see the event. */
export function canSeeEvent(event: EventWithDetails, personId: string | null): boolean {
  if ((event.visibility ?? 'all') === 'all') return true
  if (!personId) return false
  return (
    event.created_by === personId ||
    event.participants.some((p) => p.person_id === personId) ||
    (event.viewers ?? []).some((v) => v.person_id === personId)
  )
}

/** Returns true if the current user can edit the event (creator or participant). */
export function canEditEvent(event: EventWithDetails, personId: string | null): boolean {
  if (!personId) return false
  return (
    event.created_by === personId ||
    event.participants.some((p) => p.person_id === personId)
  )
}

/** Returns a human-readable countdown label for an event. */
export function eventCountdownLabel(event: EventWithDetails): string {
  const t = today()
  const start = parseISO(event.start_date)
  const end = parseISO(event.end_date)
  const startsIn = differenceInCalendarDays(start, t)
  const endsIn = differenceInCalendarDays(end, t)
  if (startsIn > 0) return `${startsIn} day${startsIn === 1 ? '' : 's'} away`
  if (endsIn >= 0) return 'In progress'
  return 'Finished'
}

/** Returns true if the event ends on or after today. */
export function isUpcoming(event: EventWithDetails): boolean {
  return parseISO(event.end_date) >= today()
}
