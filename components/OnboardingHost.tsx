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
import { useT } from '@/lib/i18n'
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
  // Translation key root — slide title/body/tip are looked up at render time.
  // i18n keys live under `onboarding.<key>.{title,body,tip}` in messages/en.ts + es.ts
  i18n: string
  Demo: ComponentType
}

const slides: Slide[] = [
  { key: 'Welcome',   i18n: 'welcome',   Demo: DemoWelcome },
  { key: 'Dashboard', i18n: 'dashboard', Demo: DemoDashboard },
  { key: 'Calendar',  i18n: 'calendar',  Demo: DemoCalendar },
  { key: 'Events',    i18n: 'events',    Demo: DemoEvents },
  { key: 'Itinerary', i18n: 'itinerary', Demo: DemoItinerary },
  { key: 'Chat',      i18n: 'chat',      Demo: DemoChat },
  { key: 'Polls',     i18n: 'polls',     Demo: DemoPolls },
]

export function OnboardingHost() {
  const pathname = usePathname()
  const { t } = useT()
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
  const slideTitle = t(`onboarding.${slide.i18n}.title`)
  const slideBody  = t(`onboarding.${slide.i18n}.body`)
  const slideTip   = t(`onboarding.${slide.i18n}.tip`)
  const displayTitle = slide.key === 'Welcome' && person
    ? t('onboarding.welcome.titleNamed', { name: person.name.split(' ')[0] })
    : slideTitle

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm border-[#e8e0d5] p-0 overflow-hidden" style={{ backgroundColor: '#faf7f2' }}>
        <div className="p-6 pb-5">
          <DialogHeader>
            <DialogTitle className="sr-only">Trip Coordinator guide</DialogTitle>
          </DialogHeader>

          {/* Progress dots */}
          <div className="flex items-center justify-between mb-5">
            <span className="text-xs font-medium text-[#9c8b75]">{t('onboarding.step', { current: index + 1, total: slides.length })}</span>
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
              <p className="text-sm text-[#6b5d4f] mt-2.5 leading-relaxed max-w-xs mx-auto">{slideBody}</p>
              {slideTip && (
                <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#5b4cf5] bg-[#5b4cf5]/10 border border-[#5b4cf5]/20 rounded-xl px-3 py-1.5 font-medium">
                  <Lightbulb className="w-3.5 h-3.5" />
                  {slideTip}
                </p>
              )}
              {isLast && (
                <div className="mt-4 flex flex-col items-center gap-2.5">
                  <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1a1614]">
                    <Sparkles className="w-4 h-4 text-[#e8724a]" />
                    {t('onboarding.allSet')}
                  </p>
                  <Link
                    href="/events/new"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[#e8724a] px-4 py-2 rounded-xl hover:bg-[#d4663f] transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> {t('onboarding.createFirst')}
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
              {t('common.back')}
            </button>
            {isLast ? (
              <button
                onClick={finish}
                disabled={saving}
                className="inline-flex items-center gap-1.5 bg-[#5b4cf5] text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-[#4a3dd4] disabled:opacity-50 transition-colors"
              >
                <Check className="w-4 h-4" />
                {saving ? t('common.saving') : manual ? t('onboarding.closeGuide') : t('onboarding.gotIt')}
              </button>
            ) : (
              <button
                onClick={() => setIndex((v) => Math.min(slides.length - 1, v + 1))}
                className="inline-flex items-center gap-1.5 bg-[#5b4cf5] text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-[#4a3dd4] transition-colors"
              >
                {t('common.next')}
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
