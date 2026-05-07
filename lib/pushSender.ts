/**
 * Server-side helper to deliver a push notification to one or many people.
 * Cleans up dead subscriptions automatically (404/410 from the push service).
 */

import webpush from 'web-push'
import type { SupabaseClient } from '@supabase/supabase-js'

interface PushPayload {
  title: string
  body: string
  url?: string
  tag?: string
}

let configured = false
function ensureConfigured() {
  if (configured) return true
  const subject = process.env.VAPID_SUBJECT || 'mailto:nobody@example.com'
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) return false
  webpush.setVapidDetails(subject, pub, priv)
  configured = true
  return true
}

export async function sendPushToPersons(
  admin: SupabaseClient,
  personIds: string[],
  payload: PushPayload
): Promise<{ sent: number; pruned: number }> {
  if (personIds.length === 0) return { sent: 0, pruned: 0 }
  if (!ensureConfigured()) return { sent: 0, pruned: 0 }

  const { data: subs, error } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .in('person_id', personIds)
  if (error || !subs) return { sent: 0, pruned: 0 }

  const json = JSON.stringify(payload)
  const deadIds: string[] = []
  let sent = 0

  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        json
      )
      sent++
    } catch (err: unknown) {
      const status = (err as { statusCode?: number })?.statusCode
      if (status === 404 || status === 410) deadIds.push(s.id)
    }
  }))

  if (deadIds.length > 0) {
    await admin.from('push_subscriptions').delete().in('id', deadIds)
  }
  return { sent, pruned: deadIds.length }
}
