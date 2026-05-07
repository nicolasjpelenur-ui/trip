-- Phase 7b: Web push notification subscriptions
--
-- One row per (person, browser) — a person on phone Safari and laptop Chrome
-- has two rows. The endpoint is the unique identifier from the Push API.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_person ON public.push_subscriptions(person_id);

-- Permissive policies (consistent with the rest of the app's anon-key model;
-- the meaningful access control happens server-side in API routes).
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "allow_all_push_subscriptions" ON public.push_subscriptions
  FOR ALL USING (true) WITH CHECK (true);
