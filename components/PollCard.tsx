'use client'

import { useState } from 'react'
import { Poll, toggleVote, getPollsForEvent, getPollsForGroup } from '@/lib/pollQueries'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { BarChart2 } from 'lucide-react'
import { useT } from '@/lib/i18n'

interface PollCardProps {
  poll: Poll
  currentPersonId: string | null
  onRefresh: () => void
}

export function PollCard({ poll, currentPersonId, onRefresh }: PollCardProps) {
  const { t } = useT()
  const [voting, setVoting] = useState(false)
  const totalVotes = poll.votes.length
  const myVote = currentPersonId ? poll.votes.find((v) => v.person_id === currentPersonId) : null

  async function handleVote(optionId: string) {
    if (!currentPersonId || voting) return
    setVoting(true)
    try {
      await toggleVote(poll, optionId, currentPersonId)
      onRefresh()
    } finally {
      setVoting(false)
    }
  }

  return (
    <div className="bg-[#f3efe8] rounded-2xl p-3 space-y-2">
      <div className="flex items-start gap-2">
        <BarChart2 className="w-3.5 h-3.5 text-[#5b4cf5] flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-[#1a1614] leading-snug">{poll.question}</p>
          <p className="text-[10px] text-[#9c8b75] mt-0.5">
            {totalVotes === 1
              ? t('polls.voteSingular', { count: totalVotes })
              : t('polls.votePlural',   { count: totalVotes })}
            {' · '}
            {formatDistanceToNow(parseISO(poll.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>
      <div className="space-y-1.5">
        {poll.options.map((opt) => {
          const votes = poll.votes.filter((v) => v.option_id === opt.id).length
          const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0
          const isMyVote = myVote?.option_id === opt.id
          return (
            <button
              key={opt.id}
              onClick={() => handleVote(opt.id)}
              disabled={voting}
              className="w-full text-left relative overflow-hidden rounded-xl border transition-all"
              style={{
                borderColor: isMyVote ? '#5b4cf5' : '#ede8e0',
                backgroundColor: 'white',
              }}
            >
              {/* Progress bar */}
              <div
                className="absolute inset-y-0 left-0 transition-all duration-300"
                style={{
                  width: `${pct}%`,
                  backgroundColor: isMyVote ? '#5b4cf5' + '18' : '#f3efe8',
                }}
              />
              <div className="relative flex items-center justify-between px-3 py-2">
                <span className={`text-xs font-medium ${isMyVote ? 'text-[#5b4cf5]' : 'text-[#1a1614]'}`}>
                  {opt.text}
                  {isMyVote && ' ✓'}
                </span>
                <span className="text-[10px] text-[#9c8b75] ml-2 flex-shrink-0">{pct}%</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface PollCreatorProps {
  currentPersonId: string | null
  eventId?: string
  groupId?: string
  onCreated: () => void
}

export function PollCreator({ currentPersonId, eventId, groupId, onCreated }: PollCreatorProps) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [saving, setSaving] = useState(false)

  async function handleCreate() {
    const filled = options.filter((o) => o.trim())
    if (!question.trim() || filled.length < 2) return
    setSaving(true)
    try {
      const { createPoll } = await import('@/lib/pollQueries')
      await createPoll(question.trim(), filled, currentPersonId ?? null, eventId, groupId)
      setQuestion('')
      setOptions(['', ''])
      setOpen(false)
      onCreated()
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-[11px] text-[#9c8b75] hover:text-[#5b4cf5] transition-colors"
      >
        <BarChart2 className="w-3 h-3" /> {t('polls.addPoll')}
      </button>
    )
  }

  return (
    <div className="bg-[#f3efe8] rounded-2xl p-3 space-y-2 animate-sheet">
      <input
        autoFocus
        type="text"
        placeholder={t('polls.pollQuestion')}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        className="w-full bg-white border border-[#ede8e0] rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#5b4cf5]/30"
      />
      {options.map((opt, i) => (
        <input
          key={i}
          type="text"
          placeholder={t('polls.optionPlaceholder', { n: i + 1 })}
          value={opt}
          onChange={(e) => setOptions((prev) => prev.map((o, j) => j === i ? e.target.value : o))}
          className="w-full bg-white border border-[#ede8e0] rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#5b4cf5]/30"
        />
      ))}
      {options.length < 5 && (
        <button onClick={() => setOptions((o) => [...o, ''])} className="text-[11px] text-[#9c8b75] hover:text-[#5b4cf5] transition-colors">
          {t('polls.addOption')}
        </button>
      )}
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleCreate}
          disabled={saving || !question.trim() || options.filter((o) => o.trim()).length < 2}
          className="flex-1 bg-[#5b4cf5] text-white text-xs font-medium py-2 rounded-xl disabled:opacity-40 hover:bg-[#4a3dd4] transition-colors"
        >
          {saving ? t('polls.creating') : t('polls.createPoll')}
        </button>
        <button onClick={() => setOpen(false)} className="text-xs text-[#9c8b75] px-3 border border-[#ede8e0] rounded-xl bg-white">
          {t('common.cancel')}
        </button>
      </div>
    </div>
  )
}

// Shared hook for loading polls
export async function refreshPolls(eventId?: string, groupId?: string): Promise<Poll[]> {
  if (eventId) return getPollsForEvent(eventId)
  if (groupId) return getPollsForGroup(groupId)
  return []
}
