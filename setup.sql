-- Private cloud setup. Run in YOUR Supabase project's SQL editor.
-- First create your own user in Authentication > Users > Add user.
-- Replace every occurrence of YOUR_EMAIL@example.com with your login email.
-- Keep the existing governor_state table if you used the V2 candidate; this does not touch it.

create table if not exists public.governor_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  constraint governor_format check (jsonb_typeof(data) = 'object' and data->>'schemaVersion' = '1'),
  constraint governor_size check (octet_length(data::text) <= 5000000)
);

alter table public.governor_data enable row level security;
revoke all on public.governor_data from anon;
revoke all on public.governor_data from authenticated;
grant select, insert, update on public.governor_data to authenticated;

drop policy if exists governor_private_select on public.governor_data;
create policy governor_private_select on public.governor_data
  for select to authenticated
  using ((select auth.uid()) = user_id and lower((select auth.jwt())->>'email') = lower('YOUR_EMAIL@example.com'));

drop policy if exists governor_private_insert on public.governor_data;
create policy governor_private_insert on public.governor_data
  for insert to authenticated
  with check ((select auth.uid()) = user_id and lower((select auth.jwt())->>'email') = lower('YOUR_EMAIL@example.com'));

drop policy if exists governor_private_update on public.governor_data;
create policy governor_private_update on public.governor_data
  for update to authenticated
  using ((select auth.uid()) = user_id and lower((select auth.jwt())->>'email') = lower('YOUR_EMAIL@example.com'))
  with check ((select auth.uid()) = user_id and lower((select auth.jwt())->>'email') = lower('YOUR_EMAIL@example.com'));

create or replace function public.governor_revision_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.revision <> old.revision + 1 then
    raise exception 'Revision must advance by one';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists governor_revision_guard on public.governor_data;
create trigger governor_revision_guard before update on public.governor_data
  for each row execute function public.governor_revision_guard();

-- Do not disable row-level security, add public policies, or put service keys in the app.
