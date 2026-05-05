'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { NavBar } from '@/components/NavBar'
import { RealtimeProvider } from '@/components/RealtimeProvider'
import { ChatRoom } from '@/components/ChatRoom'
import { PersonAvatar } from '@/components/PersonChip'
import { GroupWithMembers, getGroupWithMembers, deleteGroup } from '@/lib/chatQueries'
import { ChevronLeft, Trash2 } from 'lucide-react'

function ChatRoomContent({ id }: { id: string }) {
  const router = useRouter()
  const [group, setGroup] = useState<GroupWithMembers | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const currentPersonId = typeof window !== 'undefined' ? localStorage.getItem('currentPersonId') ?? '' : ''

  useEffect(() => {
    getGroupWithMembers(id).then(setGroup)
  }, [id])

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteGroup(id)
      router.replace('/chat')
    } finally {
      setDeleting(false)
    }
  }

  if (!group) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="skeleton w-32 h-4 rounded" />
    </div>
  )

  const isDm = group.is_dm
  const otherPerson = isDm ? group.members.find((m) => m.id !== currentPersonId) : null
  const isCreator = group.created_by === currentPersonId

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Room header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#ede8e0] bg-white">
        <button onClick={() => router.back()} className="text-[#9c8b75] hover:text-[#1a1614] transition-colors flex-shrink-0">
          <ChevronLeft className="w-5 h-5" />
        </button>

        {isDm && otherPerson ? (
          <>
            <PersonAvatar person={otherPerson} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#1a1614] truncate">{otherPerson.name}</p>
              {otherPerson.status && <p className="text-xs text-[#9c8b75] truncate">{otherPerson.status}</p>}
            </div>
          </>
        ) : (
          <>
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: group.color + '25', border: `1.5px solid ${group.color}50` }}
            >
              <span className="text-xs font-bold" style={{ color: group.color }}>
                {group.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#1a1614] truncate">{group.name}</p>
              {group.description && (
                <p className="text-xs text-[#9c8b75] truncate">{group.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center">
                {group.members.slice(0, 4).map((p, i) => (
                  <div key={p.id} style={{ marginLeft: i > 0 ? -5 : 0 }}>
                    <PersonAvatar person={p} size="sm" />
                  </div>
                ))}
                {group.members.length > 4 && (
                  <span className="text-[10px] text-[#9c8b75] ml-1">+{group.members.length - 4}</span>
                )}
              </div>
            </div>
          </>
        )}

        {/* Delete button — creator or DM participant */}
        {(isCreator || isDm) && !confirmDelete && (
          <button
            onClick={() => setConfirmDelete(true)}
            className="ml-1 p-1.5 rounded-lg text-[#9c8b75] hover:text-[#e8724a] hover:bg-[#fdf0ea] transition-colors flex-shrink-0"
            title="Delete conversation"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        {confirmDelete && (
          <div className="flex items-center gap-2 ml-1 flex-shrink-0">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs font-medium text-white bg-red-500 px-2.5 py-1 rounded-full"
            >
              {deleting ? '…' : 'Delete'}
            </button>
            <button onClick={() => setConfirmDelete(false)} className="text-xs text-[#9c8b75]">Cancel</button>
          </div>
        )}
      </div>

      <ChatRoom groupId={id} currentPersonId={currentPersonId} />
    </div>
  )
}

export default function ChatRoomPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <RealtimeProvider>
      <div className="flex flex-col h-screen bg-[#faf8f5]">
        <NavBar />
        <ChatRoomContent id={id} />
      </div>
    </RealtimeProvider>
  )
}
