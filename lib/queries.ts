import { supabase, EventWithDetails, Person, Location, ActivityLog } from './supabase'

export async function getPeople(): Promise<Person[]> {
  const { data, error } = await supabase
    .from('people')
    .select('*')
    .order('name')
  if (error) throw error
  return data
}

export async function createPerson(person: Pick<Person, 'name' | 'color'> & { group?: string }) {
  const { data, error } = await supabase
    .from('people')
    .insert(person)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updatePerson(id: string, updates: Partial<Omit<Person, 'id' | 'created_at'>>) {
  const { error } = await supabase.from('people').update(updates).eq('id', id)
  if (error) throw error
}

export async function getLocations(): Promise<Location[]> {
  const { data, error } = await supabase.from('locations').select('*').order('name')
  if (error) throw error
  return data
}

export async function createLocation(location: Omit<Location, 'id'>) {
  const { data, error } = await supabase
    .from('locations')
    .insert(location)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getEventsInRange(startDate: string, endDate: string): Promise<EventWithDetails[]> {
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      location:locations(*),
      participants:event_participants(*, person:people(*)),
      viewers:event_viewers(person_id)
    `)
    .or(`start_date.lte.${endDate},end_date.gte.${startDate}`)
    .order('start_date')
  if (error) throw error
  return (data ?? []).map((e) => ({ ...e, viewers: e.viewers ?? [], visibility: e.visibility ?? 'all' })) as EventWithDetails[]
}

export async function getEvent(id: string): Promise<EventWithDetails> {
  const { data, error } = await supabase
    .from('events')
    .select(`*, location:locations(*), participants:event_participants(*, person:people(*)), viewers:event_viewers(person_id)`)
    .eq('id', id)
    .single()
  if (error) throw error
  return { ...data, viewers: data.viewers ?? [], visibility: data.visibility ?? 'all' } as EventWithDetails
}

export async function createEvent(
  event: { title: string; location_id: string; start_date: string; end_date: string; notes?: string; created_by?: string; visibility?: string },
  participantIds: string[],
  stayingAtApartmentIds: string[],
  viewerIds: string[] = []
) {
  const { data, error } = await supabase
    .from('events')
    .insert({ ...event, updated_at: new Date().toISOString() })
    .select()
    .single()
  if (error) throw error

  if (participantIds.length > 0) {
    const { error: epError } = await supabase.from('event_participants').insert(
      participantIds.map((person_id) => ({
        event_id: data.id,
        person_id,
        staying_at_apartment: stayingAtApartmentIds.includes(person_id),
      }))
    )
    if (epError) throw epError
  }

  if (viewerIds.length > 0) {
    await supabase.from('event_viewers').insert(viewerIds.map((person_id) => ({ event_id: data.id, person_id })))
  }

  return data
}

export async function updateEvent(
  id: string,
  event: { title: string; location_id: string; start_date: string; end_date: string; notes?: string; visibility?: string },
  participantIds: string[],
  stayingAtApartmentIds: string[],
  viewerIds: string[] = []
) {
  const { error } = await supabase
    .from('events')
    .update({ ...event, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error

  await supabase.from('event_participants').delete().eq('event_id', id)
  if (participantIds.length > 0) {
    await supabase.from('event_participants').insert(
      participantIds.map((person_id) => ({
        event_id: id,
        person_id,
        staying_at_apartment: stayingAtApartmentIds.includes(person_id),
      }))
    )
  }

  await supabase.from('event_viewers').delete().eq('event_id', id)
  if (viewerIds.length > 0) {
    await supabase.from('event_viewers').insert(viewerIds.map((person_id) => ({ event_id: id, person_id })))
  }
}

export async function deleteEvent(id: string) {
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) throw error
}

export async function updateEventDates(id: string, startDate: string, endDate: string) {
  const { error } = await supabase
    .from('events')
    .update({ start_date: startDate, end_date: endDate, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function getAllEvents(): Promise<EventWithDetails[]> {
  const { data, error } = await supabase
    .from('events')
    .select(`*, location:locations(*), participants:event_participants(*, person:people(*)), viewers:event_viewers(person_id)`)
    .order('start_date')
  if (error) throw error
  return (data ?? []).map((e) => ({ ...e, viewers: e.viewers ?? [], visibility: e.visibility ?? 'all' })) as EventWithDetails[]
}

export async function updatePersonStatus(id: string, status: string) {
  const { error } = await supabase.from('people').update({ status }).eq('id', id)
  if (error) throw error
}

export async function logActivity(
  personId: string | null,
  action: string,
  description: string,
  entityType?: string,
  entityId?: string
) {
  await supabase.from('activity_log').insert({
    person_id: personId,
    action,
    description,
    entity_type: entityType ?? null,
    entity_id: entityId ?? null,
  })
}

const CHAT_ACTIONS = ['sent_message', 'added_reaction', 'sent_dm']

export async function getActivityLog(limit = 50): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from('activity_log')
    .select('*, person:people(*)')
    .not('action', 'in', `(${CHAT_ACTIONS.map((a) => `"${a}"`).join(',')})`)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data as ActivityLog[]
}
