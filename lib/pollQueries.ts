import { supabase } from './supabase'

export interface PollOption {
  id: string
  poll_id: string
  text: string
  position: number
}

export interface PollVote {
  option_id: string
  person_id: string
}

export interface Poll {
  id: string
  question: string
  created_by: string | null
  event_id: string | null
  group_id: string | null
  created_at: string
  options: PollOption[]
  votes: PollVote[]
}

async function hydratePoll(poll: { id: string; question: string; created_by: string | null; event_id: string | null; group_id: string | null; created_at: string }): Promise<Poll> {
  const [{ data: options }, { data: votes }] = await Promise.all([
    supabase.from('poll_options').select('*').eq('poll_id', poll.id).order('position'),
    supabase.from('poll_votes').select('*').in(
      'option_id',
      // fetch vote counts lazily — if options not loaded yet we'll get them separately
      (await supabase.from('poll_options').select('id').eq('poll_id', poll.id)).data?.map((o) => o.id) ?? []
    ),
  ])
  return { ...poll, options: options ?? [], votes: votes ?? [] }
}

export async function getPollsForEvent(eventId: string): Promise<Poll[]> {
  const { data, error } = await supabase
    .from('polls')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at')
  if (error) throw error
  return Promise.all((data ?? []).map(hydratePoll))
}

export async function getPollsForGroup(groupId: string): Promise<Poll[]> {
  const { data, error } = await supabase
    .from('polls')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at')
  if (error) throw error
  return Promise.all((data ?? []).map(hydratePoll))
}

export async function createPoll(
  question: string,
  options: string[],
  createdBy: string | null,
  eventId?: string,
  groupId?: string
): Promise<Poll> {
  const { data: poll, error } = await supabase
    .from('polls')
    .insert({ question, created_by: createdBy, event_id: eventId ?? null, group_id: groupId ?? null })
    .select()
    .single()
  if (error) throw error

  const { error: optErr } = await supabase.from('poll_options').insert(
    options.map((text, i) => ({ poll_id: poll.id, text, position: i }))
  )
  if (optErr) throw optErr

  return hydratePoll(poll)
}

export async function castVote(optionId: string, personId: string) {
  await supabase.from('poll_votes').upsert({ option_id: optionId, person_id: personId })
}

export async function removeVote(optionId: string, personId: string) {
  await supabase.from('poll_votes').delete().eq('option_id', optionId).eq('person_id', personId)
}

export async function toggleVote(poll: Poll, optionId: string, personId: string) {
  const existing = poll.votes.find((v) => v.option_id === optionId && v.person_id === personId)
  if (existing) {
    await removeVote(optionId, personId)
  } else {
    await castVote(optionId, personId)
  }
}
