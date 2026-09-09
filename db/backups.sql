-- ============================================================================
-- Stone Setting Pro — automatic daily backup of app_data
-- ============================================================================
-- The whole app stores its data as 4 JSON blobs in public.app_data
-- (keys: orders, invoices, clients, day_notes). This keeps a dated snapshot
-- of each one every day, inside the same database, so a single collection can
-- be restored to how it looked on a given day without a full-DB rollback.
--
-- Run once in the Supabase SQL Editor. Requires the pg_cron extension:
--   Dashboard -> Database -> Extensions -> enable "pg_cron"
-- Safe to re-run — every statement is idempotent.
-- ============================================================================

-- 1. Snapshot table ---------------------------------------------------------—-
create table if not exists public.app_data_backups (
  id            bigint generated always as identity primary key,
  snapshot_date date        not null,
  key           text        not null,
  value         jsonb       not null,
  created_at    timestamptz not null default now(),
  unique (snapshot_date, key)
);

alter table public.app_data_backups enable row level security;

-- Signed-in users may read backups; the client can never write them
-- (only the SECURITY DEFINER function below writes).
drop policy if exists "authenticated read backups" on public.app_data_backups;
create policy "authenticated read backups"
  on public.app_data_backups
  for select
  to authenticated
  using (true);

-- 2. Take a snapshot ------------------------------------------------------—---
create or replace function public.take_app_data_snapshot()
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.app_data_backups (snapshot_date, key, value)
  select current_date, key, value
  from public.app_data
  where key in ('orders', 'invoices', 'clients', 'day_notes')
  on conflict (snapshot_date, key) do update
    set value = excluded.value,
        created_at = now();
$$;

-- 3. Prune snapshots older than 60 days ----------------------------------—----
create or replace function public.prune_app_data_backups()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.app_data_backups
  where snapshot_date < current_date - interval '60 days';
$$;

-- 4. Schedule (pg_cron; schedule is in UTC) ------------------------------—----
-- 02:00 UTC ~ 03:00-04:00 Europe/Zurich, the lowest-traffic window.
-- Remove any previous versions of these jobs, then (re)create them.
select cron.unschedule(jobid) from cron.job
  where jobname in ('daily-app-data-backup', 'prune-app-data-backups');

select cron.schedule('daily-app-data-backup',  '0 2 * * *',  $$select public.take_app_data_snapshot()$$);
select cron.schedule('prune-app-data-backups', '30 2 * * *', $$select public.prune_app_data_backups()$$);

-- 5. Take one snapshot now so there is an immediate baseline ------------—----
select public.take_app_data_snapshot();


-- ============================================================================
-- USEFUL QUERIES
-- ============================================================================

-- What snapshots exist:
--   select snapshot_date, key, jsonb_array_length(value) as items, created_at
--   from app_data_backups order by snapshot_date desc, key;

-- Cron jobs and their recent runs:
--   select jobname, schedule, active from cron.job;
--   select jobname, status, return_message, start_time
--   from cron.job_run_details order by start_time desc limit 10;

-- RESTORE one collection to a given day (WARNING: overwrites the live blob):
--   insert into app_data (key, value, updated_at)
--   select key, value, now()
--   from app_data_backups
--   where snapshot_date = '2026-09-20' and key = 'invoices'
--   on conflict (key) do update
--     set value = excluded.value, updated_at = excluded.updated_at;
