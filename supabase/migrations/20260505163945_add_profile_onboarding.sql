alter table public.people
  add column if not exists onboarding_completed_at timestamptz;
