-- Polls
create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  created_by uuid references public.people(id) on delete set null,
  event_id uuid references public.events(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid references public.polls(id) on delete cascade not null,
  text text not null,
  position int default 0
);

create table if not exists public.poll_votes (
  option_id uuid references public.poll_options(id) on delete cascade not null,
  person_id uuid references public.people(id) on delete cascade not null,
  primary key (option_id, person_id)
);

alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;

create policy "public_polls" on public.polls for all using (true) with check (true);
create policy "public_poll_options" on public.poll_options for all using (true) with check (true);
create policy "public_poll_votes" on public.poll_votes for all using (true) with check (true);

alter publication supabase_realtime add table public.polls;
alter publication supabase_realtime add table public.poll_votes;

-- Event visibility
alter table public.events add column if not exists visibility text not null default 'all';

create table if not exists public.event_viewers (
  event_id uuid references public.events(id) on delete cascade,
  person_id uuid references public.people(id) on delete cascade,
  primary key (event_id, person_id)
);

alter table public.event_viewers enable row level security;
create policy "public_event_viewers" on public.event_viewers for all using (true) with check (true);
