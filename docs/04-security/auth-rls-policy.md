# Auth & RLS Policy

## 목적

- 사용자별 데이터 분리를 **DB 레벨(RLS)** 에서 강제합니다.
- 프론트/백엔드 버그·임의 `user_id` 주입으로 타 사용자 데이터가 노출·삭제되는 것을 구조적으로 방지합니다.

## 작성 시점

- 2026-06-02 (초안)
- 2026-06-03 (Day 3 — `emoticon_generations` RLS · Backend 인증 미들웨어 반영)
- 2026-06-07 (Day 9 — 갤러리 목록 조회 보안 정책 반영)
- 2026-06-07 (Day 10 — 삭제 API 보안 정책 반영)
- 2026-06-07 (Day 12 — originalImageUrl 소유 검증·보호 API·정보 노출 최소화 반영)

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
| 실패 시 | `401` + `{ message, code: "UNAUTHORIZED" }` |

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

## Day 12 — 보안 점검 요약

### 핵심 원칙

| 항목 | 규칙 |
|------|------|
| 보호 API | **모든 보호 API는 `requireAuth` 통과 필수** — 미통과 시 `401` |
| userId 출처 | **`req.user.id`만** — body/query/header의 `userId`·`user_id` **신뢰·미사용** |
| service role | RLS bypass → 모든 DB/Storage 쿼리에 app-level `user_id` 필터 |
| 정보 노출 | 존재하지 않거나 권한 없는 데이터 → **동일한 사용자 메시지** (열거 방지) |

### generation API — `req.user.id` 기준

| API | user_id 처리 |
|-----|--------------|
| `POST /api/generations` (생성) | `createGeneratingRecord({ userId: req.user.id, ... })` |
| `GET /api/generations/me` (갤러리) | `.eq('user_id', req.user.id)` **필수** |
| `DELETE /api/generations/:id` (삭제) | `.eq('id', :id).eq('user_id', req.user.id)` **동시 조건** |

- 다른 사용자 JWT로 A의 generation id를 삭제 요청 → **삭제 불가** → `404` (`이모티콘을 찾을 수 없습니다.`)
- A JWT로 B 데이터 갤러리 조회 → B row **미포함** (`total`/`items`에 없음)

구현: `generation.controller.js`, `generation.service.js`

---

## 보호 API — requireAuth 적용 (Day 12)

| API | Route | 미들웨어 |
|-----|-------|----------|
| 이미지 업로드 | `POST /api/uploads/image` | `requireAuth` |
| 프롬프트 구체화 | `POST /api/prompts/refine` | `requireAuth` |
| 이미지 생성 | `POST /api/generations` | `requireAuth` |
| 갤러리 조회 | `GET /api/generations/me` | `requireAuth` |
| 이모티콘 삭제 | `DELETE /api/generations/:id` | `requireAuth` |

공개: `GET /health`, `GET /api/health` 만 인증 없음.

---

## Day 12 — originalImageUrl 소유 검증

`POST /api/generations`에서 `originalImageUrl`이 전달되면 **본인 `user-uploads` 오브젝트**인지 검증합니다.  
(값 없음 → optional, 기존처럼 통과)

### 검증 규칙

| 항목 | 규칙 |
|------|------|
| optional | 값 없음 → 통과 (text-to-image) |
| bucket | `SUPABASE_UPLOAD_BUCKET` (기본 `user-uploads`) |
| path | `{req.user.id}/...` 로 시작 |
| 내 URL / path | 통과 |
| 타 사용자 path | **403** `FORBIDDEN` — `원본 이미지에 접근할 권한이 없습니다.` |
| 외부 URL (`https://example.com/...`) | **400** `VALIDATION_ERROR` |
| user-uploads가 아닌 Storage URL | **400** `VALIDATION_ERROR` |

### 구현·호출 순서

```txt
requireAuth → validateCreateGeneration (형식)
   ↓
createGeneration controller
   ↓
validateUserUploadOwnership({ originalImageUrl, userId: req.user.id })  ← provider 호출 전
   ↓
createGeneratingRecord → generateImageFromPrompt → ...
```

- `validateUserUploadOwnership()` — `storage.service.js`
- `extractStoragePathFromUrl()` — Supabase Storage URL에서 object path 추출
- 검증 실패 시 **DB insert·이미지 provider 호출 없음**
- **original upload image(`user-uploads`)는 삭제하지 않음** — 소유 검증만 수행

### 금지

- 다른 사용자 `user-uploads/{userId}/...` URL을 reference image로 사용 ❌
- 임의 외부 HTTP URL을 reference image로 사용 ❌

---

## Day 9 — 갤러리 목록 조회 (`GET /api/generations/me`)

### 흐름

```txt
Client  Authorization: Bearer {access_token}
   ↓
requireAuth  →  req.user.id 확정 (JWT 검증)
   ↓
listMyGenerations  →  .eq('user_id', req.user.id)  +  created_at DESC  +  pagination
```

### 필수 규칙

| 항목 | 규칙 |
|------|------|
| 인증 | `requireAuth` **선행** — 미통과 시 `401` |
| userId 출처 | **`req.user.id`만** — query/body/header의 `userId` **무시·미수신** |
| DB 필터 | service role 사용 시 `.eq('user_id', req.user.id)` **필수** |
| 타 사용자 접근 | 다른 사용자 JWT로도 **본인 row만** 반환 (필터는 토큰 `sub` 기준) |
| RLS | anon+JWT 직접 SELECT 시 `auth.uid() = user_id` · backend는 service role + app filter |

### 금지

- 클라이언트가 `?userId=` 로 타 사용자 목록 요청 ❌ (서버는 해당 파라미터를 사용하지 않음)
- service role `.select()`에 `user_id` 필터 없음 ❌

### 이중 방어 (RLS + Backend)

| 계층 | 역할 |
|------|------|
| **RLS** | Supabase 클라이언트(사용자 JWT) 직접 접근 시 `auth.uid() = user_id` |
| **Backend** | `supabaseAdmin` + `.eq('user_id', req.user.id)` — RLS bypass 보완 |

갤러리 API는 **backend 경유만** 사용합니다 (frontend → `fetchMyGenerations` → Express).  
Storage signed URL은 응답 `generatedImageUrl`에 포함되나, **목록 API 자체는 DB row만** 필터링합니다.

---

## Day 10 — 이모티콘 삭제 (`DELETE /api/generations/:id`)

### 흐름

```txt
Client  Authorization: Bearer {access_token}
   ↓
requireAuth  →  req.user.id 확정 (JWT 검증)
   ↓
deleteMyGeneration  →  .eq('id', :id).eq('user_id', req.user.id) 조회
   ↓
generated_image_url Storage 삭제 (best effort)
   ↓
.eq('id', :id).eq('user_id', req.user.id) DELETE
```

### 필수 규칙

| 항목 | 규칙 |
|------|------|
| 인증 | `requireAuth` **필수** — 미통과 시 `401` |
| userId 출처 | **`req.user.id`만** — body/query/header의 `userId` **무시·미수신** |
| DB 조회 | `id` + `.eq('user_id', req.user.id)` **동시 조건** |
| DB 삭제 | 동일하게 `id` + `user_id` 필터 |
| 타 사용자 id | 다른 사용자 JWT로도 **본인 row만** 삭제 가능 |
| 정보 노출 | 존재하지 않는 id · 다른 사용자 id → **동일 `404`** (`이모티콘을 찾을 수 없습니다.`) |
| Storage | backend service role — 클라이언트 Storage 직접 삭제 **금지** |

### 금지

- 클라이언트가 `userId`를 body/query로 전달해 타인 row 삭제 ❌
- service role `.delete()`에 `user_id` 필터 없음 ❌
- 타인 id 삭제 시 `403`으로 존재 여부 노출 ❌

### 이중 방어 (RLS + Backend)

| 계층 | 역할 |
|------|------|
| **RLS** | Supabase 클라이언트(사용자 JWT) 직접 DELETE 시 `auth.uid() = user_id` |
| **Backend** | `supabaseAdmin` + `.eq('user_id', req.user.id)` — RLS bypass 보완 |

삭제 API는 **backend 경유만** 사용합니다 (frontend → `deleteGeneration` → Express).

---

## 테스트 시나리오 (최소)

1. 사용자 A로 로그인 → A의 `emoticon_generations`만 SELECT 가능
2. 사용자 B JWT로 A의 `id` DELETE/UPDATE 시도 → 0 rows / 정책 거부
3. INSERT 시 `user_id`를 B로 넣고 A JWT로 요청 → INSERT 거부
4. Backend `GET /api/auth/me` + Bearer → `user.id`가 JWT `sub`와 일치
5. Backend service role 쿼리에서 `user_id` 필터 누락 시 **코드 리뷰/테스트로 차단** (RLS가 막지 않음)
6. `GET /api/generations/me` — 사용자 A JWT → A의 row만 · `total`/`items`에 B row 없음
7. `GET /api/generations/me` — Authorization 없음 / `bearer`(소문자) / 만료 token → `401`
8. `DELETE /api/generations/:id` — 사용자 A JWT + A의 id → `200 { success: true }`
9. `DELETE /api/generations/:id` — 사용자 A JWT + B의 id → `404` (존재 여부 미노출)
10. `DELETE /api/generations/:id` — 존재하지 않는 uuid → `404` (B의 id와 동일 메시지)
11. `DELETE /api/generations/:id` — Authorization 없음 → `401`
12. `POST /api/generations` — 타 사용자 `user-uploads` URL → `403 FORBIDDEN`
13. `POST /api/generations` — `https://example.com/test.png` → `400 VALIDATION_ERROR`
14. `POST /api/generations` — 본인 업로드 URL → 통과 (provider 호출 전 검증)

---

## 관련 문서

- 스키마: `02-contracts/db-schema.md`
- Storage: `02-contracts/storage-policy.md`
- API 키: `04-security/api-key-policy.md`
- 테스트: `05-roadmap/test-checklist.md`
