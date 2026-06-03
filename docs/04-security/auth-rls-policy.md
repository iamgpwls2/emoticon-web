# Auth & RLS Policy

## 목적

- 사용자별 데이터 분리를 **DB 레벨(RLS)** 에서 강제합니다.
- 프론트/백엔드 버그·임의 `user_id` 주입으로 타 사용자 데이터가 노출·삭제되는 것을 구조적으로 방지합니다.

## 작성 시점

- 2026-06-02 (초안)
- 2026-06-03 (Day 3 — `emoticon_generations` RLS · Backend 인증 미들웨어 반영)

## 스택 전제

- **Vue 3** — Supabase Auth( publishable/anon key ), 세션·JWT는 브라우저
- **Express** — `requireAuth` 미들웨어로 Bearer JWT 검증, DB 쓰기 시 `req.user.id` 사용
- **Supabase Postgres** — RLS + `auth.uid()`
- **Docker Compose** — frontend(:5173), backend(:4000)

---

## 위협 모델 (요약)

| 위협 | 대응 |
|------|------|
| 타 사용자 row SELECT | RLS `auth.uid() = user_id` |
| 요청 body에 남의 `user_id` INSERT | RLS INSERT `WITH CHECK` + backend는 `req.user.id`만 기록 |
| 타 사용자 row UPDATE/DELETE | RLS + backend 쿼리에 `user_id` 필터 |
| service role로 RLS 우회 | backend에서 **app-level `user_id` 필터 필수** |

---

## Backend 인증 미들웨어 (Day 2~3)

구현: `backend/src/middlewares/auth.middleware.js`

| 항목 | 규칙 |
|------|------|
| 헤더 | `Authorization: Bearer {access_token}` 만 허용 |
| 검증 | `supabase.auth.getUser(token)` (anon/publishable key 클라이언트) |
| 성공 시 | `req.user`, `req.accessToken` 설정 |
| 실패 시 | `401` + `{ ok: false, error: { message } }` |

예시 엔드포인트: `GET /api/auth/me` — 응답 `user.id`는 **토큰에서 검증된 값**만 사용.

### Backend 필수 규칙

1. **클라이언트가 보낸 `user_id`(body, query, header)를 신뢰하지 않습니다.**
2. DB INSERT/UPDATE/SELECT/DELETE 시 **`req.user.id`만** 소유자로 사용합니다.
3. `supabaseAdmin`(service role) 사용 시 RLS가 적용되지 않으므로, 모든 쿼리에 **`.eq('user_id', req.user.id)`** 등 app-level 필터를 **반드시** 붙입니다.

```javascript
// 올바른 예 (service role)
await supabaseAdmin
  .from('emoticon_generations')
  .select('*')
  .eq('user_id', req.user.id)   // 필수
  .eq('id', generationId);

// 금지: 클라이언트 user_id 그대로 사용
// .eq('user_id', req.body.user_id)  ❌
```

---

## `emoticon_generations` RLS

### 정책 요약

| 작업 | 조건 | 설명 |
|------|------|------|
| SELECT | `auth.uid() = user_id` | 본인 생성 기록만 조회 |
| INSERT | `auth.uid() = user_id` | `user_id`는 반드시 로그인 사용자와 일치 |
| UPDATE | `auth.uid() = user_id` | 본인 row만 수정 (USING · WITH CHECK 동일) |
| DELETE | `auth.uid() = user_id` | 본인 row만 삭제 |

프론트가 Supabase 클라이언트(anon key + 사용자 JWT)로 직접 접근할 때 위 정책이 적용됩니다.  
Backend가 **service role**로 접근할 때는 RLS가 **우회**되므로, 위 Backend 규칙으로 동일한 분리를 코드에서 강제합니다.

### SQL (Supabase SQL Editor)

```sql
alter table public.emoticon_generations enable row level security;

-- SELECT: 본인 데이터만
create policy "emoticon_generations_select_own"
  on public.emoticon_generations
  for select
  to authenticated
  using (auth.uid() = user_id);

-- INSERT: user_id는 반드시 본인
create policy "emoticon_generations_insert_own"
  on public.emoticon_generations
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- UPDATE: 본인 row만
create policy "emoticon_generations_update_own"
  on public.emoticon_generations
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- DELETE: 본인 row만
create policy "emoticon_generations_delete_own"
  on public.emoticon_generations
  for delete
  to authenticated
  using (auth.uid() = user_id);
```

> `to authenticated`: Supabase Auth로 로그인한 사용자 JWT가 있을 때만 정책 적용.  
> Backend service role 클라이언트는 RLS를 bypass — **쿼리 단에서 `user_id` 필터 필수**.

---

## service role 사용 범위

| 허용 | 금지 |
|------|------|
| backend 내부: 생성 파이프라인 status 갱신, Storage 연동, 관리 쿼리 | frontend, `VITE_*`, 응답 JSON, 로그 출력 |
| `req.user.id` 검증 **후** 해당 user_id로만 DB/Storage 접근 | 클라이언트 전달 `user_id`만으로 조회 |

환경변수: `SUPABASE_SERVICE_ROLE_KEY` 또는 `SUPABASE_SECRET_KEY` (`backend/.env` 전용).  
상세: `04-security/api-key-policy.md`

---

## 테스트 시나리오 (최소)

1. 사용자 A로 로그인 → A의 `emoticon_generations`만 SELECT 가능
2. 사용자 B JWT로 A의 `id` DELETE/UPDATE 시도 → 0 rows / 정책 거부
3. INSERT 시 `user_id`를 B로 넣고 A JWT로 요청 → INSERT 거부
4. Backend `GET /api/auth/me` + Bearer → `user.id`가 JWT `sub`와 일치
5. Backend service role 쿼리에서 `user_id` 필터 누락 시 **코드 리뷰/테스트로 차단** (RLS가 막지 않음)

---

## 관련 문서

- 스키마: `02-contracts/db-schema.md`
- Storage: `02-contracts/storage-policy.md`
- API 키: `04-security/api-key-policy.md`
- 테스트: `05-roadmap/test-checklist.md`
