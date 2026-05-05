create table if not exists public.event_itinerary_days (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  day_date date not null,
  title text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id, day_date)
);

create table if not exists public.event_itinerary_items (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.event_itinerary_days(id) on delete cascade,
  title text not null,
  start_time time,
  end_time time,
  place_name text,
  address text,
  city text,
  url text,
  notes text,
  position int not null default 0,
  created_by uuid references public.people(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists event_itinerary_days_event_idx
  on public.event_itinerary_days(event_id, day_date);

create index if not exists event_itinerary_items_day_idx
  on public.event_itinerary_items(day_id, position, start_time, created_at);

alter table public.event_itinerary_days enable row level security;
alter table public.event_itinerary_items enable row level security;

create policy "public_event_itinerary_days"
  on public.event_itinerary_days for all using (true) with check (true);

create policy "public_event_itinerary_items"
  on public.event_itinerary_items for all using (true) with check (true);

alter publication supabase_realtime add table public.event_itinerary_days;
alter publication supabase_realtime add table public.event_itinerary_items;
