-- Per-participant arrival/departure dates
-- Allows one event to serve as a shared "window" (e.g. "Valencia apartment")
-- while each participant joins for their own specific stretch of days.
-- NULL means the participant is there for the full event duration.

ALTER TABLE public.event_participants
  ADD COLUMN IF NOT EXISTS arrival_date date,
  ADD COLUMN IF NOT EXISTS departure_date date;

-- Unique constraint so upsert on (event_id, person_id) works
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'event_participants_event_id_person_id_key'
  ) THEN
    ALTER TABLE public.event_participants
      ADD CONSTRAINT event_participants_event_id_person_id_key
      UNIQUE (event_id, person_id);
  END IF;
END $$;
