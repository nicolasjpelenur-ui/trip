import { eachDayOfInterval, format, parseISO } from 'date-fns'
import { EventWithDetails, ItineraryDay, ItineraryDayWithItems, ItineraryItem, supabase } from './supabase'

export type ItineraryItemInput = {
  title: string
  start_time?: string | null
  end_time?: string | null
  place_name?: string | null
  address?: string | null
  city?: string | null
  url?: string | null
  notes?: string | null
}

function sortItems(items: ItineraryItem[]) {
  return [...items].sort((a, b) =>
    a.position - b.position ||
    (a.start_time ?? '99:99').localeCompare(b.start_time ?? '99:99') ||
    a.created_at.localeCompare(b.created_at)
  )
}

async function ensureItineraryDays(event: EventWithDetails): Promise<ItineraryDay[]> {
  const expectedDates = eachDayOfInterval({
    start: parseISO(event.start_date),
    end: parseISO(event.end_date),
  }).map((day) => format(day, 'yyyy-MM-dd'))

  const { data: existing, error } = await supabase
    .from('event_itinerary_days')
    .select('*')
    .eq('event_id', event.id)
    .order('day_date')

  if (error) throw error

  const existingDates = new Set((existing ?? []).map((day) => day.day_date))
  const missing = expectedDates.filter((day) => !existingDates.has(day))

  if (missing.length > 0) {
    const { error: insertError } = await supabase
      .from('event_itinerary_days')
      .upsert(
        missing.map((day_date) => ({ event_id: event.id, day_date })),
        { onConflict: 'event_id,day_date', ignoreDuplicates: true }
      )

    if (insertError) throw insertError
  }

  const { data: days, error: reloadError } = await supabase
    .from('event_itinerary_days')
    .select('*')
    .eq('event_id', event.id)
    .order('day_date')

  if (reloadError) throw reloadError
  return days as ItineraryDay[]
}

export async function getEventItinerary(event: EventWithDetails): Promise<ItineraryDayWithItems[]> {
  const days = await ensureItineraryDays(event)
  const dayIds = days.map((day) => day.id)

  if (dayIds.length === 0) return []

  const { data: items, error } = await supabase
    .from('event_itinerary_items')
    .select('*')
    .in('day_id', dayIds)
    .order('position')
    .order('start_time')
    .order('created_at')

  if (error) throw error

  return days.map((day) => ({
    ...day,
    items: sortItems((items ?? []).filter((item) => item.day_id === day.id) as ItineraryItem[]),
  }))
}

export async function updateItineraryDay(dayId: string, updates: Pick<Partial<ItineraryDay>, 'title' | 'notes'>) {
  const { error } = await supabase
    .from('event_itinerary_days')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', dayId)

  if (error) throw error
}

export async function createItineraryItem(dayId: string, input: ItineraryItemInput, createdBy: string | null, position: number) {
  const { error } = await supabase
    .from('event_itinerary_items')
    .insert({
      day_id: dayId,
      title: input.title.trim(),
      start_time: input.start_time || null,
      end_time: input.end_time || null,
      place_name: input.place_name?.trim() || null,
      address: input.address?.trim() || null,
      city: input.city?.trim() || null,
      url: input.url?.trim() || null,
      notes: input.notes?.trim() || null,
      created_by: createdBy,
      position,
    })

  if (error) throw error
}

export async function updateItineraryItem(id: string, input: ItineraryItemInput) {
  const { error } = await supabase
    .from('event_itinerary_items')
    .update({
      title: input.title.trim(),
      start_time: input.start_time || null,
      end_time: input.end_time || null,
      place_name: input.place_name?.trim() || null,
      address: input.address?.trim() || null,
      city: input.city?.trim() || null,
      url: input.url?.trim() || null,
      notes: input.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw error
}

export async function deleteItineraryItem(id: string) {
  const { error } = await supabase.from('event_itinerary_items').delete().eq('id', id)
  if (error) throw error
}

export async function reorderItineraryItems(items: Pick<ItineraryItem, 'id' | 'position'>[]) {
  const updates = items.map((item, index) =>
    supabase
      .from('event_itinerary_items')
      .update({ position: index, updated_at: new Date().toISOString() })
      .eq('id', item.id)
  )

  const results = await Promise.all(updates)
  const error = results.find((result) => result.error)?.error
  if (error) throw error
}
