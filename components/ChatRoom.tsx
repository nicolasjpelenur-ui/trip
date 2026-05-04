'use client'

import { useEffect, useRef, useState, useCallback, Fragment } from 'react'
import { isSameDay, isToday, format, parseISO } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { Message, getMessages, sendMessage } from '@/lib/chatQueries'
import { MessageBubble } from './MessageBubble'
import { MessageSquare, Send } from 'lucide-react'

function DateSeparator({ date }: { date: Date }) {
  const label = isToday(date) ? 'Today' : format(date, 'EEE, MMM d')
  return (
    <div className="flex items-center gap-3 py-2 select-none">
      <div className="flex-1 h-px bg-[#ede8e0]" />
      <span className="text-[10px] text-[#9c8b75] font-medium tracking-wide uppercase">{label}</span>
      <div className="flex-1 h-px bg-[#ede8e0]" />
    </div>
  )
}

interface ChatRoomProps {
  groupId: string
  currentPersonId: string
}

export function ChatRoom({ groupId, currentPersonId }: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior })
  }, [])

  useEffect(() => {
    getMessages(groupId).then((msgs) => {
      setMessages(msgs)
      setTimeout(() => scrollToBottom('instant'), 50)
    })

    const channel = supabase
      .channel(`chat-${groupId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `group_id=eq.${groupId}` },
        async (payload) => {
          const { data } = await supabase
            .from('messages')
            .select('*, person:people(*)')
            .eq('id', payload.new.id)
            .single()
          if (data) {
            setMessages((prev) => [...prev, data as Message])
            scrollToBottom()
          }
        }
      )
      .subscribe()

    // Mark as seen
    const seen = JSON.parse(localStorage.getItem('lastSeenAt') || '{}')
    seen[groupId] = new Date().toISOString()
    localStorage.setItem('lastSeenAt', JSON.stringify(seen))

    return () => { supabase.removeChannel(channel) }
  }, [groupId, scrollToBottom])

  async function handleSend() {
    if (!input.trim() || sending) return
    setSending(true)
    const content = input.trim()
    setInput('')
    await sendMessage(groupId, currentPersonId, content)
    setSending(false)

    const seen = JSON.parse(localStorage.getItem('lastSeenAt') || '{}')
    seen[groupId] = new Date().toISOString()
    localStorage.setItem('lastSeenAt', JSON.stringify(seen))
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-[#9c8b75] text-sm py-16 flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-[#f3efe8] flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-[#c9b99f]" />
            </div>
            <div>
              <div className="font-medium text-[#1a1614]">No messages yet</div>
              <div className="text-xs mt-0.5">Start the conversation below</div>
            </div>
          </div>
        )}
        {messages.map((msg, i) => {
          const prev = messages[i - 1]
          const msgDate = parseISO(msg.created_at)
          const showDateSep = !prev || !isSameDay(parseISO(prev.created_at), msgDate)
          const showAvatar = !prev || prev.person_id !== msg.person_id || showDateSep
          return (
            <Fragment key={msg.id}>
              {showDateSep && <DateSeparator date={msgDate} />}
              <MessageBubble
                message={msg}
                isOwn={msg.person_id === currentPersonId}
                showAvatar={showAvatar}
              />
            </Fragment>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[#ede8e0] px-4 py-3 bg-white">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
            }}
            placeholder="Type a message…"
            rows={1}
            className="flex-1 resize-none border border-[#ede8e0] rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#5b4cf5]/30 focus:border-[#5b4cf5] bg-[#faf8f5] text-[#1a1614] placeholder:text-[#9c8b75] max-h-28"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="w-10 h-10 rounded-xl bg-[#5b4cf5] flex items-center justify-center flex-shrink-0 hover:bg-[#4a3dd4] disabled:opacity-40 transition-colors"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}
