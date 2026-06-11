-- =============================================================================
-- 목적: legacy status(pending/processing)를 generating으로 통일, CHECK·default 최종화
-- 실행 위치: Supabase Dashboard → SQL Editor
-- 관련 문서: docs/02-contracts/db-schema.md (status: generating | completed | failed)
-- 실행 여부:
--   [ ] 미실행
--   [ ] 실행 완료 (YYYY-MM-DD, )
-- 주의: 20260603_01 적용 직후 신규 DB는 CHECK가 이미 최종 상태 — UPDATE만 no-op
-- =============================================================================

begin;

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
