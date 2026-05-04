import { Home, Landmark, MapPin, Plane, Mountain, Building2, LucideIcon } from 'lucide-react'

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
