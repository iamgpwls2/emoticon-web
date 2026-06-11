-- =============================================================================
-- 목적: emoticon_generations 테이블·인덱스·updated_at 트리거 생성 (Day 3 초기 스키마)
-- 실행 위치: Supabase Dashboard → SQL Editor
-- 관련 문서: docs/02-contracts/db-schema.md
-- 실행 여부:
--   [ ] 미실행
--   [ ] 실행 완료 (YYYY-MM-DD, )
-- 주의: saved_to_gallery, is_favorite, collection_id는 이후 migration에서 추가
-- =============================================================================

create table if not exists public.emoticon_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  original_image_url text,
  generated_image_url text,
  emotion text,
  motion text,
  input_text text,
  story_prompt text,
  final_prompt text,
  status text not null default 'generating'
    check (status in ('generating', 'completed', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists emoticon_generations_user_id_created_at_idx
  on public.emoticon_generations (user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists emoticon_generations_updated_at on public.emoticon_generations;

create trigger emoticon_generations_updated_at
  before update on public.emoticon_generations
  for each row execute function public.set_updated_at();
