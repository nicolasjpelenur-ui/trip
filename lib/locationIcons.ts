import { Home, Landmark, MapPin, Plane, Mountain, Building2, LucideIcon } from 'lucide-react'

const LOCATION_COLORS = [
  '#5b4cf5', '#e8724a', '#10b981', '#f59e0b',
  '#ec4899', '#3b82f6', '#a855f7', '#14b8a6',
]

export function getLocationColor(locationId: string): string {
  // Stable color per location derived from UUID characters
  const hex = locationId.replace(/-/g, '')
  const n = parseInt(hex.slice(-4), 16)
  return LOCATION_COLORS[n % LOCATION_COLORS.length]
}


const ICON_MAP: Record<string, LucideIcon> = {
  'home': Home,
  'landmark': Landmark,
  'map-pin': MapPin,
  'plane': Plane,
  'mountain': Mountain,
  'building-2': Building2,
}

export function getLocationIcon(iconKey: string): LucideIcon {
  return ICON_MAP[iconKey] ?? MapPin
}

export const LOCATION_ICON_OPTIONS = [
  { key: 'home', label: 'Home / Apartment', Icon: Home },
  { key: 'landmark', label: 'Landmark city', Icon: Landmark },
  { key: 'map-pin', label: 'General location', Icon: MapPin },
  { key: 'plane', label: 'Airport / Travel', Icon: Plane },
  { key: 'mountain', label: 'Nature / Outdoors', Icon: Mountain },
  { key: 'building-2', label: 'City / Urban', Icon: Building2 },
]
