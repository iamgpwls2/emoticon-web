-- =============================================================================
-- 목적: emoticon_generations RLS 활성화 및 본인 row만 접근하는 정책 4종 생성
-- 실행 위치: Supabase Dashboard → SQL Editor
-- 관련 문서: docs/04-security/auth-rls-policy.md (RLS 정책 단일 기준)
-- 실행 여부:
--   [ ] 미실행
--   [ ] 실행 완료 (YYYY-MM-DD, )
-- 주의: 정책명 충돌 방지를 위해 drop if exists 후 create. Backend service role은 RLS 우회.
-- =============================================================================

alter table public.emoticon_generations enable row level security;

drop policy if exists "emoticon_generations_select_own" on public.emoticon_generations;
create policy "emoticon_generations_select_own"
  on public.emoticon_generations
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "emoticon_generations_insert_own" on public.emoticon_generations;
create policy "emoticon_generations_insert_own"
  on public.emoticon_generations
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "emoticon_generations_update_own" on public.emoticon_generations;
create policy "emoticon_generations_update_own"
  on public.emoticon_generations
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "emoticon_generations_delete_own" on public.emoticon_generations;
create policy "emoticon_generations_delete_own"
  on public.emoticon_generations
  for delete
  to authenticated
  using (auth.uid() = user_id);
