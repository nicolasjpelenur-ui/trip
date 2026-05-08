'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns'

import {
  BarChart2,
  CalendarDays,
  ChevronRight,
  Clock,
  Map,
  MessageSquare,
  Plus,
  Cake,
  UserPlus,
  X,
} from 'lucide-react'
import { NavBar } from '@/components/NavBar'
import { RealtimeProvider, useTripContext } from '@/components/RealtimeProvider'
import { EventSummaryCard } from '@/components/EventSummaryCard'
import { PersonAvatar } from '@/components/PersonChip'
import { GroupWithMembers, getGroupWithMembers, getGroups, getMessages } from '@/lib/chatQueries'
import { getAllEvents, getPeople, upsertEventParticipant, logActivity } from '@/lib/queries'
import { EventWithDetails, ItineraryDayWithItems, Person } from '@/lib/supabase'
import { getPollsForEvent, getPollsForGroup, Poll } from '@/lib/pollQueries'
import { getEventItinerary } from '@/lib/itineraryQueries'
import { canEditEvent, canSeeEvent, eventCountdownLabel, isUpcoming, today } from '@/lib/eventUtils'
import { ageOnNextBirthday, daysUntilBirthday } from '@/lib/birthdayUtils'
import { useToast } from '@/components/Toast'
import { useT } from '@/lib/i18n'

type ChatPreview = {
  group: GroupWithMembers
  lastMessage: string
  lastMessageAt: string
  unread: boolean
}

type PendingPoll = {
  poll: Poll
  sourceTitle: string
  href: string
}

function MiniCalendar({ events }: { events: EventWithDetails[] }) {
  const month = startOfMonth(new Date())
  const days: Date[] = []
  let cursor = startOfWeek(month)
  const finalDay = endOfWeek(endOfMonth(month))

  while (cursor <= finalDay) {
    days.push(cursor)
    cursor = addDays(cursor, 1)
  }

  return (
    <div className="bg-white border border-[#ede8e0] rounded-xl p-3" style={{ boxShadow: '0 1px 4px rgba(100,60,10,0.07)' }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-[#1a1614]">This month</h2>
          <p className="text-xs text-[#9c8b75]">{format(month, 'MMMM yyyy')}</p>
        </div>
        <Link href="/calendar" className="text-xs font-medium text-[#5b4cf5] hover:underline">Open calendar</Link>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((item, index) => (
          <div key={`${item}-${index}`} className="text-[10px] font-semibold text-[#9c8b75] py-1">{item}</div>
        ))}
        {days.map((day) => {
          const dayEvents = events.filter((event) =>
            isWithinInterval(day, { start: parseISO(event.start_date), end: parseISO(event.end_date) })
          )
          return (
            <Link
              key={day.toISOString()}
              href="/calendar"
              className={`min-h-11 rounded-lg border text-xs flex flex-col items-center justify-center transition-all active:scale-95 ${
                isToday(day)
                  ? 'border-[#5b4cf5] bg-[#5b4cf5]/10 text-[#5b4cf5]'
                  : isSameMonth(day, month)
                    ? 'border-[#ede8e0] text-[#1a1614] hover:bg-[#f3efe8] hover:border-[#5b4cf5]/20'
                    : 'border-transparent text-[#c9b99f]'
              }`}
            >
              <span className="font-semibold">{format(day, 'd')}</span>
              {dayEvents.length > 0 && (
                <span className="mt-1 flex gap-0.5">
                  {dayEvents.slice(0, 3).map((event) => (
                    <span
                      key={event.id}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: event.participants[0]?.person.color ?? '#5b4cf5' }}
                    />
                  ))}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function ItineraryWidget({ nextEvent, nextItinerary }: { nextEvent: EventWithDetails | undefined; nextItinerary: ItineraryDayWithItems[] }) {
  if (!nextEvent) {
    return <p className="text-sm text-[#9c8b75] py-3">Create an event to start planning your days.</p>
  }
  const t = today()
  const todayStr = format(t, 'yyyy-MM-dd')
  const todayDay = nextItinerary.find((d) => d.day_date === todayStr)
  const displayDay = todayDay ?? nextItinerary.find((d) => d.items.length > 0)
  const totalDays = nextItinerary.length
  const daysIn = differenceInCalendarDays(t, parseISO(nextEvent.start_date))
  const eventInProgress = daysIn >= 0 && differenceInCalendarDays(parseISO(nextEvent.end_date), t) >= 0

  return (
    <>
      <p className="text-xs text-[#9c8b75] mb-2 truncate">
        {nextEvent.title} · {totalDays} day{totalDays !== 1 ? 's' : ''}
        {eventInProgress && <span className="ml-1 text-[#5b4cf5] font-medium">· Day {daysIn + 1}</span>}
      </p>
      {displayDay ? (
        <div className="space-y-1.5 mb-3">
          <p className="text-[11px] font-semibold text-[#9c8b75] uppercase tracking-wide">
            {eventInProgress && todayDay ? 'Today' : format(parseISO(displayDay.day_date), 'EEE, MMM d')}
          </p>
          {displayDay.items.slice(0, 3).map((item) => (
            <div key={item.id} className="flex items-start gap-2 rounded-lg bg-[#f3efe8] px-2.5 py-1.5">
              {item.start_time && (
                <span className="text-[10px] text-[#9c8b75] font-medium mt-0.5 w-10 flex-shrink-0">
                  {item.start_time.slice(0, 5)}
                </span>
              )}
              <span className="text-xs text-[#1a1614] font-medium truncate">{item.title}</span>
              {item.place_name && (
                <span className="text-[10px] text-[#9c8b75] truncate ml-auto flex-shrink-0">{item.place_name}</span>
              )}
            </div>
          ))}
          {displayDay.items.length === 0 && (
            <p className="text-xs text-[#9c8b75]">Nothing planned for this day yet.</p>
          )}
        </div>
      ) : (
        <p className="text-xs text-[#9c8b75] mb-3">No itinerary items yet — open the event to start planning.</p>
      )}
      <Link href={`/events/${nextEvent.id}`} className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#5b4cf5] text-white text-sm font-medium py-2 hover:bg-[#4a3dd4]">
        Open itinerary
        <ChevronRight className="w-4 h-4" />
      </Link>
    </>
  )
}

function BirthdayBanner({ people }: { people: Person[] }) {
  const { t: dt } = useT()
  const upcoming = people
    .map((p) => ({ p, days: daysUntilBirthday(p) }))
    .filter((x): x is { p: Person; days: number } => x.days !== null && x.days <= 7)
    .sort((a, b) => a.days - b.days)
  const next = upcoming[0]
  const dismissKey = next ? `bday_dismissed_${next.p.id}_${new Date().getFullYear()}` : ''
  const [dismissed, setDismissed] = useState(() =>
    typeof window !== 'undefined' && dismissKey ? Boolean(localStorage.getItem(dismissKey)) : false
  )

  // Confetti burst when someone has a birthday today (once per day per browser)
  useEffect(() => {
    if (!next || next.days !== 0) return
    const flagKey = `bday_celebrated_${next.p.id}_${new Date().toISOString().slice(0, 10)}`
    if (typeof window === 'undefined' || localStorage.getItem(flagKey)) return
    localStorage.setItem(flagKey, '1')
    void import('canvas-confetti').then(({ default: confetti }) => {
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.18 },
        colors: ['#5b4cf5', '#e8724a', '#10b981', '#f59e0b', '#ec4899'],
        scalar: 0.9,
      })
    })
  }, [next])

  if (!next || dismissed) return null
  const age = ageOnNextBirthday(next.p)
  const firstName = next.p.name.split(' ')[0]
  const headline =
    next.days === 0 ? dt('birthday.today',    { name: firstName })
    : next.days === 1 ? dt('birthday.tomorrow', { name: firstName })
    : dt('birthday.inDays', { name: firstName, days: next.days })
  const ageSuffix =
    age != null && next.days === 0 ? ` (${age})`
    : age != null ? ' — ' + dt('birthday.willBe', { age })
    : ''
  return (
    <div className="relative rounded-2xl bg-gradient-to-r from-[#fdf0ea] to-[#fdf6f0] border border-[#e8724a]/25 px-4 sm:px-5 py-3.5 flex items-center gap-3 sm:gap-3.5">
      <div className="w-9 h-9 rounded-xl bg-[#e8724a]/15 flex items-center justify-center flex-shrink-0">
        <Cake className="w-4.5 h-4.5 text-[#e8724a]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-[#1a1614] truncate">
          {headline}{ageSuffix}
        </p>
        <p className="text-xs text-[#9c8b75] mt-0.5 line-clamp-2">
          {next.days === 0 ? dt('birthday.todayNudge') : dt('birthday.nudge')}
        </p>
      </div>
      <button
        onClick={() => { localStorage.setItem(dismissKey, '1'); setDismissed(true) }}
        className="text-[#9c8b75] hover:text-[#1a1614] flex-shrink-0"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

function CountdownBanner({ event }: { event: EventWithDetails }) {
  const dismissKey = `countdown_dismissed_${event.id}`
  const [dismissed, setDismissed] = useState(() =>
    typeof window !== 'undefined' ? Boolean(localStorage.getItem(dismissKey)) : false
  )
  if (dismissed) return null
  const days = differenceInCalendarDays(parseISO(event.start_date), new Date())
  const label = days === 0 ? 'starts today!' : `starts in ${days} day${days === 1 ? '' : 's'}!`
  return (
    <div className="relative rounded-2xl bg-gradient-to-r from-[#5b4cf5] to-[#7c6cf7] text-white px-4 sm:px-5 py-3.5 sm:py-4 flex items-center gap-3 sm:gap-4">
      <span className="inline-flex rounded-full h-2.5 w-2.5 bg-white/80 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{event.title} {label}</p>
        <p className="text-xs text-white/70 mt-0.5 truncate">{format(parseISO(event.start_date), 'EEEE, MMM d')} · {event.location.name}</p>
      </div>
      <Link href={`/events/${event.id}`} className="flex-shrink-0 text-xs font-medium bg-white/20 hover:bg-white/30 rounded-xl px-2.5 sm:px-3 py-1.5 transition-colors">
        →
      </Link>
      <button
        onClick={() => { localStorage.setItem(dismissKey, '1'); setDismissed(true) }}
        className="text-white/60 hover:text-white flex-shrink-0"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

function DashboardContent() {
  const router = useRouter()
  const toast = useToast()
  const { t: dt } = useT()
  const { onlinePersonIds, people: allPeople } = useTripContext()
  const [currentPerson, setCurrentPerson] = useState<Person | null>(null)
  const [events, setEvents] = useState<EventWithDetails[]>([])
  const [chatPreviews, setChatPreviews] = useState<ChatPreview[]>([])
  const [pendingPolls, setPendingPolls] = useState<PendingPoll[]>([])
  const [nextItinerary, setNextItinerary] = useState<ItineraryDayWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set())

  async function handleQuickJoin(event: EventWithDetails) {
    if (!currentPerson) return
    setJoinedIds((prev) => new Set([...prev, event.id]))
    try {
      await upsertEventParticipant(event.id, currentPerson.id, {
        staying_at_apartment: false, arrival_date: null, departure_date: null,
      })
      logActivity(currentPerson.id, 'joined_event', event.title, 'event', event.id)
      toast.show(`Joined ${event.title}`)
    } catch {
      setJoinedIds((prev) => { const s = new Set(prev); s.delete(event.id); return s })
      toast.show('Could not join. Try again.', 'error')
    }
  }

  useEffect(() => {
    let cancelled = false

    async function loadDashboard() {
      const personId = localStorage.getItem('currentPersonId')
      if (!personId) {
        router.replace('/')
        return
      }

      const [people, allEvents, rawGroups] = await Promise.all([getPeople(), getAllEvents(), getGroups()])
      if (cancelled) return

      const person = people.find((item) => item.id === personId) ?? null
      if (!person) {
        localStorage.removeItem('currentPersonId')
        localStorage.removeItem('currentPersonName')
        router.replace('/')
        return
      }

      const visibleEvents = allEvents
        .filter((event) => canSeeEvent(event, personId))
        .sort((a, b) => parseISO(a.start_date).getTime() - parseISO(b.start_date).getTime())

      const myGroups = (await Promise.all(rawGroups.map((group) => getGroupWithMembers(group.id))))
        .filter((group) => !group.is_private || group.members.some((member) => member.id === personId))
        .filter((group) => group.members.some((member) => member.id === personId))

      const seenKey = `lastSeenAt_${personId}`
      const seen: Record<string, string> = JSON.parse(localStorage.getItem(seenKey) || '{}')
      const previews = await Promise.all(myGroups.map(async (group) => {
        const messages = await getMessages(group.id, 20)
        const last = messages[messages.length - 1]
        return {
          group,
          lastMessage: last?.content ?? 'No messages yet',
          lastMessageAt: last?.created_at ?? group.created_at,
          unread: Boolean(last && seen[group.id] && last.created_at > seen[group.id]),
        }
      }))

      const eventPollEntries = await Promise.all(
        visibleEvents.filter((event) => canEditEvent(event, personId)).map(async (event) => ({
          title: event.title,
          href: '/calendar',
          polls: await getPollsForEvent(event.id),
        }))
      )
      const groupPollEntries = await Promise.all(
        myGroups.map(async (group) => ({
          title: group.is_dm
            ? group.members.find((member) => member.id !== personId)?.name ?? 'Direct message'
            : group.name,
          href: `/chat/${group.id}`,
          polls: await getPollsForGroup(group.id),
        }))
      )

      const polls = [...eventPollEntries, ...groupPollEntries].flatMap((entry) =>
        entry.polls
          .filter((poll) => !poll.votes.some((vote) => vote.person_id === personId))
          .map((poll) => ({ poll, sourceTitle: entry.title, href: entry.href }))
      )

      // Load itinerary for the next upcoming event
      const upcomingEvents = visibleEvents.filter(isUpcoming)
      let itinerary: ItineraryDayWithItems[] = []
      if (upcomingEvents.length > 0) {
        try { itinerary = await getEventItinerary(upcomingEvents[0]) } catch { /* noop */ }
      }

      if (cancelled) return
      setCurrentPerson(person)
      setEvents(visibleEvents)
      setChatPreviews(previews.sort((a, b) => Number(b.unread) - Number(a.unread) || b.lastMessageAt.localeCompare(a.lastMessageAt)))
      setPendingPolls(polls.slice(0, 4))
      setNextItinerary(itinerary)
      setLoading(false)
    }

    queueMicrotask(() => { void loadDashboard() })

    return () => { cancelled = true }
  }, [router])

  const t = today()
  const nextEvent = events.filter(isUpcoming)[0]
  const monthEvents = events.filter((e) => parseISO(e.start_date) <= endOfMonth(t) && parseISO(e.end_date) >= startOfMonth(t))
  const onlineOthers = allPeople.filter((p) => onlinePersonIds.has(p.id) && p.id !== currentPerson?.id)
  const bannerEvent = currentPerson
    ? events
        .filter(isUpcoming)
        .filter((e) => e.participants.some((p) => p.person_id === currentPerson.id))
        .find((e) => {
          const d = differenceInCalendarDays(parseISO(e.start_date), new Date())
          return d >= 0 && d <= 7
        }) ?? null
    : null

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div className="skeleton h-10 w-52 rounded-xl" />
        <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
          <div className="skeleton h-64 rounded-xl" />
          <div className="skeleton h-64 rounded-xl" />
        </div>
      </div>
    )
  }

  if (!currentPerson) return null

  return (
    <main className="max-w-5xl mx-auto px-3 sm:px-4 py-5 sm:py-6 space-y-4 sm:space-y-5">
      {bannerEvent && <CountdownBanner event={bannerEvent} />}
      <BirthdayBanner people={allPeople} />

      {onlineOthers.length > 0 && (
        <div className="flex items-center gap-2.5 px-1 flex-wrap">
          <span className="inline-flex rounded-full h-2 w-2 bg-green-400 flex-shrink-0" />
          <span className="text-xs text-[#9c8b75] font-medium">{dt('dashboard.onlineNow')}</span>
          <div className="flex items-center gap-1 flex-wrap">
            {onlineOthers.slice(0, 8).map((p) => (
              <div key={p.id} className="relative" title={p.name}>
                <PersonAvatar person={p} size="sm" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-400 border-2 border-white" />
              </div>
            ))}
            {onlineOthers.length > 8 && <span className="text-[10px] text-[#9c8b75]">+{onlineOthers.length - 8}</span>}
          </div>
        </div>
      )}

      <section className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <PersonAvatar person={currentPerson} size="lg" />
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-[#1a1614] leading-tight truncate">
              {dt('dashboard.yourTrips', { name: currentPerson.name.split(' ')[0] })}
            </h1>
            <p className="text-sm text-[#9c8b75] mt-0.5 truncate">
              {currentPerson.status || format(t, 'EEEE, MMMM d')}
            </p>
          </div>
        </div>
        {/* Quick actions — hidden on mobile, since the bottom tab bar +
            floating "+" button already provide Calendar / New event / Chat. */}
        <div className="hidden md:flex flex-wrap gap-2 flex-shrink-0">
          <Link href="/calendar" className="inline-flex items-center gap-1.5 rounded-xl bg-[#5b4cf5] text-white px-3 py-2 text-sm font-medium hover:bg-[#4a3dd4] active:scale-[0.97] transition-all">
            <CalendarDays className="w-4 h-4" />
            {dt('nav.calendar')}
          </Link>
          <Link href="/events/new" className="inline-flex items-center gap-1.5 rounded-xl border border-[#ede8e0] bg-white text-[#1a1614] px-3 py-2 text-sm font-medium hover:bg-[#f3efe8] active:scale-[0.97] transition-all">
            <Plus className="w-4 h-4" />
            {dt('nav.newEvent')}
          </Link>
          <Link href="/chat" className="inline-flex items-center gap-1.5 rounded-xl border border-[#ede8e0] bg-white text-[#1a1614] px-3 py-2 text-sm font-medium hover:bg-[#f3efe8] active:scale-[0.97] transition-all">
            <MessageSquare className="w-4 h-4" />
            {dt('nav.chat')}
          </Link>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-4">
          {nextEvent ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-[#1a1614]">{dt('dashboard.nextUp')}</h2>
                <span className="inline-flex items-center gap-1 text-xs text-[#9c8b75]">
                  <Clock className="w-3.5 h-3.5" />
                  {eventCountdownLabel(nextEvent)}
                </span>
              </div>
              <EventSummaryCard event={nextEvent} showCountdown href={`/events/${nextEvent.id}`} />
            </div>
          ) : (
            <div className="bg-white border border-[#ede8e0] rounded-xl p-5 text-center" style={{ boxShadow: '0 1px 4px rgba(100,60,10,0.07)' }}>
              <CalendarDays className="w-8 h-8 text-[#c9b99f] mx-auto mb-2" />
              <h2 className="text-sm font-semibold text-[#1a1614]">{dt('dashboard.noUpcoming')}</h2>
              <p className="text-xs text-[#9c8b75] mt-1">{dt('dashboard.noUpcomingHint')}</p>
              <Link href="/events/new" className="inline-flex mt-3 text-xs font-medium text-[#5b4cf5] hover:underline">{dt('dashboard.createEvent')}</Link>
            </div>
          )}

          <div className="bg-white border border-[#ede8e0] rounded-xl p-4" style={{ boxShadow: '0 1px 4px rgba(100,60,10,0.07)' }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[#1a1614]">{dt('dashboard.upcomingMonth')}</h2>
              <Link href="/calendar" className="text-xs text-[#5b4cf5] font-medium hover:underline">{dt('dashboard.viewAll')}</Link>
            </div>
            {monthEvents.length === 0 ? (
              <p className="text-sm text-[#9c8b75] py-4">{dt('dashboard.nothingScheduled')}</p>
            ) : (
              <div className="space-y-2">
                {monthEvents.slice(0, 4).map((event) => {
                  const isParticipant = event.participants.some((p) => p.person_id === currentPerson?.id)
                    || joinedIds.has(event.id)
                  return (
                    <div key={event.id} className="relative">
                      <EventSummaryCard event={event} compact href={`/events/${event.id}`} />
                      {!isParticipant && (
                        <button
                          onClick={(e) => { e.preventDefault(); void handleQuickJoin(event) }}
                          className="absolute bottom-2.5 right-2.5 z-10 inline-flex items-center gap-1 text-[10px] font-semibold text-white bg-[#5b4cf5] px-2 py-1 rounded-full hover:bg-[#4a3dd4] transition-all active:scale-95"
                        >
                          <UserPlus className="w-2.5 h-2.5" /> {dt('dashboard.join')}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <MiniCalendar events={monthEvents} />
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <div className="bg-white border border-[#ede8e0] rounded-xl p-4" style={{ boxShadow: '0 1px 4px rgba(100,60,10,0.07)' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#1a1614]">{dt('dashboard.chats')}</h2>
            <Link href="/chat" className="text-xs text-[#5b4cf5] font-medium hover:underline">{dt('dashboard.openChat')}</Link>
          </div>
          {chatPreviews.length === 0 ? (
            <p className="text-sm text-[#9c8b75] py-4">{dt('dashboard.noChatGroups')}</p>
          ) : (
            <div className="space-y-2">
              {chatPreviews.slice(0, 4).map((preview) => (
                <Link key={preview.group.id} href={`/chat/${preview.group.id}`} className="flex items-center gap-3 rounded-xl border border-[#ede8e0] px-3 py-2 hover:bg-[#f3efe8] hover:border-[#5b4cf5]/20 transition-all active:scale-[0.98]">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${preview.group.color}1f` }}>
                    <MessageSquare className="w-4 h-4" style={{ color: preview.group.color }} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#1a1614] truncate">{preview.group.is_dm ? preview.group.members.find((member) => member.id !== currentPerson.id)?.name ?? 'Direct message' : preview.group.name}</span>
                      {preview.unread && <span className="w-2 h-2 rounded-full bg-[#e8724a] flex-shrink-0" />}
                    </span>
                    <span className="block text-xs text-[#9c8b75] truncate">{preview.lastMessage}</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-[#c9b99f]" />
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-[#ede8e0] rounded-xl p-4" style={{ boxShadow: '0 1px 4px rgba(100,60,10,0.07)' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#1a1614]">{dt('dashboard.pendingPolls')}</h2>
            <BarChart2 className="w-4 h-4 text-[#5b4cf5]" />
          </div>
          {pendingPolls.length === 0 ? (
            <p className="text-sm text-[#9c8b75] py-4">{dt('dashboard.noPolls')}</p>
          ) : (
            <div className="space-y-2">
              {pendingPolls.map(({ poll, sourceTitle, href }) => (
                <Link key={poll.id} href={href} className="block rounded-xl border border-[#ede8e0] px-3 py-2 hover:bg-[#f3efe8] hover:border-[#5b4cf5]/20 transition-all active:scale-[0.98]">
                  <p className="text-sm font-medium text-[#1a1614] line-clamp-2">{poll.question}</p>
                  <p className="text-xs text-[#9c8b75] mt-1">{sourceTitle} · {poll.options.length} options</p>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-[#ede8e0] rounded-xl p-4" style={{ boxShadow: '0 1px 4px rgba(100,60,10,0.07)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-[#fdf0ea] flex items-center justify-center">
                <Map className="w-4 h-4 text-[#e8724a]" />
              </span>
              <h2 className="text-sm font-semibold text-[#1a1614]">{dt('nav.itinerary')}</h2>
            </div>
            <Link href="/itinerary" className="text-xs text-[#5b4cf5] font-medium hover:underline">{dt('dashboard.viewAll')}</Link>
          </div>
          <ItineraryWidget nextEvent={nextEvent} nextItinerary={nextItinerary} />
        </div>
      </section>
    </main>
  )
}

export default function DashboardPage() {
  return (
    <RealtimeProvider>
      <div className="flex flex-col min-h-screen bg-[#faf7f2]">
        <NavBar />
        <DashboardContent />
      </div>
    </RealtimeProvider>
  )
}
