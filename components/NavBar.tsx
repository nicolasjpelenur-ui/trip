'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getGroups, getMessages } from '@/lib/chatQueries'

export function NavBar() {
  const pathname = usePathname()
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [userColor, setUserColor] = useState('#5b4cf5')
  const [chatUnread, setChatUnread] = useState(false)

  useEffect(() => {
    setUserName(localStorage.getItem('currentPersonName') ?? '')
  }, [])

  useEffect(() => {
    async function loadColor() {
      const id = localStorage.getItem('currentPersonId')
      if (!id) return
      const { data } = await supabase.from('people').select('color').eq('id', id).single()
      if (data) setUserColor(data.color)
    }
    loadColor()
  }, [])

  useEffect(() => {
    async function checkUnread() {
      const seen: Record<string, string> = JSON.parse(localStorage.getItem('lastSeenAt') || '{}')
      const groups = await getGroups()
      for (const g of groups) {
        const msgs = await getMessages(g.id, 1)
        const last = msgs[0]
        if (last && (!seen[g.id] || last.created_at > seen[g.id])) {
          setChatUnread(true)
          return
        }
      }
      setChatUnread(false)
    }
    checkUnread()
  }, [pathname])

  const navLink = (href: string, label: string, badge?: boolean) => {
    const active = pathname === href || pathname.startsWith(href + '/')
    return (
      <div className="relative">
        <Link href={href}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            active ? 'bg-[#5b4cf5]/10 text-[#5b4cf5]' : 'text-[#9c8b75] hover:bg-[#f3efe8] hover:text-[#1a1614]'
          }`}>
          {label}
        </Link>
        {badge && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#e8724a] pointer-events-none" />
        )}
      </div>
    )
  }

  return (
    <nav className="md:hidden bg-white border-b border-[#ede8e0] px-4 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-1 flex-wrap">
        <div className="w-7 h-7 rounded-lg bg-[#5b4cf5] flex items-center justify-center mr-2 flex-shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </div>
        {navLink('/calendar', 'Calendar')}
        {navLink('/chat', 'Chat', chatUnread)}
        {navLink('/arc', 'Arc')}
        {navLink('/activity', 'Activity')}
        {navLink('/people', 'People')}
      </div>

      <div className="flex items-center gap-2">
        <Link href="/events/new"
          className="bg-[#5b4cf5] text-white text-sm font-medium px-3 py-1.5 rounded-xl hover:bg-[#4a3dd4] transition-colors whitespace-nowrap">
          + Event
        </Link>
        {userName && (
          <button
            onClick={() => {
              supabase.auth.signOut()
              localStorage.removeItem('currentPersonId')
              localStorage.removeItem('currentPersonName')
              router.push('/')
            }}
            className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full hover:bg-[#f3efe8] transition-colors"
            title="Switch user"
          >
            <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: userColor }}>
              {userName.charAt(0).toUpperCase()}
            </span>
            <span className="text-xs text-[#9c8b75] hidden sm:block">{userName.split(' ')[0]}</span>
          </button>
        )}
      </div>
    </nav>
  )
}
