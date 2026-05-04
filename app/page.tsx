'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Person, PersonGroup } from '@/lib/supabase'
import { getPeople, createPerson } from '@/lib/queries'
import { PersonDot } from '@/components/PersonChip'
import { Button } from '@/components/ui/button'

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

export default function HomePage() {
  const router = useRouter()
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newGroup, setNewGroup] = useState<PersonGroup>('our_family')
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
    const person = await createPerson({ name: newName.trim(), color: newColor, group: newGroup })
    setPeople((prev) => [...prev, person].sort((a, b) => a.name.localeCompare(b.name)))
    setSaving(false)
    selectPerson(person)
  }

  const grouped = (Object.keys(GROUP_LABELS) as PersonGroup[]).map((g) => ({
    group: g,
    label: GROUP_LABELS[g],
    members: people.filter((p) => p.group === g),
  })).filter((g) => g.members.length > 0)

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🗺️</div>
          <h1 className="text-2xl font-bold text-gray-900">Trip Coordinator</h1>
          <p className="text-gray-500 mt-1 text-sm">Valencia & beyond — who are you?</p>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-8">Loading...</div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {grouped.length === 0 ? (
              <div className="text-center text-gray-400 py-8 text-sm">No one added yet — be the first!</div>
            ) : (
              grouped.map(({ group, label, members }) => (
                <div key={group}>
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
                  </div>
                  {members.map((person) => (
                    <button
                      key={person.id}
                      onClick={() => selectPerson(person)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-indigo-50 transition-colors border-b border-gray-50 last:border-0 text-left"
                    >
                      <PersonDot color={person.color} size={12} />
                      <span className="font-medium text-gray-800">{person.name}</span>
                    </button>
                  ))}
                </div>
              ))
            )}

            {!adding && (
              <button
                onClick={() => setAdding(true)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-indigo-600 hover:bg-indigo-50 transition-colors text-sm font-medium border-t border-gray-100"
              >
                <span className="text-lg leading-none">+</span> I&apos;m not on the list
              </button>
            )}

            {adding && (
              <div className="p-4 border-t border-gray-100 space-y-3">
                <input
                  autoFocus
                  type="text"
                  placeholder="Your name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPerson()}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <select
                  value={newGroup}
                  onChange={(e) => setNewGroup(e.target.value as PersonGroup)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  {(Object.entries(GROUP_LABELS) as [PersonGroup, string][]).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">Pick a color</p>
                  <div className="flex gap-2 flex-wrap">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setNewColor(c)}
                        className={`w-7 h-7 rounded-full transition-transform ${newColor === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : ''}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddPerson} disabled={!newName.trim() || saving} className="flex-1">
                    {saving ? 'Saving...' : 'Join'}
                  </Button>
                  <Button variant="outline" onClick={() => setAdding(false)} className="flex-1">Cancel</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
