/**
 * Client-side "download all my data" — gathers everything tied to a person and
 * triggers a JSON file download in the browser. No server work needed; relies
 * on RLS to make sure we only fetch what this person can read.
 */

import { supabase } from './supabase'

export async function exportMyData(personId: string): Promise<{ filename: string; size: number }> {
  const queries = await Promise.all([
    supabase.from('people').select('*').eq('id', personId).single(),
    supabase.from('event_participants').select('*, event:events(*)').eq('person_id', personId),
    supabase.from('messages').select('*').eq('person_id', personId),
    supabase.from('event_comments').select('*').eq('person_id', personId),
    supabase.from('event_reactions').select('*').eq('person_id', personId),
    supabase.from('poll_votes').select('*').eq('person_id', personId),
    supabase.from('group_members').select('*, group:groups(*)').eq('person_id', personId),
    supabase.from('activity_log').select('*').eq('person_id', personId),
  ])

  const payload = {
    exported_at: new Date().toISOString(),
    schema_version: 1,
    profile: queries[0].data,
    event_participations: queries[1].data ?? [],
    messages: queries[2].data ?? [],
    event_comments: queries[3].data ?? [],
    event_reactions: queries[4].data ?? [],
    poll_votes: queries[5].data ?? [],
    group_memberships: queries[6].data ?? [],
    activity_log: queries[7].data ?? [],
  }

  const json = JSON.stringify(payload, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const filename = `trip-coordinator-export-${new Date().toISOString().slice(0, 10)}.json`
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  return { filename, size: blob.size }
}
