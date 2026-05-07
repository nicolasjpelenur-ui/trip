import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { EventWithDetails, Location, supabase } from './supabase'

/**
 * Open-Meteo integration. Free, no API key, no auth.
 * - Geocoding API: https://geocoding-api.open-meteo.com/v1/search
 * - Forecast API:  https://api.open-meteo.com/v1/forecast
 *
 * Strategy:
 *  1. If a Location has no lat/lng yet, geocode its `name` and persist
 *     the result back to the row (so we only do this once per location).
 *  2. Forecast results are cached in localStorage with a 6-hour TTL,
 *     keyed by location id. Open-Meteo only returns up to ~16 days, so
 *     we never request weather for trips further out than that.
 */

export interface DailyForecast {
  date: string         // YYYY-MM-DD
  tempMax: number      // °C
  tempMin: number
  weatherCode: number  // WMO code
}

const FORECAST_DAYS = 14
const CACHE_TTL_MS = 6 * 60 * 60 * 1000

interface CachedEntry {
  fetchedAt: number
  forecast: DailyForecast[]
}

function cacheKey(locationId: string) {
  return `weather_${locationId}`
}

function readCache(locationId: string): DailyForecast[] | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(cacheKey(locationId))
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as CachedEntry
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null
    return parsed.forecast
  } catch {
    return null
  }
}

function writeCache(locationId: string, forecast: DailyForecast[]) {
  if (typeof window === 'undefined') return
  const entry: CachedEntry = { fetchedAt: Date.now(), forecast }
  try { localStorage.setItem(cacheKey(locationId), JSON.stringify(entry)) } catch { /* quota */ }
}

async function geocode(name: string): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en&format=json`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const hit = data?.results?.[0]
    if (!hit) return null
    return { latitude: hit.latitude, longitude: hit.longitude }
  } catch { return null }
}

async function ensureLocationCoords(location: Location): Promise<{ latitude: number; longitude: number } | null> {
  if (location.latitude != null && location.longitude != null) {
    return { latitude: location.latitude, longitude: location.longitude }
  }
  const coords = await geocode(location.name)
  if (!coords) return null
  // Persist lazily — best-effort; ignore failures (e.g. RLS).
  try {
    await supabase
      .from('locations')
      .update({ latitude: coords.latitude, longitude: coords.longitude })
      .eq('id', location.id)
  } catch { /* non-fatal */ }
  return coords
}

async function fetchForecast(latitude: number, longitude: number): Promise<DailyForecast[]> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=${FORECAST_DAYS}`
  const res = await fetch(url)
  if (!res.ok) return []
  const data = await res.json()
  const dates: string[] = data?.daily?.time ?? []
  const max: number[] = data?.daily?.temperature_2m_max ?? []
  const min: number[] = data?.daily?.temperature_2m_min ?? []
  const codes: number[] = data?.daily?.weather_code ?? []
  return dates.map((date, i) => ({
    date,
    tempMax: Math.round(max[i] ?? 0),
    tempMin: Math.round(min[i] ?? 0),
    weatherCode: codes[i] ?? 0,
  }))
}

/**
 * Returns the forecast for an event's location, scoped to the event window
 * (start..end). Returns an empty array if the event is outside the forecast
 * range or weather can't be fetched.
 */
export async function getEventWeather(event: EventWithDetails): Promise<DailyForecast[]> {
  const today = new Date()
  const start = parseISO(event.start_date)
  const daysToStart = differenceInCalendarDays(start, today)
  // Only forecast trips that start within the next FORECAST_DAYS days
  // (or are happening now). Past trips get no weather.
  if (daysToStart > FORECAST_DAYS) return []
  if (differenceInCalendarDays(parseISO(event.end_date), today) < 0) return []

  const cached = readCache(event.location.id)
  let forecast = cached
  if (!forecast) {
    const coords = await ensureLocationCoords(event.location)
    if (!coords) return []
    forecast = await fetchForecast(coords.latitude, coords.longitude)
    writeCache(event.location.id, forecast)
  }

  // Trim to the event window
  const startStr = format(start, 'yyyy-MM-dd')
  const endStr = format(parseISO(event.end_date), 'yyyy-MM-dd')
  return forecast.filter((d) => d.date >= startStr && d.date <= endStr)
}

/**
 * WMO weather codes → human-readable label + lucide icon name.
 * Reference: https://open-meteo.com/en/docs (weather variables section)
 */
export function describeWeather(code: number): { label: string; icon: 'sun' | 'cloud' | 'cloud-sun' | 'cloud-rain' | 'cloud-snow' | 'cloud-fog' | 'cloud-lightning' } {
  if (code === 0)            return { label: 'Clear', icon: 'sun' }
  if (code === 1)            return { label: 'Mostly clear', icon: 'cloud-sun' }
  if (code === 2)            return { label: 'Partly cloudy', icon: 'cloud-sun' }
  if (code === 3)            return { label: 'Cloudy', icon: 'cloud' }
  if (code === 45 || code === 48) return { label: 'Foggy', icon: 'cloud-fog' }
  if (code >= 51 && code <= 57)   return { label: 'Drizzle', icon: 'cloud-rain' }
  if (code >= 61 && code <= 67)   return { label: 'Rain', icon: 'cloud-rain' }
  if (code >= 71 && code <= 77)   return { label: 'Snow', icon: 'cloud-snow' }
  if (code >= 80 && code <= 82)   return { label: 'Showers', icon: 'cloud-rain' }
  if (code >= 85 && code <= 86)   return { label: 'Snow showers', icon: 'cloud-snow' }
  if (code >= 95)                 return { label: 'Thunderstorm', icon: 'cloud-lightning' }
  return { label: '—', icon: 'cloud' }
}
