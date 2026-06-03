# DB Schema (Supabase Postgres)

## 목적
- Supabase(Postgres) 테이블/인덱스/관계/제약조건의 기준안을 정의합니다.
- RLS 정책(`04-security/auth-rls-policy.md`)과 반드시 함께 유지합니다.

## 작성 시점
- 2026-06-02

## 작성할 내용(목차)
- 원칙
  - 사용자별 데이터 분리: `user_id`(auth.uid()) 기준
  - 감사 필드: `created_at`, `updated_at`
- 엔티티(초안)
  - `profiles` (선택)
  - `generations` (생성 요청/결과 메타)
  - `assets` (업로드 원본/생성 결과 파일 참조)
- 컬럼 정의(초안)
  - FK, unique, not null, check constraints
- 인덱스
  - `user_id`, `created_at` 중심
- RLS 전제
  - SELECT/INSERT/UPDATE/DELETE 정책 개요(상세는 Security 문서로)
- 마이그레이션 전략(선택)

