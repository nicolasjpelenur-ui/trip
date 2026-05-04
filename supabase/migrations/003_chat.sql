-- Trip groups
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#5b4cf5',
  description text,
  created_by uuid references public.people(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Group membership
create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  unique(group_id, person_id)
);

-- Group chat messages
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  person_id uuid references public.people(id) on delete set null,
  content text not null,
  created_at timestamptz not null default now()
);

create index messages_group_idx on public.messages(group_id, created_at desc);

-- Event comment threads
create table public.event_comments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  person_id uuid references public.people(id) on delete set null,
  content text not null,
  created_at timestamptz not null default now()
);

create index event_comments_event_idx on public.event_comments(event_id, created_at);

-- Event reactions (icon keys)
create table public.event_reactions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  reaction text not null check (reaction in ('thumbs-up','heart','question','clock','party')),
  unique(event_id, person_id, reaction)
);

-- RLS
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.messages enable row level security;
alter table public.event_comments enable row level security;
alter table public.event_reactions enable row level security;

create policy "public_all_groups"    on public.groups          for all using (true) with check (true);
create policy "public_all_gm"        on public.group_members   for all using (true) with check (true);
create policy "public_all_messages"  on public.messages        for all using (true) with check (true);
create policy "public_all_comments"  on public.event_comments  for all using (true) with check (true);
create policy "public_all_reactions" on public.event_reactions for all using (true) with check (true);

-- Realtime
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table event_comments;
alter publication supabase_realtime add table event_reactions;
alter publication supabase_realtime add table groups;
alter publication supabase_realtime add table group_members;
