'use client'

import { useEffect, useState } from 'react'
import { NavBar } from '@/components/NavBar'
import { RealtimeProvider } from '@/components/RealtimeProvider'
import { PersonDot } from '@/components/PersonChip'
import { Person, PersonGroup } from '@/lib/supabase'
import { getPeople, updatePerson } from '@/lib/queries'

const GROUP_LABELS: Record<PersonGroup, string> = {
  us: 'Us',
  our_family: 'Our Family',
  partner_family: "Partner's Family",
}

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
  const [editGroup, setEditGroup] = useState<PersonGroup>('our_family')

  useEffect(() => {
    getPeople().then((p) => { setPeople(p); setLoading(false) })
  }, [])

  function startEdit(person: Person) {
    setEditing(person.id)
    setEditName(person.name)
    setEditColor(person.color)
    setEditGroup(person.group)
  }

  async function saveEdit(id: string) {
    await updatePerson(id, { name: editName, color: editColor, group: editGroup })
    setPeople((prev) =>
      prev.map((p) => p.id === id ? { ...p, name: editName, color: editColor, group: editGroup } : p)
    )
    setEditing(null)
  }

  const grouped = (Object.keys(GROUP_LABELS) as PersonGroup[]).map((g) => ({
    group: g,
    label: GROUP_LABELS[g],
    members: people.filter((p) => p.group === g),
  })).filter((g) => g.members.length > 0)

  if (loading) return <div className="text-center py-8 text-gray-400">Loading...</div>

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900 mb-6">People</h1>

      {grouped.map(({ group, label, members }) => (
        <div key={group} className="mb-6">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</h2>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {members.map((person) => (
              <div key={person.id} className="border-b border-gray-50 last:border-0">
                {editing === person.id ? (
                  <div className="p-3 space-y-2">
                    <input
                      autoFocus
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <select
                      value={editGroup}
                      onChange={(e) => setEditGroup(e.target.value as PersonGroup)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      {(Object.entries(GROUP_LABELS) as [PersonGroup, string][]).map(([val, lbl]) => (
                        <option key={val} value={val}>{lbl}</option>
                      ))}
                    </select>
                    <div className="flex gap-1.5 flex-wrap">
                      {COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => setEditColor(c)}
                          className={`w-6 h-6 rounded-full transition-transform ${editColor === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : ''}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(person.id)}
                        className="bg-indigo-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditing(null)}
                        className="text-gray-500 text-xs border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <PersonDot color={person.color} size={12} />
                    <span className="text-sm font-medium text-gray-800 flex-1">{person.name}</span>
                    <button
                      onClick={() => startEdit(person)}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function PeoplePage() {
  return (
    <RealtimeProvider>
      <div className="flex flex-col min-h-screen">
        <NavBar />
        <PeopleContent />
      </div>
    </RealtimeProvider>
  )
}
