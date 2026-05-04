'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { NavBar } from '@/components/NavBar'
import { EventForm } from '@/components/EventForm'
import { RealtimeProvider } from '@/components/RealtimeProvider'

function NewEventContent() {
  const params = useSearchParams()
  const date = params.get('date') ?? undefined

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900 mb-6">New event</h1>
      <EventForm defaultDate={date} />
    </div>
  )
}

export default function NewEventPage() {
  return (
    <RealtimeProvider>
      <div className="flex flex-col min-h-screen">
        <NavBar />
        <Suspense fallback={<div className="text-center py-8 text-gray-400">Loading...</div>}>
          <NewEventContent />
        </Suspense>
      </div>
    </RealtimeProvider>
  )
}
