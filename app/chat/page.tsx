'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { NavBar } from '@/components/NavBar'
import { RealtimeProvider } from '@/components/RealtimeProvider'
import { GroupCard } from '@/components/GroupCard'
import { PersonAvatar } from '@/components/PersonChip'
import { Group, GroupWithMembers, getGroups, getGroupWithMembers, getMessages, createGroup, findOrCreateDm } from '@/lib/chatQueries'
import { getPeople } from '@/lib/queries'
import { Person } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Plus, X, Lock, MessageCircle } from 'lucide-react'

const GROUP_COLORS = ['#5b4cf5', '#e8724a', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#a855f7', '#14b8a6', '#ef4444', '#84cc16']

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
  const [newColor, setNewColor] = useState(GROUP_COLORS[0])
  const [newMembers, setNewMembers] = useState<Set<string>>(new Set())
  const [newPrivate, setNewPrivate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dmLoading, setDmLoading] = useState<string | null>(null)
  const [dmError, setDmError] = useState('')

  const currentPersonId = typeof window !== 'undefined' ? localStorage.getItem('currentPersonId') : null

  useEffect(() => {
    async function load() {
      const [raw, people] = await Promise.all([getGroups(), getPeople()])
      setAllPeople(people)

      const withMembers = await Promise.all(raw.map((g) => getGroupWithMembers(g.id)))

      // Only show groups where the current person is a member
      const visible = withMembers.filter((g) =>
        !currentPersonId || g.members.some((m) => m.id === currentPersonId)
      )

      const seen: Record<string, string> = JSON.parse(localStorage.getItem('lastSeenAt') || '{}')
      const visibleRaw = raw.filter((g) => visible.some((v) => v.id === g.id))
      const msgs = await Promise.all(visibleRaw.map((g) => getMessages(g.id, 1)))

      const lm: Record<string, { content: string; created_at: string }> = {}
      const ur: Record<string, number> = {}

      for (let i = 0; i < visibleRaw.length; i++) {
        const last = msgs[i][msgs[i].length - 1]
        if (last) {
          lm[visibleRaw[i].id] = { content: last.content, created_at: last.created_at }
          const seenAt = seen[visibleRaw[i].id]
          if (!seenAt || last.created_at > seenAt) ur[visibleRaw[i].id] = 1
        }
      }
      setLastMessages(lm)
      setUnread(ur)
      setGroups(visible)
      setLoading(false)
    }
    load()
  }, [currentPersonId])

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

  async function handleOpenDm(otherId: string) {
    if (!currentPersonId) return
    setDmLoading(otherId)
    setDmError('')
    try {
      const g = await findOrCreateDm(currentPersonId, otherId)
      router.push(`/chat/${g.id}`)
    } catch (e) {
      const msg =
        e instanceof Error ? e.message :
        (e && typeof e === 'object' && 'message' in e) ? String((e as { message: unknown }).message) :
        JSON.stringify(e)
      setDmError(`Could not open DM: ${msg}`)
      console.error('DM error:', e)
    } finally {
      setDmLoading(null)
    }
  }

  const groupChats = groups.filter((g) => !g.is_dm)
  const dmChats = groups.filter((g) => g.is_dm)
  const otherPeople = allPeople.filter((p) => p.id !== currentPersonId)

  return (
    <div className="max-w-lg mx-auto px-4 py-6">

      {/* Direct Messages */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-[#1a1614]">Direct Messages</h2>
        </div>
        {dmError && (
          <p className="text-xs text-red-500 mb-2 px-1">{dmError}</p>
        )}
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <div key={i} className="skeleton h-14 rounded-2xl" />)}
          </div>
        ) : otherPeople.length === 0 ? (
          <p className="text-sm text-[#9c8b75]">No other people on the trip yet.</p>
        ) : (
          <div className="bg-white rounded-2xl border border-[#ede8e0] overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(100,60,10,0.07)' }}>
            {otherPeople.map((person, i) => {
              const dm = dmChats.find((g) => g.members.some((m) => m.id === person.id))
              const lastMsg = dm ? lastMessages[dm.id] : undefined
              const hasUnread = dm ? (unread[dm.id] ?? 0) > 0 : false
              return (
                <button
                  key={person.id}
                  onClick={() => handleOpenDm(person.id)}
                  disabled={dmLoading === person.id}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f3efe8] transition-colors text-left ${i > 0 ? 'border-t border-[#ede8e0]' : ''}`}
                >
                  <PersonAvatar person={person} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#1a1614]">{person.name}</span>
                      {hasUnread && <span className="w-2 h-2 rounded-full bg-[#e8724a] flex-shrink-0" />}
                    </div>
                    {lastMsg ? (
                      <p className="text-xs text-[#9c8b75] truncate">{lastMsg.content}</p>
                    ) : person.status ? (
                      <p className="text-xs text-[#9c8b75] truncate">{person.status}</p>
                    ) : null}
                  </div>
                  {dmLoading === person.id ? (
                    <span className="text-xs text-[#9c8b75] animate-pulse">…</span>
                  ) : (
                    <MessageCircle className="w-4 h-4 text-[#c9b99f] flex-shrink-0" />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Group Chats */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-[#1a1614]">Groups</h2>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 bg-[#5b4cf5] text-white text-xs font-medium px-3 py-1.5 rounded-xl hover:bg-[#4a3dd4] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> New group
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
                placeholder="Group name"
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
                <div className="flex gap-2 flex-wrap">
                  {GROUP_COLORS.map((c) => (
                    <button key={c} onClick={() => setNewColor(c)}
                      className={`w-7 h-7 rounded-full transition-all ${newColor === c ? 'scale-125 ring-2 ring-offset-1 ring-[#9c8b75]' : 'hover:scale-110'}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-[#1a1614] flex items-center gap-1"><Lock className="w-3 h-3" /> Private group</p>
                  <p className="text-[11px] text-[#9c8b75]">Only members can read it</p>
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
        ) : groupChats.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-[#ede8e0]">
            <div className="w-12 h-12 rounded-2xl bg-[#f3efe8] flex items-center justify-center mx-auto mb-3">
              <Plus className="w-5 h-5 text-[#9c8b75]" />
            </div>
            <p className="text-sm text-[#9c8b75]">No group chats yet</p>
            <p className="text-xs text-[#9c8b75]/60 mt-1">Create one for your Valencia crew, Paris trip…</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groupChats.map((g) => (
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
