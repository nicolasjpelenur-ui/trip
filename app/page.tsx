'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Person } from '@/lib/supabase'
import { getPeople, createPerson } from '@/lib/queries'
import { PersonAvatar } from '@/components/PersonChip'
import { Button } from '@/components/ui/button'

const COLORS = [
  '#6366f1', '#ec4899', '#f97316', '#10b981',
  '#3b82f6', '#a855f7', '#ef4444', '#14b8a6',
  '#f59e0b', '#84cc16',
]

export default function HomePage() {
  const router = useRouter()
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(COLORS[0])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getPeople().then((p) => { setPeople(p); setLoading(false) })
  }, [])

  function selectPerson(person: Person) {
    localStorage.setItem('currentPersonId', person.id)
    localStorage.setItem('currentPersonName', person.name)
    router.push('/calendar')
  }

  async function handleAddPerson() {
    if (!newName.trim()) return
    setSaving(true)
    const person = await createPerson({ name: newName.trim(), color: newColor, group: 'our_family' })
    setPeople((prev) => [...prev, person].sort((a, b) => a.name.localeCompare(b.name)))
    setSaving(false)
    selectPerson(person)
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-50 to-indigo-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 mb-4 shadow-lg">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Trip Coordinator</h1>
          <p className="text-gray-500 mt-1 text-sm">Valencia &amp; beyond — tap your name to continue</p>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-8">Loading...</div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {people.length === 0 ? (
              <div className="text-center text-gray-400 py-8 text-sm">No one added yet — be the first!</div>
            ) : (
              people.map((person) => (
                <button
                  key={person.id}
                  onClick={() => selectPerson(person)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-indigo-50 active:bg-indigo-100 transition-colors border-b border-gray-50 last:border-0 text-left"
                >
                  <PersonAvatar person={person} size="md" />
                  <span className="font-medium text-gray-800">{person.name}</span>
                  <svg className="w-4 h-4 text-gray-300 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))
            )}

            {!adding && (
              <button
                onClick={() => setAdding(true)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-indigo-600 hover:bg-indigo-50 transition-colors text-sm font-medium border-t border-gray-100"
              >
                <span className="w-8 h-8 rounded-full border-2 border-dashed border-indigo-300 flex items-center justify-center text-indigo-400 font-bold text-lg flex-shrink-0">+</span>
                I&apos;m not on the list
              </button>
            )}

            {adding && (
              <div className="p-4 border-t border-gray-100 space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 transition-colors"
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
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-2">Choose a color</p>
                  <div className="flex gap-2 flex-wrap">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setNewColor(c)}
                        className={`w-7 h-7 rounded-full transition-all ${newColor === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : 'hover:scale-110'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button onClick={handleAddPerson} disabled={!newName.trim() || saving} className="flex-1">
                    {saving ? 'Joining...' : 'Join'}
                  </Button>
                  <Button variant="outline" onClick={() => { setAdding(false); setNewName('') }}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
