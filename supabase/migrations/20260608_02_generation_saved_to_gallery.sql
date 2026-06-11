-- =============================================================================
-- 목적: 갤러리 저장 여부(saved_to_gallery) 컬럼 추가 및 기존 completed row backfill
-- 실행 위치: Supabase Dashboard → SQL Editor
-- 관련 문서: docs/02-contracts/db-schema.md
-- 실행 여부:
--   [ ] 미실행
--   [ ] 실행 완료 (YYYY-MM-DD, )
-- 주의: UPDATE는 completed row만 대상 — 재실행해도 이미 true인 row는 그대로
-- =============================================================================

alter table public.emoticon_generations
  add column if not exists saved_to_gallery boolean not null default false;

update public.emoticon_generations
set saved_to_gallery = true
where status = 'completed'
  and saved_to_gallery = false;

create index if not exists emoticon_generations_user_saved_gallery_idx
  on public.emoticon_generations (user_id, created_at desc)
  where saved_to_gallery = true;
