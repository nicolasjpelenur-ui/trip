-- Phase 5: Status, activity feed, auth fields, private groups

-- Status on people
alter table public.people
  add column if not exists status text not null default '',
  add column if not exists email text unique,
  add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null;

-- Activity log
create table if not exists public.activity_log (
  id          uuid primary key default gen_random_uuid(),
  person_id   uuid references public.people(id) on delete set null,
  action      text not null,
  description text not null,
  entity_type text,
  entity_id   uuid,
  created_at  timestamptz not null default now()
);
alter table public.activity_log enable row level security;
create policy "public_read_activity"   on public.activity_log for select using (true);
create policy "public_insert_activity" on public.activity_log for insert with check (true);

alter publication supabase_realtime add table activity_log;

-- Private groups
alter table public.groups
  add column if not exists is_private boolean not null default false;

-- Replace open group policies with privacy-aware ones
drop policy if exists "public_all_groups"   on public.groups;
drop policy if exists "public_all_messages" on public.messages;

-- Groups: public groups anyone can read; private only members (with auth) can read
create policy "read_groups" on public.groups for select
using (
  not is_private
  or id in (
    select gm.group_id
    from   public.group_members gm
    join   public.people p on p.id = gm.person_id
    where  p.auth_user_id = auth.uid()
  )
);
create policy "write_groups"  on public.groups for insert with check (true);
create policy "update_groups" on public.groups for update using (true) with check (true);
create policy "delete_groups" on public.groups for delete using (true);

-- Messages: readable when group is public, or when user is a member
create policy "read_messages" on public.messages for select
using (
  group_id in (select id from public.groups where not is_private)
  or group_id in (
    select gm.group_id
    from   public.group_members gm
    join   public.people p on p.id = gm.person_id
    where  p.auth_user_id = auth.uid()
  )
);
create policy "write_messages"  on public.messages for insert with check (true);
create policy "delete_messages" on public.messages for delete using (true);
