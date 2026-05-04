'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { NavBar } from '@/components/NavBar'
import { RealtimeProvider } from '@/components/RealtimeProvider'
import { GroupCard } from '@/components/GroupCard'
import { PersonAvatar } from '@/components/PersonChip'
import { Group, GroupWithMembers, getGroups, getGroupWithMembers, getMessages, createGroup } from '@/lib/chatQueries'
import { getPeople } from '@/lib/queries'
import { Person } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Plus, X } from 'lucide-react'

const COLORS = ['#5b4cf5', '#e8724a', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#a855f7']

function ChatContent() {
  const router = useRouter()
  const [groups, setGroups] = useState<GroupWithMembers[]>([])
  const [lastMessages, setLastMessages] = useState<Record<string, { content: string; created_at: string }>>({})
  const [unread, setUnread] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [allPeople, setAllPeople] = useState<Person[]>([])
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newColor, setNewColor] = useState(COLORS[0])
  const [newMembers, setNewMembers] = useState<Set<string>>(new Set())
  const [newPrivate, setNewPrivate] = useState(false)
  const [saving, setSaving] = useState(false)

  const currentPersonId = typeof window !== 'undefined' ? localStorage.getItem('currentPersonId') : null

  useEffect(() => {
    async function load() {
      const raw = await getGroups()
      const withMembers = await Promise.all(raw.map((g) => getGroupWithMembers(g.id)))
      setGroups(withMembers)

      const seen: Record<string, string> = JSON.parse(localStorage.getItem('lastSeenAt') || '{}')
      const msgs = await Promise.all(raw.map((g) => getMessages(g.id, 1)))
      const lm: Record<string, { content: string; created_at: string }> = {}
      const ur: Record<string, number> = {}

      for (let i = 0; i < raw.length; i++) {
        const last = msgs[i][msgs[i].length - 1]
        if (last) {
          lm[raw[i].id] = { content: last.content, created_at: last.created_at }
          const seenAt = seen[raw[i].id]
          if (!seenAt || last.created_at > seenAt) ur[raw[i].id] = 1
        }
      }
      setLastMessages(lm)
      setUnread(ur)
      setLoading(false)
    }
    load()
    getPeople().then(setAllPeople)
  }, [])

  async function handleCreate() {
    if (!newName.trim()) return
    setSaving(true)
    const g = await createGroup(newName.trim(), newColor, newDesc, Array.from(newMembers), currentPersonId, newPrivate)
    const gw = await getGroupWithMembers(g.id)
    setGroups((prev) => [gw, ...prev])
    setCreating(false)
    setNewName(''); setNewDesc(''); setNewMembers(new Set()); setNewPrivate(false)
    setSaving(false)
    router.push(`/chat/${g.id}`)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-[#1a1614]">Groups</h1>
          <p className="text-sm text-[#9c8b75] mt-0.5">Chat with your travel crew</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 bg-[#5b4cf5] text-white text-sm font-medium px-3.5 py-2 rounded-xl hover:bg-[#4a3dd4] transition-colors"
        >
          <Plus className="w-4 h-4" /> New group
        </button>
      </div>

      {/* Create group form */}
      {creating && (
        <div className="bg-white rounded-2xl border border-[#ede8e0] p-4 mb-4 animate-sheet" style={{ boxShadow: '0 1px 4px rgba(100,60,10,0.08)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-[#1a1614]">New group</span>
            <button onClick={() => setCreating(false)}><X className="w-4 h-4 text-[#9c8b75]" /></button>
          </div>
          <div className="space-y-3">
            <input
              autoFocus
              type="text"
              placeholder="Group name (e.g. Valencia June crew)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full border border-[#ede8e0] rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#5b4cf5]/30 focus:border-[#5b4cf5] bg-[#faf8f5]"
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="w-full border border-[#ede8e0] rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#5b4cf5]/30 focus:border-[#5b4cf5] bg-[#faf8f5]"
            />
            <div>
              <p className="text-xs text-[#9c8b75] mb-1.5">Color</p>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button key={c} onClick={() => setNewColor(c)}
                    className={`w-7 h-7 rounded-full transition-all ${newColor === c ? 'scale-125 ring-2 ring-offset-1 ring-[#9c8b75]' : 'hover:scale-110'}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#1a1614]">Private group</p>
                <p className="text-[11px] text-[#9c8b75]">Only members with passwords can read it</p>
              </div>
              <button
                type="button"
                onClick={() => setNewPrivate((v) => !v)}
                className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 relative ${newPrivate ? 'bg-[#5b4cf5]' : 'bg-[#ede8e0]'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${newPrivate ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <div>
              <p className="text-xs text-[#9c8b75] mb-2">Add members</p>
              <div className="flex flex-wrap gap-2">
                {allPeople.map((p) => {
                  const sel = newMembers.has(p.id)
                  return (
                    <button
                      key={p.id}
                      onClick={() => setNewMembers((prev) => { const n = new Set(prev); sel ? n.delete(p.id) : n.add(p.id); return n })}
                      className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all"
                      style={{
                        backgroundColor: sel ? p.color : '#f3efe8',
                        color: sel ? 'white' : '#9c8b75',
                      }}
                    >
                      <PersonAvatar person={p} size="sm" active={sel} />
                      {p.name.split(' ')[0]}
                    </button>
                  )
                })}
              </div>
            </div>
            <Button onClick={handleCreate} disabled={!newName.trim() || saving} className="w-full">
              {saving ? 'Creating…' : 'Create group'}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-[#f3efe8] flex items-center justify-center mx-auto mb-3">
            <Plus className="w-6 h-6 text-[#9c8b75]" />
          </div>
          <p className="text-sm text-[#9c8b75]">No groups yet</p>
          <p className="text-xs text-[#9c8b75]/60 mt-1">Create one for your Valencia crew, Paris trip…</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <GroupCard
              key={g.id}
              group={g}
              members={g.members}
              lastMessage={lastMessages[g.id]?.content}
              lastMessageAt={lastMessages[g.id]?.created_at}
              unreadCount={unread[g.id] ?? 0}
              onClick={() => router.push(`/chat/${g.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function ChatPage() {
  return (
    <RealtimeProvider>
      <div className="flex flex-col min-h-screen bg-[#faf8f5]">
        <NavBar />
        <ChatContent />
      </div>
    </RealtimeProvider>
  )
}
