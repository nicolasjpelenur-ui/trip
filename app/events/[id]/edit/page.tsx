'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { NavBar } from '@/components/NavBar'
import { EventForm } from '@/components/EventForm'
import { RealtimeProvider } from '@/components/RealtimeProvider'
import { EventWithDetails } from '@/lib/supabase'
import { getEvent } from '@/lib/queries'
import { ChevronLeft } from 'lucide-react'

function EditEventContent({ id }: { id: string }) {
  const router = useRouter()
  const [event, setEvent] = useState<EventWithDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    queueMicrotask(() => {
      getEvent(id).then((e) => { setEvent(e); setLoading(false) })
    })
  }, [id])

  if (loading) return <div className="text-center py-8 text-[#9c8b75]">Loading...</div>
  if (!event) return <div className="text-center py-8 text-[#9c8b75]">Event not found</div>

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => router.back()} className="text-[#9c8b75] hover:text-[#1a1614] transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-[#1a1614]">Edit event</h1>
      </div>
      <EventForm existing={event} onSuccess={() => router.push(`/events/${id}`)} />
    </div>
  )
}

export default function EditEventPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <RealtimeProvider>
      <div className="flex flex-col min-h-screen bg-[#faf7f2]">
        <NavBar />
        <EditEventContent id={id} />
      </div>
    </RealtimeProvider>
  )
}
