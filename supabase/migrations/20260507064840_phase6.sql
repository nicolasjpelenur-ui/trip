-- Phase 6: birthdays, location coordinates (for weather), and travel details
-- All columns nullable / additive; existing rows unaffected.

-- 1. Birthdays on people
--    Stored as a real DATE so we can do age math when the user opts in.
--    UI shows month + day only by default.
ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS birthday date,
  ADD COLUMN IF NOT EXISTS show_birthday_year boolean NOT NULL DEFAULT false;

-- 2. Lat/lng on locations for weather lookups (Open-Meteo).
--    Resolved lazily on first weather fetch and cached back to the row,
--    so the user never sees this.
ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

-- 3. Travel details on event_participants for pickup coordination.
--    All optional. Times use TIME (no TZ) — UI treats them as local
--    to the event's location.
ALTER TABLE public.event_participants
  ADD COLUMN IF NOT EXISTS arrival_time time,
  ADD COLUMN IF NOT EXISTS departure_time time,
  ADD COLUMN IF NOT EXISTS transport_mode text
    CHECK (transport_mode IN ('plane', 'train', 'car', 'bus') OR transport_mode IS NULL),
  ADD COLUMN IF NOT EXISTS transport_details text;
