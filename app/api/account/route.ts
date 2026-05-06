import { createClient } from '@supabase/supabase-js'
import { loadEnvConfig } from '@next/env'

export const runtime = 'nodejs'

type DeleteAccountBody = {
  personId?: string
}

let attemptedEnvReload = false

function cleanEnvValue(value: string | undefined) {
  const trimmed = value?.trim()
  if (!trimmed) return undefined

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim()
  }

  return trimmed
}

function getServerEnv(name: string) {
  let value = cleanEnvValue(process.env[name])

  if (!value && process.env.NODE_ENV !== 'production' && !attemptedEnvReload) {
    attemptedEnvReload = true
    loadEnvConfig(process.cwd(), true, console, true)
    value = cleanEnvValue(process.env[name])
  }

  return value
}

function getSupabaseUrl() {
  return getServerEnv('NEXT_PUBLIC_SUPABASE_URL')
}

function getServiceRoleKey() {
  return (
    getServerEnv('SUPABASE_SERVICE_ROLE_KEY') ??
    getServerEnv('SUPABASE_SERVICE_KEY') ??
    getServerEnv('SUPABASE_SERVICE_ROLE')
  )
}

function getPublicClient() {
  const url = getSupabaseUrl()
  const anonKey = getServerEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

  if (!url || !anonKey) return null

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function getAdminClient() {
  const url = getSupabaseUrl()
  const serviceRoleKey = getServiceRoleKey()

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

  const publicClient = getPublicClient()
  const admin = getAdminClient()
  const reader = admin ?? publicClient

  if (!reader) {
    return Response.json(
      { error: 'Account deletion needs Supabase environment variables on the server.' },
      { status: 500 }
    )
  }

  const { data: person, error: personError } = await reader
    .from('people')
    .select('id, auth_user_id')
    .eq('id', body.personId)
    .single()

  if (personError || !person) {
    return Response.json({ error: 'Profile not found.' }, { status: 404 })
  }

  if (person.auth_user_id) {
    if (!admin) {
      return Response.json(
        { error: 'Signed-in account deletion needs SUPABASE_SERVICE_ROLE_KEY on the server.' },
        { status: 500 }
      )
    }

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

  const writer = admin ?? publicClient

  if (!writer) {
    return Response.json({ error: 'Could not connect to Supabase.' }, { status: 500 })
  }

  const { data: deletedPerson, error: deletePersonError } = await writer
    .from('people')
    .delete()
    .eq('id', body.personId)
    .select('id')
    .maybeSingle()

  if (deletePersonError) {
    return Response.json({ error: deletePersonError.message }, { status: 500 })
  }

  if (!deletedPerson) {
    return Response.json(
      { error: 'Profile could not be deleted. Check server Supabase permissions.' },
      { status: 500 }
    )
  }

  return Response.json({ ok: true })
}
