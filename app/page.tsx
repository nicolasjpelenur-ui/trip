'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Person } from '@/lib/supabase'
import { getPeople, createPerson } from '@/lib/queries'
import { PersonAvatar } from '@/components/PersonChip'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff } from 'lucide-react'

const COLORS = [
  '#6366f1', '#ec4899', '#f97316', '#10b981',
  '#3b82f6', '#a855f7', '#ef4444', '#14b8a6',
  '#f59e0b', '#84cc16', '#06b6d4', '#d946ef',
  '#f43f5e', '#22c55e', '#0ea5e9', '#e11d48',
  '#7c3aed', '#db2777', '#ea580c', '#16a34a',
  '#2563eb', '#9333ea', '#0891b2', '#65a30d',
]

export default function HomePage() {
  const router = useRouter()
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(COLORS[0])
  const [saving, setSaving] = useState(false)
  // password sign-in state
  const [authPerson, setAuthPerson] = useState<Person | null>(null)
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [authError, setAuthError] = useState('')
  const [signingIn, setSigningIn] = useState(false)

  useEffect(() => {
    getPeople().then((p) => { setPeople(p); setLoading(false) })
  }, [])

  function handleSelectPerson(person: Person) {
    if (person.auth_user_id && person.email) {
      setAuthPerson(person)
      setPassword('')
      setAuthError('')
    } else {
      enterAsGuest(person)
    }
  }

  function enterAsGuest(person: Person) {
    localStorage.setItem('currentPersonId', person.id)
    localStorage.setItem('currentPersonName', person.name)
    router.push('/calendar')
  }

  async function handleSignIn() {
    if (!authPerson?.email || !password) return
    setSigningIn(true)
    setAuthError('')
    const { error } = await supabase.auth.signInWithPassword({ email: authPerson.email, password })
    if (error) {
      setAuthError('Wrong password. Try again.')
      setSigningIn(false)
      return
    }
    localStorage.setItem('currentPersonId', authPerson.id)
    localStorage.setItem('currentPersonName', authPerson.name)
    router.push('/calendar')
  }

  async function handleAddPerson() {
    if (!newName.trim()) return
    setSaving(true)
    const person = await createPerson({ name: newName.trim(), color: newColor })
    setPeople((prev) => [...prev, person].sort((a, b) => a.name.localeCompare(b.name)))
    setSaving(false)
    enterAsGuest(person)
  }

  // Password sign-in screen
  if (authPerson) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-[#faf8f5]">
        <div className="w-full max-w-xs">
          <div className="flex flex-col items-center mb-6">
            <PersonAvatar person={authPerson} size="lg" />
            <h2 className="text-lg font-bold text-[#1a1614] mt-3">{authPerson.name}</h2>
            <p className="text-sm text-[#9c8b75]">Enter your password to continue</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#ede8e0] p-5 space-y-3" style={{ boxShadow: '0 1px 4px rgba(100,60,10,0.08)' }}>
            <div className="relative">
              <input
                autoFocus
                type={showPw ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
                className="w-full border border-[#ede8e0] rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#5b4cf5]/30 focus:border-[#5b4cf5] bg-[#faf8f5] pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9c8b75]"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {authError && <p className="text-xs text-red-500">{authError}</p>}
            <button
              onClick={handleSignIn}
              disabled={!password || signingIn}
              className="w-full bg-[#5b4cf5] text-white text-sm font-medium py-2.5 rounded-xl hover:bg-[#4a3dd4] disabled:opacity-50 transition-colors"
            >
              {signingIn ? 'Signing in…' : 'Sign in'}
            </button>
            <button
              onClick={() => setAuthPerson(null)}
              className="w-full text-sm text-[#9c8b75] hover:text-[#1a1614] transition-colors py-1"
            >
              ← Back
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-[#faf8f5]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#5b4cf5] mb-4 shadow-lg">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#1a1614]">Trip Coordinator</h1>
          <p className="text-[#9c8b75] mt-1 text-sm">Valencia &amp; beyond — tap your name to continue</p>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-[#ede8e0] overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(100,60,10,0.08)' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-b border-[#ede8e0] last:border-0">
                <div className="skeleton w-9 h-9 rounded-full" />
                <div className="skeleton h-4 rounded w-28" />
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#ede8e0] overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(100,60,10,0.08)' }}>
            {people.length === 0 ? (
              <div className="text-center text-[#9c8b75] py-8 text-sm">No one added yet — be the first!</div>
            ) : (
              people.map((person) => (
                <button
                  key={person.id}
                  onClick={() => handleSelectPerson(person)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[#f3efe8] active:bg-[#ede8e0] transition-colors border-b border-[#ede8e0] last:border-0 text-left"
                >
                  <PersonAvatar person={person} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[#1a1614]">{person.name}</div>
                    {person.status && (
                      <div className="text-xs text-[#9c8b75] truncate">{person.status}</div>
                    )}
                  </div>
                  {person.auth_user_id && (
                    <span className="text-[10px] text-[#9c8b75] border border-[#ede8e0] rounded-full px-1.5 py-0.5 flex-shrink-0">🔒</span>
                  )}
                  <svg className="w-4 h-4 text-[#c9b99f] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))
            )}

            {!adding && (
              <button
                onClick={() => setAdding(true)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-[#5b4cf5] hover:bg-[#f3efe8] transition-colors text-sm font-medium border-t border-[#ede8e0]"
              >
                <span className="w-8 h-8 rounded-full border-2 border-dashed border-[#5b4cf5]/40 flex items-center justify-center text-[#5b4cf5] font-bold text-lg flex-shrink-0">+</span>
                I&apos;m not on the list
              </button>
            )}

            {adding && (
              <div className="p-4 border-t border-[#ede8e0] space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: newColor }}
                  >
                    {newName.charAt(0).toUpperCase() || '?'}
                  </div>
                  <input
                    autoFocus
                    type="text"
                    placeholder="Your name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddPerson()}
                    className="flex-1 border border-[#ede8e0] rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#5b4cf5]/30 focus:border-[#5b4cf5] bg-[#faf8f5]"
                  />
                </div>
                <div>
                  <p className="text-xs text-[#9c8b75] mb-2">Choose a color</p>
                  <div className="flex gap-2 flex-wrap">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setNewColor(c)}
                        className={`w-7 h-7 rounded-full transition-all ${newColor === c ? 'scale-125 ring-2 ring-offset-1 ring-[#9c8b75]' : 'hover:scale-110'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleAddPerson}
                    disabled={!newName.trim() || saving}
                    className="flex-1 bg-[#5b4cf5] text-white text-sm font-medium py-2.5 rounded-xl hover:bg-[#4a3dd4] disabled:opacity-50 transition-colors"
                  >
                    {saving ? 'Joining…' : 'Join'}
                  </button>
                  <button
                    onClick={() => { setAdding(false); setNewName('') }}
                    className="px-4 border border-[#ede8e0] text-sm text-[#9c8b75] rounded-xl hover:bg-[#f3efe8] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
