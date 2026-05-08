'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Person } from '@/lib/supabase'
import {
  EventComment, EventReaction,
  getEventComments, addEventComment,
  getEventReactions, toggleEventReaction,
} from '@/lib/chatQueries'
import { PersonAvatar } from './PersonChip'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ThumbsUp, Heart, HelpCircle, Clock, PartyPopper, Send } from 'lucide-react'
import { PollCard, PollCreator } from './PollCard'
import { Poll, getPollsForEvent } from '@/lib/pollQueries'
import { useT } from '@/lib/i18n'

const REACTIONS = [
  { key: 'thumbs-up', Icon: ThumbsUp },
  { key: 'heart', Icon: Heart },
  { key: 'question', Icon: HelpCircle },
  { key: 'clock', Icon: Clock },
  { key: 'party', Icon: PartyPopper },
] as const

interface EventCommentsProps {
  eventId: string
  currentPerson: Person | null
}

export function EventComments({ eventId, currentPerson }: EventCommentsProps) {
  const { t } = useT()
  const [comments, setComments] = useState<EventComment[]>([])
  const [reactions, setReactions] = useState<EventReaction[]>([])
  const [polls, setPolls] = useState<Poll[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  function loadPolls() {
    getPollsForEvent(eventId).then(setPolls).catch(() => {})
  }

  useEffect(() => {
    Promise.all([getEventComments(eventId), getEventReactions(eventId)]).then(([c, r]) => {
      setComments(c)
      setReactions(r)
    })
    loadPolls()

    const channel = supabase
      .channel(`event-${eventId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event_comments', filter: `event_id=eq.${eventId}` }, async (payload) => {
        const { data } = await supabase.from('event_comments').select('*, person:people(*)').eq('id', payload.new.id).single()
        if (data) setComments((prev) => [...prev, data as EventComment])
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_reactions', filter: `event_id=eq.${eventId}` }, () => {
        getEventReactions(eventId).then(setReactions)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [eventId])

  async function handleSend() {
    if (!input.trim() || !currentPerson || sending) return
    setSending(true)
    await addEventComment(eventId, currentPerson.id, input.trim())
    setInput('')
    setSending(false)
  }

  async function handleReaction(reaction: string) {
    if (!currentPerson) return
    await toggleEventReaction(eventId, currentPerson.id, reaction)
    getEventReactions(eventId).then(setReactions)
  }

  const reactionCounts = REACTIONS.map(({ key }) => ({
    key,
    count: reactions.filter((r) => r.reaction === key).length,
    mine: reactions.some((r) => r.reaction === key && r.person_id === currentPerson?.id),
  }))

  return (
    <div className="mt-3 pt-3 border-t border-[#ede8e0] space-y-3">
      {/* Polls */}
      {polls.map((poll) => (
        <PollCard key={poll.id} poll={poll} currentPersonId={currentPerson?.id ?? null} onRefresh={loadPolls} />
      ))}
      <PollCreator
        currentPersonId={currentPerson?.id ?? null}
        eventId={eventId}
        onCreated={loadPolls}
      />
      {/* Reactions */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {reactionCounts.map(({ key, count, mine }) => {
          const { Icon } = REACTIONS.find((r) => r.key === key)!
          return (
            <button
              key={key}
              onClick={() => handleReaction(key)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all active:scale-90 ${
                mine
                  ? 'bg-[#5b4cf5] text-white'
                  : count > 0
                  ? 'bg-[#f3efe8] text-[#9c8b75] hover:bg-[#ede8e0]'
                  : 'bg-transparent text-[#9c8b75]/60 hover:bg-[#f3efe8]'
              }`}
            >
              <Icon className="w-3 h-3" />
              {count > 0 && <span>{count}</span>}
            </button>
          )
        })}
      </div>

      {/* Comments */}
      {comments.length > 0 && (
        <div className="space-y-2.5 mb-3 max-h-48 overflow-y-auto">
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2 animate-message">
              {c.person && <PersonAvatar person={c.person} size="sm" />}
              <div className="flex-1 bg-[#f3efe8] rounded-xl rounded-tl-sm px-3 py-2">
                {c.person && (
                  <span className="text-[11px] font-semibold block mb-0.5" style={{ color: c.person.color }}>
                    {c.person.name.split(' ')[0]}
                  </span>
                )}
                <p className="text-xs text-[#1a1614] leading-relaxed">{c.content}</p>
                <p className="text-[10px] text-[#9c8b75] mt-0.5">
                  {formatDistanceToNow(parseISO(c.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comment input */}
      {currentPerson && (
        <div className="flex items-center gap-2">
          <PersonAvatar person={currentPerson} size="sm" />
          <div className="flex-1 flex items-center gap-2 bg-[#f3efe8] rounded-xl px-3 py-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={t('comments.addComment')}
              className="flex-1 bg-transparent text-xs text-[#1a1614] outline-none placeholder:text-[#9c8b75]"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="text-[#5b4cf5] disabled:opacity-30 transition-opacity"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
