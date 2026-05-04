'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

export function NavBar() {
  const pathname = usePathname()
  const router = useRouter()

  function handleLogout() {
    localStorage.removeItem('currentPersonId')
    localStorage.removeItem('currentPersonName')
    router.push('/')
  }

  return (
    <nav className="bg-white border-b border-gray-100 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-1">
        <span className="text-xl mr-2">🗺️</span>
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
          + Add event
        </Link>
        <button
          onClick={handleLogout}
          className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5"
        >
          Switch user
        </button>
      </div>
    </nav>
  )
}
