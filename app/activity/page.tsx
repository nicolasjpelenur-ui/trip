'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { NavBar } from '@/components/NavBar'
import { RealtimeProvider } from '@/components/RealtimeProvider'
import { PersonAvatar } from '@/components/PersonChip'
import { ActivityLog } from '@/lib/supabase'
import { getActivityLog } from '@/lib/queries'
import { supabase } from '@/lib/supabase'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { Activity, MessageSquare } from 'lucide-react'
import { useT } from '@/lib/i18n'

function ActivityContent() {
  const router = useRouter()
  const { t } = useT()
  const [log, setLog] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const personId = typeof window !== 'undefined' ? localStorage.getItem('currentPersonId') : null
    const data = await getActivityLog(personId)
    setLog(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!localStorage.getItem('currentPersonId')) { router.replace('/'); return }
    queueMicrotask(() => { void load() })

    const channel = supabase
      .channel('activity-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_log' }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [router, load])

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-3">
        <div className="skeleton h-6 w-32 rounded mb-2" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="skeleton w-8 h-8 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-1.5 pt-1">
              <div className="skeleton h-3 rounded w-48" />
              <div className="skeleton h-2.5 rounded w-20" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-[#1a1614] mb-1">{t('activity.pageTitle')}</h1>
      <p className="text-sm text-[#9c8b75] mb-5">{t('activity.pageSubtitle')}</p>

      {log.length === 0 ? (
        <div className="text-center py-16 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-[#f3efe8] flex items-center justify-center">
            <Activity className="w-6 h-6 text-[#c9b99f]" />
          </div>
          <div>
            <div className="font-medium text-[#1a1614]">{t('activity.noActivity')}</div>
            <div className="text-xs text-[#9c8b75] mt-0.5">{t('activity.noActivityHint')}</div>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          {log.map((entry, i) => {
            const prev = log[i - 1]
            const showDate = !prev ||
              parseISO(prev.created_at).toDateString() !== parseISO(entry.created_at).toDateString()
            return (
              <div key={entry.id}>
                {showDate && (
                  <div className="flex items-center gap-3 py-3">
                    <div className="flex-1 h-px bg-[#ede8e0]" />
                    <span className="text-[10px] text-[#9c8b75] font-medium uppercase tracking-wide">
                      {formatDistanceToNow(parseISO(entry.created_at), { addSuffix: true })}
                    </span>
                    <div className="flex-1 h-px bg-[#ede8e0]" />
                  </div>
                )}
                <div className="flex items-start gap-3 py-2.5">
                  {entry.person ? (
                    <div className="relative flex-shrink-0">
                      <PersonAvatar person={entry.person} size="sm" />
                      {entry.action === 'sent_message' && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#5b4cf5] flex items-center justify-center">
                          <MessageSquare className="w-2 h-2 text-white" />
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-[#f3efe8] flex items-center justify-center flex-shrink-0">
                      <Activity className="w-3.5 h-3.5 text-[#9c8b75]" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#1a1614]">
                      {entry.person && (
                        <span className="font-medium" style={{ color: entry.person.color }}>
                          {entry.person.name.split(' ')[0]}{' '}
                        </span>
                      )}
                      <span className="text-[#9c8b75]">{t(`activity.actions.${entry.action}`)}</span>
                      {entry.description && (
                        <span className="text-[#1a1614]"> — {entry.description}</span>
                      )}
                    </p>
                    <p className="text-[10px] text-[#9c8b75] mt-0.5">
                      {formatDistanceToNow(parseISO(entry.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function ActivityPage() {
  return (
    <RealtimeProvider>
      <div className="flex flex-col min-h-screen bg-[#faf7f2]">
        <NavBar />
        <ActivityContent />
      </div>
    </RealtimeProvider>
  )
}
