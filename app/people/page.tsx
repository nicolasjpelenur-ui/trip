'use client'

import { useEffect, useState } from 'react'
import { NavBar } from '@/components/NavBar'
import { RealtimeProvider } from '@/components/RealtimeProvider'
import { PersonAvatar } from '@/components/PersonChip'
import { Person } from '@/lib/supabase'
import { getPeople, updatePerson } from '@/lib/queries'

const COLORS = [
  '#6366f1', '#ec4899', '#f97316', '#10b981',
  '#3b82f6', '#a855f7', '#ef4444', '#14b8a6',
  '#f59e0b', '#84cc16',
]

function PeopleContent() {
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')

  useEffect(() => {
    getPeople().then((p) => { setPeople(p); setLoading(false) })
  }, [])

  function startEdit(person: Person) {
    setEditing(person.id)
    setEditName(person.name)
    setEditColor(person.color)
  }

  async function saveEdit(id: string) {
    await updatePerson(id, { name: editName, color: editColor })
    setPeople((prev) =>
      prev.map((p) => p.id === id ? { ...p, name: editName, color: editColor } : p)
    )
    setEditing(null)
  }

  if (loading) return <div className="text-center py-8 text-gray-400">Loading...</div>

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900 mb-4">People</h1>
      <p className="text-sm text-gray-400 mb-5">Everyone joining the trip. Tap edit to update a name or color.</p>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {people.length === 0 && (
          <div className="text-center text-gray-400 py-8 text-sm">No people yet — add yourself from the home screen.</div>
        )}
        {people.map((person) => (
          <div key={person.id} className="border-b border-gray-50 last:border-0">
            {editing === person.id ? (
              <div className="p-4 space-y-3 bg-gray-50">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                    style={{ backgroundColor: editColor }}
                  >
                    {editName.charAt(0).toUpperCase() || '?'}
                  </div>
                  <input
                    autoFocus
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-2">Color</p>
                  <div className="flex gap-2 flex-wrap">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setEditColor(c)}
                        className={`w-7 h-7 rounded-full transition-all ${editColor === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : 'hover:scale-110'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => saveEdit(person.id)}
                    className="bg-indigo-600 text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="text-gray-500 text-xs border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors bg-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 px-4 py-3.5">
                <PersonAvatar person={person} size="md" />
                <span className="text-sm font-medium text-gray-800 flex-1">{person.name}</span>
                <button
                  onClick={() => startEdit(person)}
                  className="text-xs text-gray-400 hover:text-indigo-600 transition-colors px-2 py-1"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function PeoplePage() {
  return (
    <RealtimeProvider>
      <div className="flex flex-col min-h-screen bg-gray-50">
        <NavBar />
        <PeopleContent />
      </div>
    </RealtimeProvider>
  )
}
