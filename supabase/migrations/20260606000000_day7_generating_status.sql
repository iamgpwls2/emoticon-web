-- Day 7: allow status='generating' for image generation pipeline
-- Run in Supabase Dashboard → SQL Editor (or: SUPABASE_DB_URL set → npm run migrate:day7)

alter table public.emoticon_generations
  drop constraint if exists emoticon_generations_status_check;

alter table public.emoticon_generations
  add constraint emoticon_generations_status_check
  check (
    status in (
      'pending',
      'processing',
      'generating',
      'completed',
      'failed'
    )
  );

-- Optional: after migration, remove GENERATION_INSERT_STATUS=processing from backend/.env
-- and use default status 'generating' in generation.service.js
