'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export function NavBar() {
  const pathname = usePathname()
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [userColor, setUserColor] = useState('#6366f1')

  useEffect(() => {
    setUserName(localStorage.getItem('currentPersonName') ?? '')
  }, [])

  useEffect(() => {
    async function loadColor() {
      const id = localStorage.getItem('currentPersonId')
      if (!id) return
      const { supabase } = await import('@/lib/supabase')
      const { data } = await supabase.from('people').select('color').eq('id', id).single()
      if (data) setUserColor(data.color)
    }
    loadColor()
  }, [])

  function handleLogout() {
    localStorage.removeItem('currentPersonId')
    localStorage.removeItem('currentPersonName')
    router.push('/')
  }

  return (
    <nav className="bg-white border-b border-gray-100 px-4 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-1">
        <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center mr-2 flex-shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </div>
        <Link
          href="/calendar"
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            pathname === '/calendar' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Calendar
        </Link>
        <Link
          href="/people"
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            pathname === '/people' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          People
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/events/new"
          className="bg-indigo-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + Event
        </Link>
        {userName && (
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full hover:bg-gray-100 transition-colors"
            title="Switch user"
          >
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: userColor }}
            >
              {userName.charAt(0).toUpperCase()}
            </span>
            <span className="text-xs text-gray-500 hidden sm:block">{userName.split(' ')[0]}</span>
          </button>
        )}
      </div>
    </nav>
  )
}
