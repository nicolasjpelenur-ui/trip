'use client'

import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun } from 'lucide-react'
import { EventWithDetails } from '@/lib/supabase'
import { DailyForecast, describeWeather, getEventWeather } from '@/lib/weatherQueries'

const ICON_MAP = {
  sun: Sun,
  cloud: Cloud,
  'cloud-sun': CloudSun,
  'cloud-rain': CloudRain,
  'cloud-snow': CloudSnow,
  'cloud-fog': CloudFog,
  'cloud-lightning': CloudLightning,
}

/**
 * Slim horizontal forecast strip. Renders nothing while loading or if the
 * event is outside the 14-day forecast window.
 */
export function WeatherStrip({ event }: { event: EventWithDetails }) {
  const [forecast, setForecast] = useState<DailyForecast[] | null>(null)

  useEffect(() => {
    let cancelled = false
    getEventWeather(event).then((data) => { if (!cancelled) setForecast(data) }).catch(() => { if (!cancelled) setForecast([]) })
    return () => { cancelled = true }
  }, [event])

  if (!forecast || forecast.length === 0) return null

  return (
    <div className="rounded-xl border border-[#e8e0d5] bg-white px-3 py-2.5 mb-3 overflow-x-auto" style={{ boxShadow: '0 1px 4px rgba(100,60,10,0.07)' }}>
      <div className="flex items-center gap-3 min-w-max">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9c8b75] flex-shrink-0">Weather</span>
        {forecast.map((d) => {
          const { label, icon } = describeWeather(d.weatherCode)
          const Icon = ICON_MAP[icon]
          return (
            <div key={d.date} className="flex items-center gap-1.5 flex-shrink-0" title={label}>
              <span className="text-[10px] font-medium text-[#9c8b75]">{format(parseISO(d.date), 'EEE')}</span>
              <Icon className="w-3.5 h-3.5 text-[#5b4cf5]" />
              <span className="text-xs font-semibold text-[#1a1614]">{d.tempMax}°</span>
              <span className="text-[10px] text-[#9c8b75]">/{d.tempMin}°</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Single-chip variant — shows just the start-day forecast as a small pill.
 * Used inline on event cards.
 */
export function WeatherChip({ event }: { event: EventWithDetails }) {
  const [forecast, setForecast] = useState<DailyForecast[] | null>(null)

  useEffect(() => {
    let cancelled = false
    getEventWeather(event).then((data) => { if (!cancelled) setForecast(data) }).catch(() => { if (!cancelled) setForecast([]) })
    return () => { cancelled = true }
  }, [event])

  if (!forecast || forecast.length === 0) return null
  const first = forecast[0]
  const { icon } = describeWeather(first.weatherCode)
  const Icon = ICON_MAP[icon]

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#5b4cf5]/8 text-[#5b4cf5] px-2 py-0.5 text-[11px] font-medium" title={`${first.tempMax}° on ${format(parseISO(first.date), 'EEE MMM d')}`}>
      <Icon className="w-3 h-3" />
      {first.tempMax}°
    </span>
  )
}
