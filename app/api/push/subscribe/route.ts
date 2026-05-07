import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

interface SubscribeBody {
  personId: string
  subscription: {
    endpoint: string
    keys: { p256dh: string; auth: string }
  }
  userAgent?: string
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function POST(request: Request) {
  let body: SubscribeBody
  try { body = await request.json() }
  catch { return Response.json({ error: 'Invalid body.' }, { status: 400 }) }

  if (!body.personId || !body.subscription?.endpoint) {
    return Response.json({ error: 'Missing fields.' }, { status: 400 })
  }

  const admin = getAdminClient()
  if (!admin) return Response.json({ error: 'Server misconfigured.' }, { status: 500 })

  // Upsert by endpoint (the unique key) so re-subscribing on the same browser
  // refreshes the row instead of failing.
  const { error } = await admin
    .from('push_subscriptions')
    .upsert(
      {
        person_id: body.personId,
        endpoint: body.subscription.endpoint,
        p256dh: body.subscription.keys.p256dh,
        auth: body.subscription.keys.auth,
        user_agent: body.userAgent ?? null,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    )

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
