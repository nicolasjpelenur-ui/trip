'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { NavBar } from '@/components/NavBar'
import { RealtimeProvider } from '@/components/RealtimeProvider'
import { PersonAvatar } from '@/components/PersonChip'
import { Person } from '@/lib/supabase'
import { getPeople, updatePerson, updatePersonStatus } from '@/lib/queries'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff, ShieldCheck, Trash2 } from 'lucide-react'

const COLORS = [
  '#6366f1', '#ec4899', '#f97316', '#10b981',
  '#3b82f6', '#a855f7', '#ef4444', '#14b8a6',
  '#f59e0b', '#84cc16', '#06b6d4', '#d946ef',
  '#f43f5e', '#22c55e', '#0ea5e9', '#e11d48',
  '#7c3aed', '#db2777', '#ea580c', '#16a34a',
  '#2563eb', '#9333ea', '#0891b2', '#65a30d',
]

function ProfileContent() {
  const router = useRouter()
  const [person, setPerson] = useState<Person | null>(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [pwEmail, setPwEmail] = useState('')
  const [pwPassword, setPwPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwDone, setPwDone] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    async function load() {
      const currentPersonId = localStorage.getItem('currentPersonId')

      if (!currentPersonId) {
        router.replace('/')
        return
      }

      const people = await getPeople()
      const currentPerson = people.find((p) => p.id === currentPersonId) ?? null

      if (!currentPerson) {
        localStorage.removeItem('currentPersonId')
        localStorage.removeItem('currentPersonName')
        router.replace('/')
        return
      }

      setPerson(currentPerson)
      setName(currentPerson.name)
      setColor(currentPerson.color)
      setStatus(currentPerson.status ?? '')
      setPwEmail(currentPerson.email ?? '')
      setLoading(false)
    }

    load()
  }, [router])

  async function saveProfile() {
    if (!person || !name.trim()) return

    setSaving(true)
    setSaveError('')

    try {
      await updatePerson(person.id, { name: name.trim(), color })
      await updatePersonStatus(person.id, status)
      const updated = { ...person, name: name.trim(), color, status }
      setPerson(updated)
      localStorage.setItem('currentPersonName', updated.name)
      window.dispatchEvent(new CustomEvent('personUpdated', { detail: { name: updated.name, color: updated.color } }))
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not save profile.')
    } finally {
      setSaving(false)
    }
  }

  async function setPassword() {
    if (!person || !pwEmail.trim() || pwPassword.length < 6) {
      setPwError('Email and password (min 6 chars) required.')
      return
    }

    setPwSaving(true)
    setPwError('')

    const { data, error } = await supabase.auth.signUp({ email: pwEmail.trim(), password: pwPassword })

    if (error) {
      setPwError(error.message)
      setPwSaving(false)
      return
    }

    if (data.user) {
      const { error: updateError } = await supabase
        .from('people')
        .update({ auth_user_id: data.user.id, email: pwEmail.trim() })
        .eq('id', person.id)

      if (updateError) {
        setPwError(updateError.message)
      } else {
        setPerson({ ...person, auth_user_id: data.user.id, email: pwEmail.trim() })
        setPwDone(true)
        setPwPassword('')
      }
    }

    setPwSaving(false)
  }

  async function deleteAccount() {
    if (!person) return

    setDeleting(true)
    setDeleteError('')

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const response = await fetch('/api/account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionData.session?.access_token
            ? { Authorization: `Bearer ${sessionData.session.access_token}` }
            : {}),
        },
        body: JSON.stringify({ personId: person.id }),
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error ?? 'Could not delete account.')
      }

      await supabase.auth.signOut()
      localStorage.removeItem('currentPersonId')
      localStorage.removeItem('currentPersonName')
      router.replace('/')
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Could not delete account.')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="skeleton h-6 w-24 rounded mb-4" />
        <div className="bg-white rounded-2xl border border-[#ede8e0] p-4 space-y-3">
          <div className="skeleton h-12 rounded-xl" />
          <div className="skeleton h-10 rounded-xl" />
          <div className="skeleton h-24 rounded-xl" />
        </div>
      </div>
    )
  }

  if (!person) return null

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-[#1a1614] mb-1">Profile</h1>
      <p className="text-sm text-[#9c8b75] mb-5">Manage your trip identity and sign-in.</p>

      <div className="bg-white rounded-2xl border border-[#ede8e0] p-4 space-y-5" style={{ boxShadow: '0 1px 4px rgba(100,60,10,0.07)' }}>
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <PersonAvatar person={{ ...person, name, color, status }} size="lg" />
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-medium text-[#9c8b75] mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-[#ede8e0] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#5b4cf5]/30 bg-[#faf7f2]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#9c8b75] mb-1">Status</label>
            <input
              type="text"
              placeholder="In Valencia, arriving June 5..."
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              maxLength={60}
              className="w-full border border-[#ede8e0] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#5b4cf5]/30 bg-[#faf7f2]"
            />
          </div>

          <div>
            <p className="text-xs font-medium text-[#9c8b75] mb-2">Color</p>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setColor(item)}
                  aria-label={`Choose ${item}`}
                  className={`w-7 h-7 rounded-full transition-all ${color === item ? 'scale-125 ring-2 ring-offset-1 ring-[#9c8b75]' : 'hover:scale-110'}`}
                  style={{ backgroundColor: item }}
                />
              ))}
            </div>
          </div>

          {saveError && <p className="text-xs text-red-500">{saveError}</p>}

          <button
            onClick={saveProfile}
            disabled={saving || !name.trim()}
            className="bg-[#5b4cf5] text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-[#4a3dd4] disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save profile'}
          </button>
        </section>

        <section className="border-t border-[#ede8e0] pt-4">
          <div className="flex items-center gap-1.5 mb-3">
            <ShieldCheck className="w-4 h-4 text-[#9c8b75]" />
            <h2 className="text-sm font-semibold text-[#1a1614]">Password protection</h2>
          </div>

          {person.auth_user_id || pwDone ? (
            <p className="text-xs text-green-600 font-medium">Password is set. This profile requires sign-in.</p>
          ) : (
            <div className="space-y-2">
              <input
                type="email"
                placeholder="Email"
                value={pwEmail}
                onChange={(e) => setPwEmail(e.target.value)}
                className="w-full border border-[#ede8e0] rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#5b4cf5]/30 bg-[#faf7f2]"
              />
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="New password (min 6 chars)"
                  value={pwPassword}
                  onChange={(e) => setPwPassword(e.target.value)}
                  className="w-full border border-[#ede8e0] rounded-xl px-3 py-2 pr-8 text-xs outline-none focus:ring-2 focus:ring-[#5b4cf5]/30 bg-[#faf7f2]"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((value) => !value)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9c8b75]"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              {pwError && <p className="text-[11px] text-red-500">{pwError}</p>}
              <button
                onClick={setPassword}
                disabled={pwSaving || !pwEmail || pwPassword.length < 6}
                className="text-xs font-medium text-[#5b4cf5] border border-[#5b4cf5]/30 px-3 py-1.5 rounded-xl hover:bg-[#5b4cf5]/5 disabled:opacity-40 transition-colors"
              >
                {pwSaving ? 'Setting...' : 'Set password'}
              </button>
            </div>
          )}
        </section>

        <section className="border-t border-[#ede8e0] pt-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Trash2 className="w-4 h-4 text-red-500" />
            <h2 className="text-sm font-semibold text-[#1a1614]">Delete account</h2>
          </div>

          {confirmDelete ? (
            <div className="space-y-3 rounded-xl bg-red-50 p-3">
              <p className="text-xs text-red-600">This removes your profile and, when password protected, your Supabase Auth user.</p>
              {deleteError && <p className="text-xs text-red-700">{deleteError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={deleteAccount}
                  disabled={deleting}
                  className="text-xs font-medium text-white bg-red-500 px-3 py-1.5 rounded-xl disabled:opacity-40"
                >
                  {deleting ? 'Deleting...' : 'Yes, delete'}
                </button>
                <button
                  onClick={() => { setConfirmDelete(false); setDeleteError('') }}
                  className="text-xs text-[#9c8b75] px-3 py-1.5"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs text-red-500 hover:text-red-600 transition-colors"
            >
              Delete account
            </button>
          )}
        </section>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <RealtimeProvider>
      <div className="flex flex-col min-h-screen bg-[#faf7f2]">
        <NavBar />
        <ProfileContent />
      </div>
    </RealtimeProvider>
  )
}
