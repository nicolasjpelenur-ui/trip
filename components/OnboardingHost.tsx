'use client'

import { useEffect, useRef, useState, ComponentType } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Check, ChevronLeft, ChevronRight, Lightbulb, Plus, Sparkles,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Person } from '@/lib/supabase'
import { completePersonOnboarding, getPeople } from '@/lib/queries'
import {
  DemoCalendar, DemoChat, DemoDashboard, DemoEvents,
  DemoItinerary, DemoPolls, DemoWelcome,
} from '@/components/OnboardingDemos'

const ONBOARDING_OPEN_EVENT = 'trip:onboarding-open'

export function openOnboarding() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(ONBOARDING_OPEN_EVENT))
  }
}

interface Slide {
  key: string
  title: string
  body: string
  tip?: string
  Demo: ComponentType
}

const slides: Slide[] = [
  {
    key: 'Welcome',
    title: 'Welcome',
    body: 'A quiet, shared space for your circle. Plan trips together, see who is where, and stay close between visits.',
    tip: 'This guide takes about a minute.',
    Demo: DemoWelcome,
  },
  {
    key: 'Dashboard',
    title: 'Your home screen',
    body: 'Open the app here. You will see the next trip, days until it starts, latest messages, and any votes waiting on you.',
    tip: 'A daily summary at a glance.',
    Demo: DemoDashboard,
  },
  {
    key: 'Calendar',
    title: 'The calendar',
    body: 'See everyone\'s trips on one calendar. To create a multi-day event, drag across the days you want — tapping just one day makes a one-day event.',
    tip: 'Drag across days for a longer trip.',
    Demo: DemoCalendar,
  },
  {
    key: 'Events',
    title: 'Trip events',
    body: 'Each trip is an event. Add who is joining, who is sleeping at the apartment, and notes. Each person can join for the full stay or just their dates.',
    tip: 'Open an event to see its full itinerary.',
    Demo: DemoEvents,
  },
  {
    key: 'Itinerary',
    title: 'Day-by-day itinerary',
    body: 'Inside each event, plan each day: a restaurant, a flight, a museum, anywhere. Add a time, a place, and an address.',
    tip: 'Tap Itinerary in the menu to see all your plans.',
    Demo: DemoItinerary,
  },
  {
    key: 'Chat',
    title: 'Group chat & messages',
    body: 'Talk to the whole group, or send a private message. Tap and hold a message to react.',
    tip: 'A small orange dot means there are unread messages.',
    Demo: DemoChat,
  },
  {
    key: 'Polls',
    title: 'Quick votes',
    body: 'Cannot agree on a dinner spot or travel date? Create a poll. Results update in real time.',
    tip: 'Pending polls show up on your Dashboard.',
    Demo: DemoPolls,
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
  // Footer pill row — auto-scroll active pill into view
  const footerRef = useRef<HTMLDivElement | null>(null)

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
        // Mark seen immediately so dismissing without "Got it" still counts as seen
        try {
          const completedAt = await completePersonOnboarding(currentPerson.id)
          if (!cancelled) setPerson({ ...currentPerson, onboarding_completed_at: completedAt })
        } catch { /* non-fatal */ }
      }
    }
    queueMicrotask(loadPerson)
    return () => { cancelled = true }
  }, [pathname])

  // Scroll active footer pill into view whenever the slide changes
  useEffect(() => {
    if (!open) return
    const node = footerRef.current?.querySelector<HTMLElement>(`[data-pill-index="${index}"]`)
    node?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [index, open])

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
  const Demo = slide.Demo
  const isLast = index === slides.length - 1
  const displayTitle = slide.key === 'Welcome' && person
    ? `Welcome, ${person.name.split(' ')[0]}`
    : slide.title

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm border-[#e8e0d5] p-0 overflow-hidden" style={{ backgroundColor: '#faf7f2' }}>
        <div className="p-6 pb-5">
          <DialogHeader>
            <DialogTitle className="sr-only">Trip Coordinator guide</DialogTitle>
          </DialogHeader>

          {/* Progress dots */}
          <div className="flex items-center justify-between mb-5">
            <span className="text-xs font-medium text-[#9c8b75]">Step {index + 1} of {slides.length}</span>
            <div className="flex gap-1.5">
              {slides.map((item, i) => (
                <button
                  key={item.key}
                  onClick={() => setIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${i === index ? 'w-6 bg-[#5b4cf5]' : 'w-1.5 bg-[#d8cfc3] hover:bg-[#b0a490]'}`}
                  aria-label={`Go to ${item.key}`}
                />
              ))}
            </div>
          </div>

          {/* Slide content — keyed on index so demo + content remount and animate fresh */}
          <div key={index} className="slide-content-enter">
            <Demo />
            <div className="mt-5 text-center">
              <h2 className="text-xl font-bold text-[#1a1614] leading-snug">{displayTitle}</h2>
              <p className="text-sm text-[#6b5d4f] mt-2.5 leading-relaxed max-w-xs mx-auto">{slide.body}</p>
              {slide.tip && (
                <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#5b4cf5] bg-[#5b4cf5]/10 border border-[#5b4cf5]/20 rounded-xl px-3 py-1.5 font-medium">
                  <Lightbulb className="w-3.5 h-3.5" />
                  {slide.tip}
                </p>
              )}
              {isLast && (
                <div className="mt-4 flex flex-col items-center gap-2.5">
                  <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1a1614]">
                    <Sparkles className="w-4 h-4 text-[#e8724a]" />
                    You are all set
                  </p>
                  <Link
                    href="/events/new"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[#e8724a] px-4 py-2 rounded-xl hover:bg-[#d4663f] transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Create your first event
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Prev / Next buttons */}
          <div className="flex items-center justify-between mt-5">
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
                {saving ? 'Saving…' : manual ? 'Close guide' : 'Got it'}
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

        {/* Footer keyword tabs — auto-scrolls so the active pill stays centered */}
        <div
          ref={footerRef}
          className="border-t border-[#e8e0d5] bg-white px-4 py-2.5 flex items-center gap-1 overflow-x-auto scroll-smooth"
        >
          {slides.map((item, i) => (
            <button
              key={item.key}
              data-pill-index={i}
              onClick={() => setIndex(i)}
              className={`flex-shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full transition-all ${
                i === index
                  ? 'bg-[#5b4cf5] text-white scale-105'
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
