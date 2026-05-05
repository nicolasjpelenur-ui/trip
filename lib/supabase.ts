import { createClient } from '@supabase/supabase-js'

export interface Person {
  id: string
  name: string
  color: string
  status: string
  email: string | null
  auth_user_id: string | null
  onboarding_completed_at: string | null
  created_at: string
}

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
