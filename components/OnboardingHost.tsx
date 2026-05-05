'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart2, CalendarDays, Check, ChevronLeft, ChevronRight,
  LayoutDashboard, Map, MessageSquare, Users,
} from 'lucide-react'
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
    key: 'Dashboard',
    title: 'Your Home Screen',
    body: 'Every time you open the app, start here. You\'ll see your next trip, how many days until it starts, your latest messages, and any votes waiting for your answer — all in one place.',
    tip: 'Think of it as your daily summary.',
    Icon: LayoutDashboard,
    href: '/dashboard',
  },
  {
    key: 'Calendar',
    title: 'The Calendar',
    body: 'See everyone\'s trips on one calendar. Tap any day to see what\'s planned. To add a new event, tap a day or drag across several days to select a date range.',
    tip: 'Color dots show who is going where.',
    Icon: CalendarDays,
    href: '/calendar',
  },
  {
    key: 'Events',
    title: 'Trip Events',
    body: 'Each trip or stay is an "event." You can add who is joining, who is sleeping at the apartment, leave notes, and control whether others can see it.',
    tip: 'Open an event to see its full itinerary.',
    Icon: Users,
    href: '/calendar',
  },
  {
    key: 'Itinerary',
    title: 'Day-by-Day Itinerary',
    body: 'Inside each event you\'ll find an itinerary — a list of activities planned for each day. Add a restaurant, a museum visit, a flight, or anything else with its time, place, and address.',
    tip: 'Tap "Itinerary" in the menu to see all your plans.',
    Icon: Map,
    href: '/itinerary',
  },
  {
    key: 'Chat',
    title: 'Group Chat & Messages',
    body: 'Chat with everyone at once in a group, or send a private message to just one person. Great for deciding on restaurants, sharing updates, or just staying in touch.',
    tip: 'A small orange dot means you have unread messages.',
    Icon: MessageSquare,
    href: '/chat',
  },
  {
    key: 'Polls',
    title: 'Quick Votes & Polls',
    body: 'Can\'t agree on a dinner spot or travel date? Create a poll and let everyone vote. Results update in real time so decisions get made quickly.',
    tip: 'Pending polls appear on your Dashboard.',
    Icon: BarChart2,
    href: '/chat',
  },
]

export function OnboardingHost() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [manual, setManual] = useState(false)
  const [index, setIndex] = useState(0)
  const [person, setPerson] = useState<Person | null>(null)
  const [saving, setSaving] = useState(false)
  // Prevent re-showing the auto-onboarding on every route change
  const hasAutoShown = useRef(false)

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
      if (!personId) { setPerson(null); setOpen(false); return }
      const people = await getPeople()
      if (cancelled) return
      const currentPerson = people.find((item) => item.id === personId) ?? null
      setPerson(currentPerson)
      // Only auto-show once per session — not on every page navigation
      if (currentPerson && !currentPerson.onboarding_completed_at && pathname !== '/' && !hasAutoShown.current) {
        hasAutoShown.current = true
        setManual(false)
        setIndex(0)
        setOpen(true)
      }
    }
    queueMicrotask(loadPerson)
    return () => { cancelled = true }
  }, [pathname])

  async function finish() {
    if (!person) { setOpen(false); return }
    if (manual || person.onboarding_completed_at) { setOpen(false); return }
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
        <div className="p-6">
          <DialogHeader>
            <DialogTitle className="sr-only">Trip Coordinator guide</DialogTitle>
          </DialogHeader>

          {/* Progress dots */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-xs font-medium text-[#9c8b75]">{index + 1} of {slides.length}</span>
            <div className="flex gap-1.5">
              {slides.map((item, i) => (
                <button
                  key={item.key}
                  onClick={() => setIndex(i)}
                  className={`h-2 rounded-full transition-all ${i === index ? 'w-6 bg-[#5b4cf5]' : 'w-2 bg-[#d8cfc3] hover:bg-[#b0a490]'}`}
                  aria-label={`Go to ${item.key}`}
                />
              ))}
            </div>
          </div>

          {/* Slide content */}
          <div className="min-h-[220px] flex flex-col items-center text-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-[#5b4cf5]/10 flex items-center justify-center mb-5">
              <Icon className="w-8 h-8 text-[#5b4cf5]" />
            </div>
            <h2 className="text-xl font-bold text-[#1a1614] leading-snug">{slide.title}</h2>
            <p className="text-sm text-[#6b5d4f] mt-3 leading-relaxed max-w-xs">{slide.body}</p>
            {slide.tip && (
              <p className="mt-3 text-xs text-[#9c8b75] bg-[#f3efe8] rounded-lg px-3 py-1.5 inline-block">
                💡 {slide.tip}
              </p>
            )}
            {isLast && (
              <Link href="/dashboard" className="text-xs text-[#5b4cf5] font-medium mt-4 hover:underline">
                Open dashboard →
              </Link>
            )}
          </div>

          {/* Prev / Next buttons */}
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => setIndex((v) => Math.max(0, v - 1))}
              disabled={index === 0}
              className="inline-flex items-center gap-1 text-sm text-[#9c8b75] disabled:opacity-30 px-2 py-1.5 rounded-lg hover:bg-[#f3efe8] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
            {isLast ? (
              <button
                onClick={finish}
                disabled={saving}
                className="inline-flex items-center gap-1.5 bg-[#5b4cf5] text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-[#4a3dd4] disabled:opacity-50 transition-colors"
              >
                <Check className="w-4 h-4" />
                {saving ? 'Saving…' : manual ? 'Close guide' : 'Got it!'}
              </button>
            ) : (
              <button
                onClick={() => setIndex((v) => Math.min(slides.length - 1, v + 1))}
                className="inline-flex items-center gap-1.5 bg-[#5b4cf5] text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-[#4a3dd4] transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Footer keyword tabs — jump to any section */}
        <div className="border-t border-[#ede8e0] bg-white px-4 py-2.5 flex items-center gap-1 overflow-x-auto">
          {slides.map((item, i) => (
            <button
              key={item.key}
              onClick={() => setIndex(i)}
              className={`flex-shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors ${
                i === index
                  ? 'bg-[#5b4cf5] text-white'
                  : 'text-[#9c8b75] hover:bg-[#f3efe8] hover:text-[#1a1614]'
              }`}
            >
              {item.key}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
