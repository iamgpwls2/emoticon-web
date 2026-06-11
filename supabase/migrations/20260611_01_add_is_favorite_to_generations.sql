-- =============================================================================
-- 목적: 갤러리 즐겨찾기용 emoticon_generations.is_favorite 컬럼 및 조회 인덱스 추가
-- 실행 위치: Supabase Dashboard → SQL Editor
-- 관련 문서: docs/02-contracts/db-schema.md · docs/01-prd/07-gallery-delete.md
-- 실행 여부:
--   [ ] 미실행
--   [ ] 실행 완료 (YYYY-MM-DD, )
-- 주의: add column if not exists — 재실행 안전
-- =============================================================================

alter table public.emoticon_generations
  add column if not exists is_favorite boolean not null default false;

create index if not exists emoticon_generations_user_favorite_idx
  on public.emoticon_generations (user_id, created_at desc)
  where is_favorite = true and saved_to_gallery = true;
