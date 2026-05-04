import { Group } from '@/lib/chatQueries'
import { Person } from '@/lib/supabase'
import { PersonAvatar } from './PersonChip'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { MessageCircle } from 'lucide-react'

interface GroupCardProps {
  group: Group
  members: Person[]
  lastMessage?: string
  lastMessageAt?: string
  unreadCount?: number
  onClick: () => void
}

export function GroupCard({ group, members, lastMessage, lastMessageAt, unreadCount = 0, onClick }: GroupCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-2xl border border-[#ede8e0] p-4 hover:border-[#5b4cf5]/40 hover:shadow-md transition-all animate-pop"
      style={{ boxShadow: '0 1px 4px rgba(100,60,10,0.08)' }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: group.color + '20', border: `1.5px solid ${group.color}40` }}
        >
          <MessageCircle className="w-5 h-5" style={{ color: group.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-[#1a1614] text-sm truncate">{group.name}</span>
            {unreadCount > 0 && (
              <span className="flex-shrink-0 bg-[#e8724a] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {unreadCount}
              </span>
            )}
          </div>
          {group.description && (
            <p className="text-xs text-[#9c8b75] mt-0.5 truncate">{group.description}</p>
          )}
          {lastMessage && (
            <p className="text-xs text-[#9c8b75] mt-1.5 truncate">{lastMessage}</p>
          )}
          {lastMessageAt && (
            <p className="text-[10px] text-[#9c8b75]/60 mt-0.5">
              {formatDistanceToNow(parseISO(lastMessageAt), { addSuffix: true })}
            </p>
          )}
        </div>
      </div>
      {members.length > 0 && (
        <div className="flex items-center gap-1 mt-3">
          {members.slice(0, 6).map((p, i) => (
            <div key={p.id} style={{ marginLeft: i > 0 ? -6 : 0, zIndex: members.length - i }}>
              <PersonAvatar person={p} size="sm" />
            </div>
          ))}
          {members.length > 6 && (
            <span className="text-[10px] text-[#9c8b75] ml-2">+{members.length - 6}</span>
          )}
        </div>
      )}
    </button>
  )
}
