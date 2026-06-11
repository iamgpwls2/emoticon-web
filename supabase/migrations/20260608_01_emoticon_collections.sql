-- =============================================================================
-- 목적: 갤러리 폴더(emoticon_collections) 테이블 및 generation.collection_id FK 추가
-- 실행 위치: Supabase Dashboard → SQL Editor
-- 관련 문서: docs/02-contracts/db-schema.md
-- 실행 여부:
--   [ ] 미실행
--   [ ] 실행 완료 (YYYY-MM-DD, )
-- 주의: set_updated_at()은 20260603_01에서 정의 — 그 파일을 먼저 실행
-- =============================================================================

create table if not exists public.emoticon_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists emoticon_collections_user_id_created_at_idx
  on public.emoticon_collections (user_id, created_at desc);

alter table public.emoticon_generations
  add column if not exists collection_id uuid
  references public.emoticon_collections (id) on delete set null;

create index if not exists emoticon_generations_collection_id_idx
  on public.emoticon_generations (collection_id)
  where collection_id is not null;

create index if not exists emoticon_generations_user_uncategorized_idx
  on public.emoticon_generations (user_id, created_at desc)
  where collection_id is null;

drop trigger if exists emoticon_collections_updated_at on public.emoticon_collections;

create trigger emoticon_collections_updated_at
  before update on public.emoticon_collections
  for each row execute function public.set_updated_at();
