'use client'

import Link from 'next/link'
import { createElement } from 'react'
import { format, parseISO } from 'date-fns'
import { CalendarDays, ChevronRight, EyeOff, Home, MessageCircle, Users } from 'lucide-react'
import { EventWithDetails } from '@/lib/supabase'
import { getLocationColor, getLocationIcon } from '@/lib/locationIcons'
import { PersonAvatar } from './PersonChip'
import { eventCountdownLabel } from '@/lib/eventUtils'
import { WeatherChip } from './WeatherStrip'

interface EventSummaryCardProps {
  event: EventWithDetails
  compact?: boolean
  showCountdown?: boolean
  href?: string
}

export function EventSummaryCard({ event, compact = false, showCountdown = false, href }: EventSummaryCardProps) {
  const locationColor = getLocationColor(event.location.id)
  const range = `${format(parseISO(event.start_date), 'MMM d')} - ${format(parseISO(event.end_date), 'MMM d')}`
  const stayingCount = event.participants.filter((p) => p.staying_at_apartment).length
  const content = (
    <div
      className={`group bg-white border border-[#e8e0d5] rounded-xl overflow-hidden text-left transition-all duration-200 ${href ? 'hover:border-[#5b4cf5]/35 hover:-translate-y-0.5' : ''}`}
      style={{ boxShadow: href ? undefined : '0 1px 3px rgba(90,50,10,0.08), 0 4px 12px rgba(90,50,10,0.05)' }}
    >
      <div className="h-[3px]" style={{ backgroundColor: locationColor }} />
      <div className={compact ? 'p-3' : 'p-4'}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${locationColor}1f` }}>
                {createElement(getLocationIcon(event.location.emoji), {
                  className: 'w-3.5 h-3.5',
                  style: { color: locationColor },
                })}
              </span>
              <div className="min-w-0">
                <h3 className={`font-semibold text-[#1a1614] truncate ${compact ? 'text-sm' : 'text-base'}`}>{event.title}</h3>
                <p className="text-xs text-[#9c8b75] truncate">{event.location.name}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#9c8b75]">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#f3efe8] px-2 py-0.5">
                <CalendarDays className="w-3 h-3" />
                {range}
              </span>
              {showCountdown && (
                <span className="rounded-full bg-[#5b4cf5]/10 text-[#5b4cf5] px-2 py-0.5 font-medium">
                  {eventCountdownLabel(event)}
                </span>
              )}
              {showCountdown && <WeatherChip event={event} />}
            </div>
          </div>
        </div>

        {!compact && event.notes && (
          <p className="text-xs text-[#9c8b75] mt-3 line-clamp-2">{event.notes}</p>
        )}

        <div className="flex items-center justify-between gap-3 mt-3">
          <div className="flex items-center min-w-0">
            {event.participants.slice(0, 5).map((participant, index) => (
              <span key={participant.id} style={{ marginLeft: index > 0 ? -6 : 0, zIndex: 5 - index }}>
                <PersonAvatar person={participant.person} size="sm" />
              </span>
            ))}
            {event.participants.length > 5 && (
              <span className="text-[10px] text-[#9c8b75] ml-2">+{event.participants.length - 5}</span>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {event.visibility !== 'all' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#f3efe8] text-[#9c8b75] px-2 py-0.5 text-[10px] font-medium">
                <EyeOff className="w-3 h-3" />
                Private
              </span>
            )}
            {stayingCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#fdf0ea] text-[#e8724a] px-2 py-0.5 text-[10px] font-medium">
                <Home className="w-3 h-3" />
                {stayingCount}
              </span>
            )}
            {event.participants.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#f3efe8] text-[#9c8b75] px-2 py-0.5 text-[10px] font-medium">
                <Users className="w-3 h-3" />
                {event.participants.length}
              </span>
            )}
            {!compact && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#f3efe8] text-[#9c8b75] px-2 py-0.5 text-[10px] font-medium">
                <MessageCircle className="w-3 h-3" />
                Discuss
              </span>
            )}
            {href && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#5b4cf5]/10 text-[#5b4cf5] px-2 py-0.5 text-[10px] font-medium">
                Itinerary
                <ChevronRight className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  if (!href) return content

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  )
}
