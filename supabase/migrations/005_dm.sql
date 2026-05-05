-- Add DM support to groups
alter table public.groups add column if not exists is_dm boolean default false;
