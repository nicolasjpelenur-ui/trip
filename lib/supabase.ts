import { createClient } from '@supabase/supabase-js'

export interface Person {
  id: string
  name: string
  color: string
  status: string
  email: string | null
  auth_user_id: string | null
  onboarding_completed_at: string | null
  birthday: string | null
  show_birthday_year: boolean
  created_at: string
}

export type TransportMode = 'plane' | 'train' | 'car' | 'bus'

export interface ActivityLog {
  id: string
  person_id: string | null
  action: string
  description: string
  entity_type: string | null
  entity_id: string | null
  created_at: string
  person?: Person | null
}

export interface Location {
  id: string
  name: string
  emoji: string
  latitude: number | null
  longitude: number | null
}

export interface Event {
  id: string
  title: string
  location_id: string
  start_date: string
  end_date: string
  notes: string | null
  created_by: string | null
  updated_at: string
  location?: Location
}

export interface EventParticipant {
  id: string
  event_id: string
  person_id: string
  staying_at_apartment: boolean
  arrival_date: string | null
  departure_date: string | null
  arrival_time: string | null
  departure_time: string | null
  transport_mode: TransportMode | null
  transport_details: string | null
  person?: Person
}

export interface EventWithDetails extends Event {
  location: Location
  participants: (EventParticipant & { person: Person })[]
  viewers: { person_id: string }[]
  visibility: string
}

export interface ItineraryDay {
  id: string
  event_id: string
  day_date: string
  title: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ItineraryItem {
  id: string
  day_id: string
  title: string
  start_time: string | null
  end_time: string | null
  place_name: string | null
  address: string | null
  city: string | null
  url: string | null
  notes: string | null
  position: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ItineraryDayWithItems extends ItineraryDay {
  items: ItineraryItem[]
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
