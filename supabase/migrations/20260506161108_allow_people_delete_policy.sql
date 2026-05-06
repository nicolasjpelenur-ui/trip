do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'people'
      and policyname = 'public_delete_people'
  ) then
    create policy "public_delete_people"
    on public.people
    for delete
    using (true);
  end if;
end $$;
