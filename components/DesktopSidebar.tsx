'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getMessages } from '@/lib/chatQueries'
import { openOnboarding } from '@/components/OnboardingHost'
import {
  CalendarDays, MessageSquare, GitBranch, Activity, HelpCircle,
  Users, UserRound, ChevronLeft, ChevronRight, Plus, LogOut, LayoutDashboard, Map,
} from 'lucide-react'

const PRIMARY_NAV = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/calendar', label: 'Calendar', Icon: CalendarDays },
  { href: '/itinerary', label: 'Itinerary', Icon: Map },
  { href: '/chat', label: 'Chat', Icon: MessageSquare },
  { href: '/people', label: 'People', Icon: Users },
]

const SECONDARY_NAV = [
  { href: '/profile', label: 'Profile', Icon: UserRound },
  { href: '/arc', label: 'Arc', Icon: GitBranch },
  { href: '/activity', label: 'Activity', Icon: Activity },
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
    queueMicrotask(() => {
      const saved = localStorage.getItem('sidebarCollapsed') === 'true'
      setCollapsed(saved)
      document.documentElement.classList.toggle('sidebar-collapsed', saved)
    })

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
    <aside className={`hidden md:flex flex-col fixed inset-y-0 left-0 z-30 border-r border-[#e0d8cc] transition-all duration-200 ${collapsed ? 'w-14' : 'w-52'}`}
      style={{ background: 'linear-gradient(180deg, #fdf9f4 0%, #faf6ef 100%)' }}>
      {/* Logo */}
      <button
        onClick={toggleCollapse}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className={`flex items-center h-14 border-b border-[#e0d8cc] px-3 w-full hover:bg-[#f5ede0]/60 transition-colors ${collapsed ? 'justify-center' : 'gap-2.5'}`}
      >
        <div className="w-7 h-7 rounded-lg bg-[#5b4cf5] flex items-center justify-center flex-shrink-0 shadow-sm">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </div>
        {!collapsed && (
          <span className="text-sm font-bold text-[#1a1614] truncate">
            Trip Coordinator
          </span>
        )}
      </button>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {PRIMARY_NAV.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          const isChat = href === '/chat'
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium transition-all ${
                active
                  ? 'bg-[#5b4cf5]/8 text-[#5b4cf5]'
                  : 'text-[#8a7a68] hover:bg-[#f0e9de]/70 hover:text-[#1a1614]'
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
          className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium bg-[#5b4cf5] text-white hover:bg-[#4a3dd4] active:scale-[0.98] transition-all mt-2 shadow-sm ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? '+ Event' : undefined}
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          {!collapsed && 'New Event'}
        </Link>

        {/* Secondary nav */}
        <div className="pt-2 mt-1 border-t border-[#e0d8cc]/70 space-y-0.5">
          {SECONDARY_NAV.map(({ href, label, Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-all ${
                  active
                    ? 'bg-[#5b4cf5]/8 text-[#5b4cf5]'
                    : 'text-[#b0a090] hover:bg-[#f0e9de]/70 hover:text-[#6b5d4f]'
                } ${collapsed ? 'justify-center' : ''}`}
                title={collapsed ? label : undefined}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                {!collapsed && label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* User + actions */}
      <div className="border-t border-[#e0d8cc] p-2 space-y-0.5">
        {userName && (
          <div className={`flex items-center gap-2.5 px-2.5 py-2 ${collapsed ? 'justify-center' : ''}`}>
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 shadow-sm"
              style={{ backgroundColor: userColor }}
            >
              {userName.charAt(0).toUpperCase()}
            </span>
            {!collapsed && (
              <span className="text-xs font-semibold text-[#4a3d32] flex-1 truncate">{userName.split(' ')[0]}</span>
            )}
          </div>
        )}
        <button
          onClick={openOnboarding}
          className={`flex items-center gap-2.5 w-full rounded-xl px-2.5 py-2 text-xs text-[#9c8b75] hover:bg-[#f0e9de]/70 hover:text-[#1a1614] transition-colors ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'Help' : undefined}
        >
          <HelpCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {!collapsed && <span>Help</span>}
        </button>
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
          className={`flex items-center gap-2 w-full rounded-xl px-2.5 py-2 text-xs text-[#9c8b75] hover:bg-[#f0e9de]/70 transition-colors ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>Collapse</span></>}
        </button>
      </div>
    </aside>
  )
}
