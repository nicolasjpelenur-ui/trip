'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart2, CalendarDays, Check, ChevronLeft, ChevronRight, LayoutDashboard, Map, MessageSquare, Users } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Person } from '@/lib/supabase'
import { completePersonOnboarding, getPeople } from '@/lib/queries'

const ONBOARDING_OPEN_EVENT = 'trip:onboarding-open'

export function openOnboarding() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(ONBOARDING_OPEN_EVENT))
  }
}

const slides = [
  {
    title: 'Start with Dashboard',
    body: 'See your next trip, countdown, unread chats, pending polls, and quick links before opening the full tools.',
    Icon: LayoutDashboard,
  },
  {
    title: 'Plan on Calendar',
    body: 'Scan the month, filter by person, create events from date ranges, and open detailed trip cards.',
    Icon: CalendarDays,
  },
  {
    title: 'Coordinate events',
    body: 'Track who is joining, who stays at the apartment, private visibility, notes, comments, and reactions.',
    Icon: Users,
  },
  {
    title: 'Use chats and polls',
    body: 'Keep group decisions and direct messages close to the trips they affect.',
    Icon: MessageSquare,
  },
  {
    title: 'Vote quickly',
    body: 'Polls help settle dinner times, dates, activities, and open questions without losing context.',
    Icon: BarChart2,
  },
  {
    title: 'Itineraries are next',
    body: 'A future planner will link to events so each trip can organize days, places, and city movement.',
    Icon: Map,
  },
]

export function OnboardingHost() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [manual, setManual] = useState(false)
  const [index, setIndex] = useState(0)
  const [person, setPerson] = useState<Person | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    function handleOpen() {
      setManual(true)
      setIndex(0)
      setOpen(true)
    }

    window.addEventListener(ONBOARDING_OPEN_EVENT, handleOpen)
    return () => window.removeEventListener(ONBOARDING_OPEN_EVENT, handleOpen)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadPerson() {
      const personId = localStorage.getItem('currentPersonId')
      if (!personId) {
        setPerson(null)
        setOpen(false)
        return
      }

      const people = await getPeople()
      if (cancelled) return

      const currentPerson = people.find((item) => item.id === personId) ?? null
      setPerson(currentPerson)

      if (currentPerson && !currentPerson.onboarding_completed_at && pathname !== '/') {
        setManual(false)
        setIndex(0)
        setOpen(true)
      }
    }

    queueMicrotask(loadPerson)

    return () => { cancelled = true }
  }, [pathname])

  async function finish() {
    if (!person) {
      setOpen(false)
      return
    }

    if (manual || person.onboarding_completed_at) {
      setOpen(false)
      return
    }

    setSaving(true)
    try {
      const completedAt = await completePersonOnboarding(person.id)
      setPerson({ ...person, onboarding_completed_at: completedAt })
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const slide = slides[index]
  const Icon = slide.Icon
  const isLast = index === slides.length - 1

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm border-[#ede8e0] p-0 overflow-hidden" style={{ backgroundColor: '#faf8f5' }}>
        <div className="p-5">
          <DialogHeader>
            <DialogTitle className="sr-only">Trip Coordinator guide</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-between mb-5">
            <span className="text-[11px] font-medium text-[#9c8b75]">Guide {index + 1} of {slides.length}</span>
            <div className="flex gap-1">
              {slides.map((item, itemIndex) => (
                <span
                  key={item.title}
                  className={`h-1.5 rounded-full transition-all ${itemIndex === index ? 'w-5 bg-[#5b4cf5]' : 'w-1.5 bg-[#d8cfc3]'}`}
                />
              ))}
            </div>
          </div>

          <div className="min-h-[210px] flex flex-col items-center text-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-[#5b4cf5]/10 flex items-center justify-center mb-4">
              <Icon className="w-7 h-7 text-[#5b4cf5]" />
            </div>
            <h2 className="text-lg font-bold text-[#1a1614]">{slide.title}</h2>
            <p className="text-sm text-[#9c8b75] mt-2 leading-relaxed">{slide.body}</p>
            {isLast && (
              <Link href="/dashboard" className="text-xs text-[#5b4cf5] font-medium mt-4 hover:underline">
                Open dashboard
              </Link>
            )}
          </div>

          <div className="flex items-center justify-between mt-5">
            <button
              onClick={() => setIndex((value) => Math.max(0, value - 1))}
              disabled={index === 0}
              className="inline-flex items-center gap-1 text-xs text-[#9c8b75] disabled:opacity-40 px-2 py-1.5"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Back
            </button>
            {isLast ? (
              <button
                onClick={finish}
                disabled={saving}
                className="inline-flex items-center gap-1.5 bg-[#5b4cf5] text-white text-xs font-medium px-4 py-2 rounded-xl hover:bg-[#4a3dd4] disabled:opacity-50 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                {saving ? 'Saving...' : manual ? 'Close guide' : 'Done'}
              </button>
            ) : (
              <button
                onClick={() => setIndex((value) => Math.min(slides.length - 1, value + 1))}
                className="inline-flex items-center gap-1.5 bg-[#5b4cf5] text-white text-xs font-medium px-4 py-2 rounded-xl hover:bg-[#4a3dd4] transition-colors"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
