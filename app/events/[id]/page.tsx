'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { NavBar } from '@/components/NavBar'
import { EventForm } from '@/components/EventForm'
import { RealtimeProvider } from '@/components/RealtimeProvider'
import { EventWithDetails } from '@/lib/supabase'
import { getEvent } from '@/lib/queries'

function EditEventContent({ id }: { id: string }) {
  const [event, setEvent] = useState<EventWithDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getEvent(id).then((e) => { setEvent(e); setLoading(false) })
  }, [id])

  if (loading) return <div className="text-center py-8 text-gray-400">Loading...</div>
  if (!event) return <div className="text-center py-8 text-gray-400">Event not found</div>

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Edit event</h1>
      <EventForm existing={event} />
    </div>
  )
}

export default function EditEventPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <RealtimeProvider>
      <div className="flex flex-col min-h-screen">
        <NavBar />
        <EditEventContent id={id} />
      </div>
    </RealtimeProvider>
  )
}
