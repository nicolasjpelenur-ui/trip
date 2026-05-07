/**
 * Daily notification cron. Wired in vercel.json to run once per day.
 *
 * What it does:
 *  - Birthdays: anyone whose birthday is today gets a push to all OTHER people
 *  - Trips: anyone with a trip starting today (where they are a participant)
 *    gets a push to themselves
 *
 * Auth: protected by CRON_SECRET (set on Vercel). When called by Vercel Cron,
 * the request includes Authorization: Bearer <secret>.
 */

import { createClient } from '@supabase/supabase-js'
import { sendPushToPersons } from '@/lib/pushSender'

export const runtime = 'nodejs'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return true // dev / preview — let it run
  const header = request.headers.get('authorization') ?? ''
  return header === `Bearer ${secret}`
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getAdminClient()
  if (!admin) return Response.json({ error: 'Server misconfigured.' }, { status: 500 })

  const today = new Date()
  const monthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const isoDate = today.toISOString().slice(0, 10)

  let totalSent = 0
  let totalPruned = 0

  // ── Birthdays today ─────────────────────────────────────────────────────
  const { data: people } = await admin.from('people').select('id, name, birthday')
  if (people) {
    const birthdayPeople = people.filter((p) => {
      if (!p.birthday) return false
      // Compare just MM-DD so the year doesn't matter
      return p.birthday.slice(5) === monthDay
    })

    for (const bp of birthdayPeople) {
      const otherIds = people.filter((p) => p.id !== bp.id).map((p) => p.id)
      const firstName = bp.name.split(' ')[0]
      const result = await sendPushToPersons(admin, otherIds, {
        title: `It's ${firstName}'s birthday`,
        body: 'Reach out and make their day a little brighter.',
        url: '/dashboard',
        tag: `birthday-${bp.id}-${isoDate}`,
      })
      totalSent += result.sent
      totalPruned += result.pruned
    }
  }

  // ── Trips starting today ────────────────────────────────────────────────
  const { data: events } = await admin
    .from('events')
    .select('id, title, location:locations(name), participants:event_participants(person_id)')
    .eq('start_date', isoDate)
  if (events) {
    for (const ev of events) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const participants = (ev.participants ?? []) as any[]
      const personIds = participants.map((p) => p.person_id).filter(Boolean)
      if (personIds.length === 0) continue
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const locName = (ev as any).location?.name ?? ''
      const result = await sendPushToPersons(admin, personIds, {
        title: `${ev.title} starts today`,
        body: locName ? `See you in ${locName}.` : 'Today is the day.',
        url: `/events/${ev.id}`,
        tag: `trip-start-${ev.id}`,
      })
      totalSent += result.sent
      totalPruned += result.pruned
    }
  }

  return Response.json({ ok: true, sent: totalSent, pruned: totalPruned })
}
