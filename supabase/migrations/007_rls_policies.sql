-- Allow anon-key usage for groups and related tables.
-- This app uses the anon key without per-user auth, so policies must
-- allow all operations from the anon role.

-- groups
alter table public.groups enable row level security;
drop policy if exists "allow_all_groups" on public.groups;
create policy "allow_all_groups" on public.groups
  for all using (true) with check (true);

-- group_members
alter table public.group_members enable row level security;
drop policy if exists "allow_all_group_members" on public.group_members;
create policy "allow_all_group_members" on public.group_members
  for all using (true) with check (true);

-- messages
alter table public.messages enable row level security;
drop policy if exists "allow_all_messages" on public.messages;
create policy "allow_all_messages" on public.messages
  for all using (true) with check (true);
