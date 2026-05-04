import { supabase, Person } from './supabase'

export interface Group {
  id: string
  name: string
  color: string
  description: string | null
  is_private: boolean
  created_by: string | null
  created_at: string
}

export interface GroupWithMembers extends Group {
  members: Person[]
}

export interface Message {
  id: string
  group_id: string
  person_id: string | null
  content: string
  created_at: string
  person?: Person | null
}

export interface EventComment {
  id: string
  event_id: string
  person_id: string | null
  content: string
  created_at: string
  person?: Person | null
}

export interface EventReaction {
  id: string
  event_id: string
  person_id: string
  reaction: string
  person?: Person
}

export async function getGroups(): Promise<Group[]> {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .order('created_at')
  if (error) throw error
  return data
}

export async function getGroupWithMembers(id: string): Promise<GroupWithMembers> {
  const { data: group, error } = await supabase
    .from('groups')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error

  const { data: members, error: me } = await supabase
    .from('group_members')
    .select('person_id, person:people(*)')
    .eq('group_id', id)
  if (me) throw me

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { ...group, members: (members ?? []).map((m: any) => m.person as Person) }
}

export async function createGroup(
  name: string,
  color: string,
  description: string,
  memberIds: string[],
  createdBy: string | null,
  isPrivate = false
): Promise<Group> {
  const { data, error } = await supabase
    .from('groups')
    .insert({ name, color, description: description || null, created_by: createdBy, is_private: isPrivate })
    .select()
    .single()
  if (error) throw error

  if (memberIds.length > 0) {
    await supabase.from('group_members').insert(
      memberIds.map((person_id) => ({ group_id: data.id, person_id }))
    )
  }
  return data
}

export async function getMessages(groupId: string, limit = 100): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*, person:people(*)')
    .eq('group_id', groupId)
    .order('created_at', { ascending: true })
    .limit(limit)
  if (error) throw error
  return data as Message[]
}

export async function sendMessage(groupId: string, personId: string, content: string) {
  const { error } = await supabase
    .from('messages')
    .insert({ group_id: groupId, person_id: personId, content })
  if (error) throw error
}

export async function getEventComments(eventId: string): Promise<EventComment[]> {
  const { data, error } = await supabase
    .from('event_comments')
    .select('*, person:people(*)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as EventComment[]
}

export async function addEventComment(eventId: string, personId: string, content: string) {
  const { error } = await supabase
    .from('event_comments')
    .insert({ event_id: eventId, person_id: personId, content })
  if (error) throw error
}

export async function getEventReactions(eventId: string): Promise<EventReaction[]> {
  const { data, error } = await supabase
    .from('event_reactions')
    .select('*, person:people(*)')
    .eq('event_id', eventId)
  if (error) throw error
  return data as EventReaction[]
}

export async function toggleEventReaction(eventId: string, personId: string, reaction: string) {
  const { data: existing } = await supabase
    .from('event_reactions')
    .select('id')
    .eq('event_id', eventId)
    .eq('person_id', personId)
    .eq('reaction', reaction)
    .maybeSingle()

  if (existing) {
    await supabase.from('event_reactions').delete().eq('id', existing.id)
  } else {
    await supabase.from('event_reactions').insert({ event_id: eventId, person_id: personId, reaction })
  }
}
