import { Message } from '@/lib/chatQueries'
import { PersonAvatar } from './PersonChip'
import { formatDistanceToNow, parseISO } from 'date-fns'

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  showAvatar: boolean
}

export function MessageBubble({ message, isOwn, showAvatar }: MessageBubbleProps) {
  const time = formatDistanceToNow(parseISO(message.created_at), { addSuffix: true })

  return (
    <div className={`flex items-end gap-2 animate-message ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className="w-7 flex-shrink-0">
        {showAvatar && message.person && (
          <PersonAvatar person={message.person} size="sm" />
        )}
      </div>
      <div className={`max-w-[72%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
        {showAvatar && !isOwn && message.person && (
          <span className="text-[11px] font-medium px-1" style={{ color: message.person.color }}>
            {message.person.name.split(' ')[0]}
          </span>
        )}
        <div
          className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
            isOwn
              ? 'bg-[#5b4cf5] text-white rounded-br-sm'
              : 'bg-white border border-[#ede8e0] text-[#1a1614] rounded-bl-sm'
          }`}
          style={isOwn ? {} : { boxShadow: '0 1px 3px rgba(100,60,10,0.07)' }}
        >
          {message.content}
        </div>
        <span className="text-[10px] text-[#9c8b75] px-1">{time}</span>
      </div>
    </div>
  )
}
