'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getGroups, getMessages } from '@/lib/chatQueries'
import {
  CalendarDays, MessageSquare, GitBranch, Activity,
  Users, ChevronLeft, ChevronRight, Plus, LogOut,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/calendar', label: 'Calendar', Icon: CalendarDays },
  { href: '/chat', label: 'Chat', Icon: MessageSquare },
  { href: '/arc', label: 'Arc', Icon: GitBranch },
  { href: '/activity', label: 'Activity', Icon: Activity },
  { href: '/people', label: 'People', Icon: Users },
]

export function DesktopSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [userName, setUserName] = useState('')
  const [userColor, setUserColor] = useState('#5b4cf5')
  const [chatUnread, setChatUnread] = useState(false)

  // Collapse setup — once only
  useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed') === 'true'
    setCollapsed(saved)
    document.documentElement.classList.toggle('sidebar-collapsed', saved)

    function handlePersonUpdated(e: Event) {
      const detail = (e as CustomEvent<{ name: string; color: string }>).detail
      setUserName(detail.name)
      setUserColor(detail.color)
    }
    window.addEventListener('personUpdated', handlePersonUpdated)
    return () => window.removeEventListener('personUpdated', handlePersonUpdated)
  }, [])

  // Re-read user identity on every route change so switching profiles updates immediately
  useEffect(() => {
    const id = localStorage.getItem('currentPersonId')
    const name = localStorage.getItem('currentPersonName')
    setUserName(name ?? '')
    if (id) {
      supabase.from('people').select('color').eq('id', id).single().then(({ data }) => {
        if (data) setUserColor(data.color)
      })
    }
  }, [pathname])

  useEffect(() => {
    async function checkUnread() {
      const personId = localStorage.getItem('currentPersonId')
      if (!personId) { setChatUnread(false); return }

      const seenKey = `lastSeenAt_${personId}`
      const seen: Record<string, string> = JSON.parse(localStorage.getItem(seenKey) || '{}')

      // Only check groups this person is a member of
      const { data: memberships } = await supabase
        .from('group_members').select('group_id').eq('person_id', personId)
      const myGroupIds = (memberships ?? []).map((m) => m.group_id)
      if (myGroupIds.length === 0) { setChatUnread(false); return }

      for (const gid of myGroupIds) {
        const msgs = await getMessages(gid, 1)
        const last = msgs[0]
        // Only unread if we have a seenAt AND the last message is newer
        if (last && seen[gid] && last.created_at > seen[gid]) {
          setChatUnread(true)
          return
        }
      }
      setChatUnread(false)
    }
    checkUnread()
  }, [pathname])

  function toggleCollapse() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('sidebarCollapsed', String(next))
    document.documentElement.classList.toggle('sidebar-collapsed', next)
  }

  function signOut() {
    supabase.auth.signOut()
    localStorage.removeItem('currentPersonId')
    localStorage.removeItem('currentPersonName')
    router.push('/')
  }

  return (
    <aside className={`hidden md:flex flex-col fixed inset-y-0 left-0 z-30 bg-white border-r border-[#ede8e0] transition-all duration-200 ${collapsed ? 'w-14' : 'w-52'}`}>
      {/* Logo */}
      <div className={`flex items-center h-14 border-b border-[#ede8e0] px-3 ${collapsed ? 'justify-center' : 'gap-2.5'}`}>
        <div className="w-7 h-7 rounded-lg bg-[#5b4cf5] flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </div>
        {!collapsed && <span className="text-sm font-bold text-[#1a1614] truncate">Trip Coordinator</span>}
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          const isChat = href === '/chat'
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors ${
                active ? 'bg-[#5b4cf5]/10 text-[#5b4cf5]' : 'text-[#9c8b75] hover:bg-[#f3efe8] hover:text-[#1a1614]'
              } ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? label : undefined}
            >
              <div className="relative flex-shrink-0">
                <Icon className="w-4 h-4" />
                {isChat && chatUnread && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#e8724a]" />
                )}
              </div>
              {!collapsed && label}
            </Link>
          )
        })}

        <Link
          href="/events/new"
          className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium bg-[#5b4cf5] text-white hover:bg-[#4a3dd4] transition-colors mt-2 ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? '+ Event' : undefined}
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          {!collapsed && 'New Event'}
        </Link>
      </nav>

      {/* User + sign-out + collapse */}
      <div className="border-t border-[#ede8e0] p-2 space-y-0.5">
        {userName && (
          <div className={`flex items-center gap-2.5 px-2.5 py-2 ${collapsed ? 'justify-center' : ''}`}>
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: userColor }}
            >
              {userName.charAt(0).toUpperCase()}
            </span>
            {!collapsed && (
              <span className="text-xs font-medium text-[#1a1614] flex-1 truncate">{userName.split(' ')[0]}</span>
            )}
          </div>
        )}
        <button
          onClick={signOut}
          className={`flex items-center gap-2.5 w-full rounded-xl px-2.5 py-2 text-xs text-[#9c8b75] hover:bg-[#fdf0ea] hover:text-[#e8724a] transition-colors ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'Sign out' : undefined}
        >
          <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
        <button
          onClick={toggleCollapse}
          className={`flex items-center gap-2 w-full rounded-xl px-2.5 py-2 text-xs text-[#9c8b75] hover:bg-[#f3efe8] transition-colors ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>Collapse</span></>}
        </button>
      </div>
    </aside>
  )
}
