'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RealtimeProvider } from '@/components/RealtimeProvider'
import { CalendarGrid } from '@/components/CalendarGrid'
import { NavBar } from '@/components/NavBar'

export default function CalendarPage() {
  const router = useRouter()

  useEffect(() => {
    if (!localStorage.getItem('currentPersonId')) {
      router.replace('/')
    }
  }, [router])

  return (
    <RealtimeProvider>
      <div className="flex flex-col h-screen">
        <NavBar />
        <div className="flex-1 overflow-hidden">
          <CalendarGrid />
        </div>
      </div>
    </RealtimeProvider>
  )
}
