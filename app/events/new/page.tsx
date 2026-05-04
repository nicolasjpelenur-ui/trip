'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { NavBar } from '@/components/NavBar'
import { EventForm } from '@/components/EventForm'
import { RealtimeProvider } from '@/components/RealtimeProvider'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

function NewEventContent() {
  const params = useSearchParams()
  const date = params.get('date') ?? undefined
  const start = params.get('start') ?? date
  const end = params.get('end') ?? date

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/calendar" className="text-[#9c8b75] hover:text-[#1a1614] transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-[#1a1614]">New event</h1>
      </div>
      <EventForm defaultDate={start ?? undefined} defaultEndDate={end ?? undefined} />
    </div>
  )
}

export default function NewEventPage() {
  return (
    <RealtimeProvider>
      <div className="flex flex-col min-h-screen bg-[#faf8f5]">
        <NavBar />
        <Suspense fallback={<div className="text-center py-8 text-[#9c8b75]">Loading…</div>}>
          <NewEventContent />
        </Suspense>
      </div>
    </RealtimeProvider>
  )
}
