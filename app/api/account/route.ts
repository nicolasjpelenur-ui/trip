import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

type DeleteAccountBody = {
  personId?: string
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) return null

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function DELETE(request: Request) {
  let body: DeleteAccountBody

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  if (!body.personId) {
    return Response.json({ error: 'Missing person id.' }, { status: 400 })
  }

  const admin = getAdminClient()

  if (!admin) {
    return Response.json(
      { error: 'Account deletion needs SUPABASE_SERVICE_ROLE_KEY in .env.local.' },
      { status: 500 }
    )
  }

  const { data: person, error: personError } = await admin
    .from('people')
    .select('id, auth_user_id')
    .eq('id', body.personId)
    .single()

  if (personError || !person) {
    return Response.json({ error: 'Profile not found.' }, { status: 404 })
  }

  if (person.auth_user_id) {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')

    if (!token) {
      return Response.json({ error: 'Sign in again before deleting this account.' }, { status: 401 })
    }

    const { data: userData, error: userError } = await admin.auth.getUser(token)

    if (userError || userData.user?.id !== person.auth_user_id) {
      return Response.json({ error: 'You can only delete your own account.' }, { status: 403 })
    }

    const { error: deleteAuthError } = await admin.auth.admin.deleteUser(person.auth_user_id)

    if (deleteAuthError) {
      return Response.json({ error: deleteAuthError.message }, { status: 500 })
    }
  }

  const { error: deletePersonError } = await admin
    .from('people')
    .delete()
    .eq('id', body.personId)

  if (deletePersonError) {
    return Response.json({ error: deletePersonError.message }, { status: 500 })
  }

  return Response.json({ ok: true })
}
