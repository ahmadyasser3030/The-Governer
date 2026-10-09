-- Optional account-sharing upgrade. Run ONCE in your project's SQL Editor.
-- Existing rows and history are untouched. Each authenticated account gets only its own row.
-- Export a private JSON backup first. This is unnecessary for the existing owner's sync.
begin;
alter table public.governor_data enable row level security;
alter table public.governor_data force row level security;
revoke all on public.governor_data from public;
revoke all on public.governor_data from anon;
revoke all on public.governor_data from authenticated;
grant select, insert, update on public.governor_data to authenticated;
-- Remove all old policies on this table because PostgreSQL combines permissive policies with OR.
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='governor_data' loop
    execute format('drop policy %I on public.governor_data', p.policyname);
  end loop;
end $$;
create policy governor_private_select on public.governor_data for select to authenticated
  using ((select auth.uid()) = user_id);
create policy governor_private_insert on public.governor_data for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy governor_private_update on public.governor_data for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- Protect an earlier candidate archive too, if it exists. Keep rows, allow only own reads.
do $$ declare p record; begin
  if to_regclass('public.governor_state') is not null then
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='governor_state' and column_name='user_id' and udt_name='uuid') then
      raise exception 'Legacy cloud archive needs a separate permissions audit. No changes were applied.';
    end if;
    execute 'alter table public.governor_state enable row level security';
    execute 'alter table public.governor_state force row level security';
    execute 'revoke all on public.governor_state from public, anon, authenticated';
    execute 'grant select on public.governor_state to authenticated';
    for p in select policyname from pg_policies where schemaname='public' and tablename='governor_state' loop
      execute format('drop policy %I on public.governor_state',p.policyname);
    end loop;
    execute 'create policy governor_legacy_private_read on public.governor_state for select to authenticated using ((select auth.uid()) = user_id)';
  end if;
end $$;
commit;
-- Keep the revision trigger and size limits from setup.sql.
-- Create/invite accounts in Authentication > Users. Verify isolation using two different logins.
-- Browser profile separation is protection against accidental mixing, not encryption.
