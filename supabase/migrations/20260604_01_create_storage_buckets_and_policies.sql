-- =============================================================================
-- 목적: user-uploads · generated-emoticons Storage bucket 생성 및 사용자별 path RLS
-- 실행 위치: Supabase Dashboard → SQL Editor
-- 관련 문서: docs/02-contracts/storage-policy.md
-- 실행 여부:
--   [ ] 미실행
--   [ ] 실행 완료 (YYYY-MM-DD, )
-- 주의: 실제 업로드·삭제는 backend service role. 정책은 클라이언트 직접 접근 방어용.
-- =============================================================================

-- Buckets (private)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'user-uploads',
  'user-uploads',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public)
values (
  'generated-emoticons',
  'generated-emoticons',
  false
)
on conflict (id) do update set
  public = excluded.public;

-- storage.objects RLS는 Supabase 기본으로 활성화되어 있음

-- user-uploads: 본인 folder ({user_id}/...) 만 SELECT
drop policy if exists "user_uploads_select_own" on storage.objects;
create policy "user_uploads_select_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'user-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- generated-emoticons: 본인 folder 만 SELECT (signed URL이 주 경로이나 방어적 정책)
drop policy if exists "generated_emoticons_select_own" on storage.objects;
create policy "generated_emoticons_select_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'generated-emoticons'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- MVP: INSERT/UPDATE/DELETE는 backend service role만 수행 (클라이언트 정책 없음)
