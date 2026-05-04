-- People: the visitors and residents
create table public.people (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#6366f1',
  "group" text not null default 'our_family' check ("group" in ('us', 'our_family', 'partner_family')),
  created_at timestamptz not null default now()
);

-- Locations: cities / places
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  emoji text not null default '📍'
);

-- Insert default locations
insert into public.locations (name, emoji) values
  ('Valencia', '🇪🇸'),
  ('Paris', '🇫🇷'),
  ('Madrid', '🇪🇸'),
  ('Barcelona', '🇪🇸');

-- Events: a stay or trip with a date range and location
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  location_id uuid not null references public.locations(id) on delete restrict,
  start_date date not null,
  end_date date not null,
  notes text,
  created_by uuid references public.people(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint valid_dates check (end_date >= start_date)
);

create index events_dates_idx on public.events(start_date, end_date);

-- Who is in each event
create table public.event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  staying_at_apartment boolean not null default false,
  unique(event_id, person_id)
);

create index ep_event_idx on public.event_participants(event_id);
create index ep_person_idx on public.event_participants(person_id);

-- Enable Row Level Security (public read/write for family use)
alter table public.people enable row level security;
alter table public.locations enable row level security;
alter table public.events enable row level security;
alter table public.event_participants enable row level security;

create policy "public_read_people" on public.people for select using (true);
create policy "public_insert_people" on public.people for insert with check (true);
create policy "public_update_people" on public.people for update using (true);

create policy "public_read_locations" on public.locations for select using (true);
create policy "public_insert_locations" on public.locations for insert with check (true);

create policy "public_read_events" on public.events for select using (true);
create policy "public_insert_events" on public.events for insert with check (true);
create policy "public_update_events" on public.events for update using (true);
create policy "public_delete_events" on public.events for delete using (true);

create policy "public_read_ep" on public.event_participants for select using (true);
create policy "public_insert_ep" on public.event_participants for insert with check (true);
create policy "public_delete_ep" on public.event_participants for delete using (true);
