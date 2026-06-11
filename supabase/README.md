# Supabase SQL 관리

Supabase Dashboard **SQL Editor → Private**에 흩어져 있던 SQL을 Git으로 추적 가능한 **migration 파일**로 관리합니다.

애플리케이션 코드(frontend/backend)는 이 폴더와 무관하게 동작합니다. 스키마·RLS·Storage 변경은 **문서 계약과 migration SQL**로만 기록합니다.

---

## 관련 문서 (단일 기준)

| 주제 | 문서 |
|------|------|
| 테이블·컬럼·인덱스 | [`docs/02-contracts/db-schema.md`](../docs/02-contracts/db-schema.md) |
| RLS 정책 | [`docs/04-security/auth-rls-policy.md`](../docs/04-security/auth-rls-policy.md) |
| Storage 버킷·경로 | [`docs/02-contracts/storage-policy.md`](../docs/02-contracts/storage-policy.md) |

**작업 순서:** 문서에서 스키마/정책을 먼저 확정 → migration SQL 작성 → Supabase에서 실행 → migration 헤더의 실행 여부 체크.

---

## migration 목록 (실행 순서)

아래 **7개 파일**이 전부입니다. 파일명 순서 = 적용 순서입니다.

| 순서 | 파일 | 요약 |
|------|------|------|
| 1 | `20260603_01_create_emoticon_generations.sql` | 테이블·인덱스·`set_updated_at` |
| 2 | `20260603_02_enable_rls_emoticon_generations.sql` | RLS 정책 4종 |
| 3 | `20260604_01_create_storage_buckets_and_policies.sql` | Storage bucket + SELECT 정책 |
| 4 | `20260607_01_update_generation_status_to_generating.sql` | status CHECK 최종화 (brownfield용) |
| 5 | `20260608_01_emoticon_collections.sql` | 갤러리 폴더 + `collection_id` |
| 6 | `20260608_02_generation_saved_to_gallery.sql` | `saved_to_gallery` 컬럼 |
| 7 | `20260611_01_add_is_favorite_to_generations.sql` | `is_favorite` 컬럼 |

> **신규 DB:** 1 → 2 → 3만으로도 MVP 동작 가능. 4번은 CHECK가 이미 최종 상태라 no-op에 가깝습니다. 5~7은 해당 기능 도입 시 실행.

---

## 폴더 구조

```txt
supabase/
├── README.md
└── migrations/
    ├── 20260603_01_create_emoticon_generations.sql
    ├── 20260603_02_enable_rls_emoticon_generations.sql
    ├── 20260604_01_create_storage_buckets_and_policies.sql
    ├── 20260607_01_update_generation_status_to_generating.sql
    ├── 20260608_01_emoticon_collections.sql
    ├── 20260608_02_generation_saved_to_gallery.sql
    └── 20260611_01_add_is_favorite_to_generations.sql
```

---

## 파일명 규칙

```txt
YYYYMMDD_NN_short_description.sql
```

| 요소 | 설명 | 예시 |
|------|------|------|
| `YYYYMMDD` | 적용 예정일 또는 작성일 | `20260611` |
| `NN` | 같은 날짜 내 순서 (01, 02, …) | `01` |
| `short_description` | snake_case 요약 | `add_is_favorite_to_generations` |

---

## migration 파일 헤더 (필수)

각 SQL 파일 **맨 위**에 아래 블록을 둡니다.

```sql
-- =============================================================================
-- 목적: (이 migration이 하는 일 한 줄 요약)
-- 실행 위치: Supabase Dashboard → SQL Editor (또는 Supabase CLI / psql)
-- 관련 문서: docs/02-contracts/db-schema.md · docs/04-security/auth-rls-policy.md
-- 실행 여부:
--   [ ] 미실행
--   [ ] 실행 완료 (YYYY-MM-DD, 실행자 이니셜)
-- 주의: 이미 적용된 환경에서는 IF NOT EXISTS / DROP IF EXISTS 로 idempotent 하게 작성
-- =============================================================================
```

**이미 실행된 SQL**과 **앞으로 실행할 SQL** 구분은 Git + 헤더 체크박스로 합니다.

1. Supabase에 적용한 뒤 `[x] 실행 완료`에 날짜·이니셜을 적고 커밋합니다.
2. 팀원은 파일 헤더만 보면 로컬/스테이징/프로덕션 적용 여부를 추적할 수 있습니다.

---

## 실행 방법

### Supabase Dashboard (권장 — MVP)

1. [Supabase Dashboard](https://supabase.com/dashboard) → 프로젝트 → **SQL Editor**
2. [migration 목록](#migration-목록-실행-순서) 순서대로 **한 파일씩** 붙여넣기
3. `BEGIN`/`COMMIT`이 있으면 트랜잭션 단위로 실행
4. 성공 시 해당 파일 헤더에 **실행 완료** 표시 후 Git 커밋

### Supabase CLI / psql (선택)

```bash
psql "$SUPABASE_DB_URL" -f supabase/migrations/20260611_01_add_is_favorite_to_generations.sql
```

> service role key, anon key, JWT secret, DB URL은 **migration·README·Git에 넣지 않습니다.**

---

## 작성 원칙

### Idempotent (재실행 안전)

| 대상 | 권장 패턴 |
|------|-----------|
| 테이블 | `create table if not exists` |
| 컬럼 | `add column if not exists` |
| 인덱스 | `create index if not exists` |
| 함수 | `create or replace function` |
| RLS 정책 | `drop policy if exists` → `create policy` |
| CHECK 제약 | `drop constraint if exists` → `add constraint` |
| Storage bucket | `insert … on conflict (id) do nothing` |

### 보안

- API key, service role key, JWT secret을 SQL·주석·README에 **기록하지 않습니다.**
- Backend service role은 RLS를 우회하므로 앱 코드에서 `req.user.id` 필터가 필수입니다.

---

## 새 migration 추가 절차

1. [`db-schema.md`](../docs/02-contracts/db-schema.md) 등 관련 문서 업데이트
2. `supabase/migrations/YYYYMMDD_NN_description.sql` 생성 (헤더 + idempotent SQL)
3. Supabase SQL Editor에서 실행
4. 헤더에 실행 완료 표시 후 Git 커밋
5. 이 README [migration 목록](#migration-목록-실행-순서) 표에 행 추가

### 삭제된 구 파일 (Git 이력 참고)

중복·중간 단계 제거로 아래 파일은 **더 이상 사용하지 않습니다.**

| 삭제된 파일 | 대체 |
|-------------|------|
| `20260606000000_day7_generating_status.sql` | `20260607_01_*` (중간 CHECK 확장 단계 불필요) |
| `20260607_update_generation_status_to_generating.sql` | `20260607_01_*` (이름 정규화) |
| `20260608000000_emoticon_collections.sql` | `20260608_01_*` |
| `20260608120000_generation_saved_to_gallery.sql` | `20260608_02_*` |
| `20260611120000_generation_is_favorite.sql` | `20260611_01_*` (동일 SQL 중복) |

이미 Supabase에 구 파일만 적용된 환경은 **대체 파일을 실행해도** `IF NOT EXISTS`로 안전합니다.

---

## 체크리스트 (배포 전)

- [ ] 문서(`db-schema` / `auth-rls-policy` / `storage-policy`)와 migration SQL이 일치
- [ ] migration 헤더에 실행 여부 기록
- [ ] secret·키가 파일에 없음
- [ ] `IF NOT EXISTS` / `DROP IF EXISTS`로 재실행 오류 방지
