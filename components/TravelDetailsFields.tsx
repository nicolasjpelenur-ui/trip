'use client'

import { Bus, Car, ChevronDown, ChevronUp, Plane, Train } from 'lucide-react'
import { useState } from 'react'
import { TransportMode } from '@/lib/supabase'
import { useT } from '@/lib/i18n'

export interface TravelDetailsValue {
  arrival_time: string | null
  departure_time: string | null
  transport_mode: TransportMode | null
  transport_details: string | null
}

const MODES: { id: TransportMode; Icon: typeof Plane; label: string }[] = [
  { id: 'plane', Icon: Plane, label: 'Plane' },
  { id: 'train', Icon: Train, label: 'Train' },
  { id: 'car',   Icon: Car,   label: 'Car' },
  { id: 'bus',   Icon: Bus,   label: 'Bus' },
]

/**
 * Collapsed by default. When opened, lets the user set arrival/departure times,
 * pick a transport mode, and add a free-text note (e.g. "VY1234 from MAD").
 * All fields optional — if everything is null, the host can pass nothing.
 */
export function TravelDetailsFields({
  value,
  onChange,
  defaultOpen = false,
}: {
  value: TravelDetailsValue
  onChange: (v: TravelDetailsValue) => void
  defaultOpen?: boolean
}) {
  const { t } = useT()
  const [open, setOpen] = useState(defaultOpen)
  const hasAny = !!(value.arrival_time || value.departure_time || value.transport_mode || value.transport_details)

  return (
    <div className="rounded-xl border border-[#ede8e0] bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-[#faf7f2] rounded-xl transition-colors"
      >
        <span className="text-xs font-semibold text-[#1a1614]">
          {t('event.travel.title')} {hasAny && <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-[#5b4cf5] align-middle" />}
        </span>
        <span className="flex items-center gap-1 text-[10px] text-[#9c8b75]">
          {open ? t('event.hide') : t('event.travel.hint')}
          {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </span>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1 space-y-2.5 border-t border-[#ede8e0]">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-medium text-[#9c8b75] block mb-1">{t('event.travel.arrivalTime')}</label>
              <input
                type="time"
                value={value.arrival_time ?? ''}
                onChange={(e) => onChange({ ...value, arrival_time: e.target.value || null })}
                className="w-full border border-[#ede8e0] rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-[#5b4cf5]/30 bg-[#faf7f2] text-[#1a1614]"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-[#9c8b75] block mb-1">{t('event.travel.departureTime')}</label>
              <input
                type="time"
                value={value.departure_time ?? ''}
                onChange={(e) => onChange({ ...value, departure_time: e.target.value || null })}
                className="w-full border border-[#ede8e0] rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-[#5b4cf5]/30 bg-[#faf7f2] text-[#1a1614]"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-medium text-[#9c8b75] block mb-1">{t('event.travel.howTraveling')}</label>
            <div className="flex gap-1.5">
              {MODES.map(({ id, Icon, label }) => {
                const sel = value.transport_mode === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onChange({ ...value, transport_mode: sel ? null : id })}
                    title={label}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      sel
                        ? 'bg-[#5b4cf5] text-white border-[#5b4cf5]'
                        : 'bg-white text-[#9c8b75] border-[#ede8e0] hover:border-[#5b4cf5]/30 hover:text-[#1a1614]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-medium text-[#9c8b75] block mb-1">{t('event.travel.flightDetails')}</label>
            <input
              type="text"
              placeholder={t('event.travel.flightPlaceholder')}
              value={value.transport_details ?? ''}
              onChange={(e) => onChange({ ...value, transport_details: e.target.value || null })}
              maxLength={80}
              className="w-full border border-[#ede8e0] rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-[#5b4cf5]/30 bg-[#faf7f2] text-[#1a1614]"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export function transportIcon(mode: TransportMode | null) {
  switch (mode) {
    case 'plane': return Plane
    case 'train': return Train
    case 'car':   return Car
    case 'bus':   return Bus
    default:      return null
  }
}
