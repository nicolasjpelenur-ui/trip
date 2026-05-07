import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function POST(request: Request) {
  let body: { endpoint?: string }
  try { body = await request.json() }
  catch { return Response.json({ error: 'Invalid body.' }, { status: 400 }) }

  if (!body.endpoint) return Response.json({ error: 'Missing endpoint.' }, { status: 400 })

  const admin = getAdminClient()
  if (!admin) return Response.json({ error: 'Server misconfigured.' }, { status: 500 })

  const { error } = await admin.from('push_subscriptions').delete().eq('endpoint', body.endpoint)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
