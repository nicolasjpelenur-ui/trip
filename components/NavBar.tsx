'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getMessages } from '@/lib/chatQueries'
import { openOnboarding } from '@/components/OnboardingHost'
import {
  CalendarDays, HelpCircle, LayoutDashboard, Map,
  MessageSquare, Plus, UserRound,
} from 'lucide-react'

const TAB_ITEMS = [
  { href: '/dashboard', label: 'Home', Icon: LayoutDashboard },
  { href: '/calendar', label: 'Calendar', Icon: CalendarDays },
  { href: '/itinerary', label: 'Itinerary', Icon: Map },
  { href: '/chat', label: 'Chat', Icon: MessageSquare },
  { href: '/profile', label: 'Profile', Icon: UserRound },
]

export function NavBar() {
  const pathname = usePathname()
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [userColor, setUserColor] = useState('#5b4cf5')
  const [chatUnread, setChatUnread] = useState(false)

  useEffect(() => {
    queueMicrotask(() => {
      const id = localStorage.getItem('currentPersonId')
      const name = localStorage.getItem('currentPersonName')
      setUserName(name ?? '')
      if (id) {
        supabase.from('people').select('color').eq('id', id).single().then(({ data }) => {
          if (data) setUserColor(data.color)
        })
      }
    })
  }, [pathname])

  useEffect(() => {
    async function checkUnread() {
      const personId = localStorage.getItem('currentPersonId')
      if (!personId) { setChatUnread(false); return }
      const seenKey = `lastSeenAt_${personId}`
      const seen: Record<string, string> = JSON.parse(localStorage.getItem(seenKey) || '{}')
      const { data: memberships } = await supabase
        .from('group_members').select('group_id').eq('person_id', personId)
      const myGroupIds = (memberships ?? []).map((m) => m.group_id)
      if (myGroupIds.length === 0) { setChatUnread(false); return }
      for (const gid of myGroupIds) {
        const msgs = await getMessages(gid, 1)
        const last = msgs[0]
        if (last && seen[gid] && last.created_at > seen[gid]) { setChatUnread(true); return }
      }
      setChatUnread(false)
    }
    checkUnread()
  }, [pathname])

  return (
    <>
      {/* ── Slim top header (mobile only) ── */}
      <header className="md:hidden bg-white border-b border-[#ede8e0] px-4 h-12 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#5b4cf5] flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <span className="text-sm font-bold text-[#1a1614]">Trip Coordinator</span>
        </Link>

        <div className="flex items-center gap-1">
          <button
            onClick={openOnboarding}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#9c8b75] hover:bg-[#f3efe8] transition-colors"
            title="Help"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          {userName && (
            <button
              onClick={() => {
                supabase.auth.signOut()
                localStorage.removeItem('currentPersonId')
                localStorage.removeItem('currentPersonName')
                router.push('/')
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold hover:opacity-80 transition-opacity"
              style={{ backgroundColor: userColor }}
              title="Sign out"
            >
              {userName.charAt(0).toUpperCase()}
            </button>
          )}
        </div>
      </header>

      {/* ── Fixed bottom tab bar (mobile only) ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-[#ede8e0]"
        style={{ boxShadow: '0 -1px 12px rgba(100,60,10,0.08)' }}>
        <div className="grid grid-cols-5 h-16">
          {TAB_ITEMS.map(({ href, label, Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            const isChat = href === '/chat'
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex flex-col items-center justify-center gap-0.5 transition-colors active:scale-95 ${
                  active ? 'text-[#5b4cf5]' : 'text-[#9c8b75]'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 transition-transform ${active ? 'scale-110' : ''}`} />
                  {isChat && chatUnread && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#e8724a]" />
                  )}
                </div>
                <span className={`text-[10px] font-medium leading-none ${active ? 'text-[#5b4cf5]' : 'text-[#9c8b75]'}`}>
                  {label}
                </span>
                {active && (
                  <span className="absolute bottom-0 w-8 h-0.5 bg-[#5b4cf5] rounded-full" />
                )}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* ── Floating new-event button (mobile) ── */}
      <Link
        href="/events/new"
        className="md:hidden fixed bottom-20 right-4 z-50 w-12 h-12 rounded-full bg-[#5b4cf5] text-white flex items-center justify-center shadow-lg hover:bg-[#4a3dd4] active:scale-95 transition-all"
        title="New event"
      >
        <Plus className="w-5 h-5" />
      </Link>
    </>
  )
}
