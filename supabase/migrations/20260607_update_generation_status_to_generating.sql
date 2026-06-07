-- Day 7: unify emoticon_generations.status to generating | completed | failed
-- Run in Supabase Dashboard → SQL Editor (or via psql with SUPABASE_DB_URL)

begin;

-- Migrate legacy in-progress statuses before tightening CHECK constraint
update public.emoticon_generations
set
  status = 'generating',
  updated_at = now()
where status in ('processing', 'pending');

alter table public.emoticon_generations
  drop constraint if exists emoticon_generations_status_check;

alter table public.emoticon_generations
  add constraint emoticon_generations_status_check
  check (status in ('generating', 'completed', 'failed'));

alter table public.emoticon_generations
  alter column status set default 'generating';

commit;
