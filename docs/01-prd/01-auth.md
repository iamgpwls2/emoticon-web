# 01. Auth (PRD)

## 목적

- Supabase Auth 기반으로 **회원가입 · 로그인 · 로그아웃 · 세션 유지 · 보호 페이지 접근 제어** 요구사항을 정의합니다.
- Frontend는 **publishable(anon) key만** 사용하며, secret key·service role은 backend 전용임을 전제로 합니다.
- 인증된 사용자만 이모티콘 생성(`/generate`)·갤러리(`/gallery`) 등 보호 기능에 접근할 수 있게 합니다.

## 작성 시점

- 2026-06-02 (초안)
- 2026-06-11 (실제 구현 기준 보완 — `LoginPage`·`RegisterPage`·`authSession`·라우터 가드 반영)

## 스택 전제

| 레이어 | 구현 |
|--------|------|
| Frontend Auth UI | `frontend/src/views/LoginPage.vue`, `RegisterPage.vue` |
| Auth 상태·API | `frontend/src/lib/authSession.js`, `frontend/src/composables/useAuth.js` |
| 라우터 가드 | `frontend/src/router/index.js` |
| 헤더·로그아웃 | `frontend/src/components/layout/AppHeader.vue`, `auth/LogoutButton.vue` |
| Supabase 클라이언트 | `frontend/src/lib/supabase.js` (`persistSession`, `autoRefreshToken`) |
| Backend 인증 | `backend/src/middlewares/auth.middleware.js` (`requireAuth`) |
| API 계약 | `docs/02-contracts/api-contract.md` — `Authorization: Bearer {access_token}` |
| 보안 정책 | `docs/04-security/api-key-policy.md`, `docs/04-security/auth-rls-policy.md` |

---

## 배경/목표

### 1. 인증 기능 목적

1. **사용자 식별** — 이모티콘 생성·업로드·갤러리 데이터를 로그인 사용자별로 분리합니다.
2. **보호 API 게이트** — Backend 보호 엔드포인트는 Supabase access token(JWT) 검증 후 `req.user.id`만 신뢰합니다.
3. **최소 인증 UX** — 이메일·비밀번호 기반 가입/로그인만 제공합니다. (소셜 로그인·비밀번호 재설정 UI는 MVP 범위 밖)
4. **세션 지속** — 브라우저를 닫았다 열어도 Supabase가 저장한 세션으로 자동 로그인 상태를 복원합니다.
5. **접근 제어** — 미인증 사용자가 보호 페이지에 직접 URL로 진입하면 로그인 페이지로 보내고, 로그인 후 원래 목적지로 돌아갈 수 있게 합니다.

---

## 사용자 스토리

| 역할 | 스토리 | 완료 조건 |
|------|--------|-----------|
| 신규 사용자 | 이메일·비밀번호로 회원가입하고 이모티콘 생성을 시작하고 싶다 | 가입 성공 후 `/generate`(또는 `redirect` 쿼리)로 이동하거나, 이메일 인증이 필요하면 로그인 안내 화면으로 이동 |
| 기존 사용자 | 로그인해 생성·갤러리 기능을 쓰고 싶다 | 유효한 자격 증명으로 로그인 후 홈 또는 `redirect` 경로로 이동 |
| 로그인 사용자 | 작업을 마치고 로그아웃하고 싶다 | 로컬 세션 제거 후 `/login`으로 이동 |
| 재방문 사용자 | 다시 접속해도 로그인을 유지하고 싶다 | 앱 로드 시 `initAuth()`가 저장된 세션을 복원 |

---

## UX 요구사항

### 2. 회원가입 UX 요구사항

**경로**: `/register` (`meta.guestOnly: true`)

| 항목 | 동작 |
|------|------|
| 페이지 제목 | `회원가입` — 부제: `이모티콘 생성을 시작하려면 계정을 만들어 주세요.` |
| 입력 필드 | 이메일, 비밀번호(placeholder `6자 이상`), 비밀번호 확인 |
| 비밀번호 표시 토글 | 비밀번호·비밀번호 확인 각각 `비밀번호 보기` / `비밀번호 숨기기` 버튼 |
| 제출 버튼 | 기본 `회원가입` · 요청 중 `가입 중…` · `submitting` 동안 **disabled** |
| 중복 제출 방지 | `submitting`이 true이면 `handleSubmit` 즉시 return |
| 클라이언트 검증 | 제출 전 `validateForm()` — 실패 시 API 호출 없음, 필드별 오류 표시 |
| 성공 (세션 있음) | Supabase `signUp` 응답에 `data.session`이 있으면 `router.push(redirectPath)` |
| 성공 (세션 없음) | 이메일 인증 등으로 세션이 없으면 `/login?registered=1`로 이동 |
| redirect 기본값 | `?redirect=`가 `/`로 시작하는 문자열이면 해당 경로, 없으면 **`/generate`** |
| 하단 링크 | `이미 계정이 있나요?` → `/login` |
| 이미 로그인 상태 | `/register` 진입 시 라우터가 **`/`** 로 리다이렉트 (`guestOnly`) |

**구현**: `frontend/src/views/RegisterPage.vue` → `useAuth().signUp()` → `authSession.signUp()` → `supabase.auth.signUp`

---

### 3. 로그인 UX 요구사항

**경로**: `/login` (`meta.guestOnly: true`)

| 항목 | 동작 |
|------|------|
| 페이지 제목 | `로그인` — 부제: `계정으로 로그인해 주세요.` |
| 입력 필드 | 이메일, 비밀번호 |
| 비밀번호 표시 토글 | `비밀번호 보기` / `비밀번호 숨기기` |
| 제출 버튼 | 기본 `로그인` · 요청 중 `로그인 중…` · `submitting` 동안 **disabled** |
| 중복 제출 방지 | `submitting`이 true이면 `handleSubmit` 즉시 return |
| 클라이언트 검증 | 이메일 필수·형식, 비밀번호 필수 — 실패 시 API 호출 없음 |
| 성공 | `router.push(redirectPath)` — `?redirect=`가 `/`로 시작하면 해당 경로, 없으면 **`/`** |
| 가입 완료 안내 | `?registered=1`이면 폼 상단에 `회원가입이 완료되었습니다. 이메일 인증 후 로그인해 주세요.` (`role="status"`) |
| 하단 링크 | `계정이 없으신가요?` → `/register` |
| 이미 로그인 상태 | `/login` 진입 시 라우터가 **`/`** 로 리다이렉트 (`guestOnly`) |

**구현**: `frontend/src/views/LoginPage.vue` → `useAuth().signIn()` → `supabase.auth.signInWithPassword`

---

### 4. 로그아웃 UX 요구사항

| 항목 | 동작 |
|------|------|
| 노출 위치 | 로그인 상태일 때만 헤더(`AppHeader`)에 **로그아웃** 버튼 표시 |
| 클릭 동작 | `signOut({ scope: 'local' })` 호출 후 **`/login`** 으로 이동 |
| 버튼 문구 | 기본 `로그아웃` · 요청 중 `로그아웃 중…` · `submitting` 동안 **disabled** |
| 실패 시 | 버튼 아래 `로그아웃에 실패했습니다. 다시 시도해 주세요.` (`role="alert"`) |
| 헤더 미인증 UI | `로그인` · `회원가입` 버튼 표시 (회원가입 primary → `/register`) |

**구현**: `frontend/src/components/auth/LogoutButton.vue`, `AppHeader.vue`

---

### 5. 로그인 상태 유지 요구사항

| 항목 | 동작 |
|------|------|
| 저장 | Supabase 클라이언트 `persistSession: true` — 브라우저 localStorage 등에 세션 저장 |
| 자동 갱신 | `autoRefreshToken: true` — access token 만료 전 refresh |
| 앱 초기화 | 최초 `initAuth()` 시 `supabase.auth.getSession()`으로 세션 복원 |
| 상태 구독 | `onAuthStateChange`로 `SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`, `USER_UPDATED` 등 반영 |
| 전역 상태 | `session`, `user`, `accessToken`, `isAuthenticated`, `loading`, `isAuthReady` (`authSession.js`) |
| API 호출 전 | 서비스 레이어는 `resolveAccessToken()`으로 토큰 확보 — 없으면 `Error('로그인이 필요합니다.')` 등 컨텍스트 메시지 |
| 헤더 로딩 | `loading`이 true인 동안 헤더 네비게이션(`app-header__actions`) **숨김** — 깜빡임 방지 |

**구현**: `frontend/src/lib/supabase.js`, `frontend/src/lib/authSession.js`

---

### 6. 보호 페이지 접근 제어 요구사항

**라우트 메타**

| 경로 | name | meta | 비인증 시 동작 |
|------|------|------|----------------|
| `/` | Home | — | 접근 허용 |
| `/register` | register | `guestOnly: true` | 인증 시 `/` 로 리다이렉트 |
| `/login` | login | `guestOnly: true` | 인증 시 `/` 로 리다이렉트 |
| `/generate` | Generate | `requiresAuth: true` | `/login?redirect={fullPath}` |
| `/gallery` | Gallery | `requiresAuth: true` | `/login?redirect={fullPath}` |

**가드 조건** (`router.beforeEach`)

1. 매 네비게이션마다 `await initAuth()` 호출 (실패 시 `console.error`만, 가드는 계속 진행).
2. `requiresAuth` 대상: `session` **또는** `accessToken`이 없으면 로그인 페이지로 보냄.
3. `guestOnly` 대상: `session`이 있으면 홈(`/`)으로 보냄.
4. `redirect` 쿼리는 **반드시 `/`로 시작하는 문자열**만 허용 (오픈 리다이렉트 방지).

**구현**: `frontend/src/router/index.js`

---

### 7. loading / error / success 상태

#### 공통 패턴 (로그인·회원가입·로그아웃)

| 상태 | 변수·UI | 규칙 |
|------|---------|------|
| loading | `submitting === true` | 제출 버튼 disabled, 문구 `…중…`, 입력 필드 disabled |
| error (필드) | `fieldErrors.{field}` | 해당 입력 아래 `auth-field-error`, `aria-invalid`, invalid 스타일 |
| error (폼) | `formError` | 폼 상단 `auth-form-error`, `role="alert"` |
| success (회원가입) | 라우터 이동 | 별도 토스트 없음 — 목적 페이지 또는 로그인 안내로 전환 |
| success (로그인) | 라우터 이동 | `redirect` 또는 `/` |
| success (로그아웃) | `/login` 이동 | 세션 제거 후 로그인 페이지 |

#### 폼 검증(필수/형식/길이)

검증 유틸: `frontend/src/utils/isValidEmail.js`

| 필드 | 회원가입 | 로그인 |
|------|----------|--------|
| 이메일 빈 값 | `이메일을 입력해 주세요.` | 동일 |
| 이메일 형식 | `올바른 이메일 형식을 입력해 주세요.` | 동일 |
| 비밀번호 빈 값 | `비밀번호를 입력해 주세요.` | 동일 |
| 비밀번호 길이 | **6자 미만** → `비밀번호는 6자 이상이어야 합니다.` | 로그인 폼에서는 **길이 검증 없음** (서버/Supabase 판단) |
| 비밀번호 확인 | 빈 값 / 불일치 각각 전용 메시지 | — |

제출 시 `clearErrors()` 후 검증 — 클라이언트 검증 실패 시 **Supabase API를 호출하지 않습니다.**

---

## 기능 범위

### 포함 (현재 구현)

- 이메일·비밀번호 회원가입 (`supabase.auth.signUp`)
- 이메일·비밀번호 로그인 (`supabase.auth.signInWithPassword`)
- 로컬 스코프 로그아웃 (`supabase.auth.signOut({ scope: 'local' })`)
- 세션 persist·자동 refresh·라우터 가드
- Backend Bearer JWT 검증 (`requireAuth`) 및 `GET /api/auth/me`
- 보호 API 호출 시 `Authorization: Bearer {access_token}` (`resolveAccessToken` + 각 `services/*.js`)

### 제외 (MVP 미구현)

- 소셜 로그인 (Google, GitHub 등)
- 비밀번호 재설정·찾기 UI
- 이메일 인증 재발송 UI (가입 후 안내 문구만 표시)
- 전역 401 인터셉터·자동 로그아웃 (개별 API 오류는 호출 화면에서 처리)
- Rate limit 전용 UI (Supabase 메시지 매핑만 회원가입에 일부 존재)

---

## 오류 케이스

### 8. 에러 케이스 상세

| 케이스 | 발생 시점 | 사용자에게 보이는 메시지 | 처리 위치 |
|--------|-----------|--------------------------|-----------|
| **이메일 형식 오류** | 클라이언트 검증 | `올바른 이메일 형식을 입력해 주세요.` | Login/Register `validateForm` |
| **비밀번호 길이 오류** | 회원가입 클라이언트 검증 (6자 미만) | `비밀번호는 6자 이상이어야 합니다.` | RegisterPage |
| **이미 가입된 이메일** | Supabase `signUp` 오류 (`already registered` / `already exists`) | `이미 가입된 이메일입니다.` | RegisterPage `toUserFriendlyError` |
| **잘못된 로그인 정보** | `signInWithPassword` 실패 (모든 오류 통합) | `이메일 또는 비밀번호를 확인해주세요.` | LoginPage `catch` — 자격 증명·미인증 이메일 등 구분 없이 동일 메시지 |
| **네트워크 오류** | 회원가입 Supabase 오류 (`network` / `fetch`) | `네트워크 오류가 발생했습니다. 연결을 확인하고 다시 시도해 주세요.` | RegisterPage `toUserFriendlyError` |
| **네트워크 오류 (로그인)** | `signIn` 실패 | `이메일 또는 비밀번호를 확인해주세요.` | LoginPage — 네트워크 전용 분기 **없음** (현재 구현) |
| **세션 만료** | 보호 API 401 / 토큰 무효 | Backend: `Invalid or expired access token.` 등 · Frontend: `readApiResponse`가 `message`를 Error로 throw → **해당 화면** 오류 표시 | `requireAuth`, 각 service |
| **세션 만료 (라우팅)** | `session` 또는 `accessToken` 없음 | 보호 페이지 접근 시 `/login?redirect=...` | `router.beforeEach` |
| **미로그인 API 호출** | `resolveAccessToken` 실패 | 컨텍스트별 메시지 (예: `이모티콘을 생성하려면 로그인이 필요합니다.`) | `authSession.resolveAccessToken`, services |
| **Rate limit** | Supabase 회원가입 | `요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.` | RegisterPage |
| **기타 회원가입 실패** | Supabase 기타 오류 | `회원가입에 실패했습니다. 입력 정보를 확인하고 다시 시도해 주세요.` | RegisterPage |
| **로그아웃 실패** | `signOut` 오류 | `로그아웃에 실패했습니다. 다시 시도해 주세요.` | LogoutButton |

**이메일 인증 필요 시**: Supabase가 `session` 없이 가입만 완료하면 Register → `/login?registered=1` → 로그인 페이지 상단 안내 문구 표시. 인증 전 `signIn`은 Supabase 정책에 따라 실패하며 로그인 폼에는 통합 오류 메시지가 표시됩니다.

---

## 보안 요구사항

### 9. 보안 요구사항

#### Supabase Auth 사용

- Frontend: `@supabase/supabase-js` + `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`(또는 `VITE_SUPABASE_ANON_KEY`).
- Auth UI·세션 관리는 **frontend에서만** 수행합니다.
- Backend: anon/publishable 클라이언트로 `supabase.auth.getUser(accessToken)` 검증 (`requireAuth`).

#### Access token 전달

- 보호 Backend API 호출 시 헤더: `Authorization: Bearer {access_token}` (**대문자 `Bearer`**).
- 토큰 출처: `authSession`의 `session.access_token` — `resolveAccessToken()` 경유.
- 적용 서비스 예: `uploadService.js`, `prompt.service.js`, `generation.service.js`, `collection.service.js`.

#### user_id는 client에서 직접 전달하지 않음

- API body·query·header·localStorage에 `user_id` / `userId`를 넣지 않습니다.
- Backend는 **`req.user.id`**(JWT 검증값)만 소유자 ID로 사용합니다.
- `GET /api/auth/me` 응답의 `user.id`도 토큰 검증 결과만 반환합니다.

#### 키·환경변수 분리

| 구분 | Frontend (`VITE_*`) | Backend only |
|------|-------------------|--------------|
| Supabase URL | `VITE_SUPABASE_URL` | `SUPABASE_URL` |
| Anon/publishable | `VITE_SUPABASE_PUBLISHABLE_KEY` | `SUPABASE_PUBLISHABLE_KEY` |
| Service role | ❌ | `SUPABASE_SECRET_KEY` / `SUPABASE_SERVICE_ROLE_KEY` |
| LLM·Image API key | ❌ | `LLM_API_KEY`, `IMAGE_GENERATION_API_KEY` |

상세: `docs/04-security/api-key-policy.md`

#### 데이터 분리 (RLS)

- DB·Storage는 사용자별 `user_id` 분리 + RLS (`auth.uid() = user_id`).
- Backend service role 사용 시에도 쿼리에 `.eq('user_id', req.user.id)` 등 app-level 필터 필수.

상세: `docs/04-security/auth-rls-policy.md`

#### 오류 응답

- 401: `로그인이 필요합니다.` / `Invalid or expired access token.` 등 — secret·stack 미포함.
- 로그인 실패 시 **이메일 존재 여부를 노출하지 않음** (통합 메시지).

---

## 로그/모니터링 (선택)

- `initAuth` 실패: `console.error('Failed to initialize auth session:', error.message)` — 사용자 UI 없음.
- Backend `requireAuth` 실패: 표준 401 JSON — 토큰 원문·service role 로그 금지.
- 프로덕션에서는 인증 실패율·401 비율 모니터링 권장 (미구현).

---

## 수용 기준 (AC)

### 10. Acceptance Criteria

- [ ] 미로그인 사용자가 `/generate` 또는 `/gallery`에 접근하면 `/login?redirect={원래경로}`로 이동한다.
- [ ] 로그인 성공 후 `redirect` 쿼리가 있으면 해당 경로( `/` 시작만)로, 없으면 로그인은 `/`, 회원가입(세션 있음)은 `/generate`로 이동한다.
- [ ] 로그인·회원가입·로그아웃 요청 중 해당 버튼과 입력이 disabled 되고 `…중…` 문구가 표시된다.
- [ ] 회원가입 시 이메일 형식·비밀번호 6자·비밀번호 확인 일치를 클라이언트에서 검증한다.
- [ ] 이미 가입된 이메일로 회원가입 시 `이미 가입된 이메일입니다.`가 표시된다.
- [ ] 잘못된 로그인 정보 시 `이메일 또는 비밀번호를 확인해주세요.`가 표시된다 (필드 오류와 별도 폼 오류).
- [ ] 가입 후 세션이 없으면 `/login?registered=1`과 이메일 인증 안내 문구가 표시된다.
- [ ] 로그인 상태에서 헤더에 생성·갤러리·로그아웃이 보이고, 로그아웃 후 `/login`으로 이동한다.
- [ ] 로그인 상태에서 `/login`, `/register` 접근 시 `/`로 리다이렉트된다.
- [ ] 브라우저 새로고침 후에도 세션이 유지되면 보호 페이지에 그대로 접근 가능하다.
- [ ] 보호 API 호출 시 `Authorization: Bearer` 헤더가 포함되고, body에 `user_id`가 없다.
- [ ] Backend `requireAuth`는 client `user_id` 없이 JWT만으로 `req.user.id`를 설정한다.
- [ ] `VITE_*`·frontend 번들에 service role·LLM·image API key가 없다.

---

## 테스트 체크리스트

### 11. 테스트 체크리스트

#### 회원가입 (`/register`)

- [ ] 빈 이메일 → `이메일을 입력해 주세요.`
- [ ] 잘못된 이메일 형식 → `올바른 이메일 형식을 입력해 주세요.`
- [ ] 비밀번호 5자 이하 → `비밀번호는 6자 이상이어야 합니다.`
- [ ] 비밀번호 확인 불일치 → `비밀번호가 일치하지 않습니다.`
- [ ] 유효한 신규 계정 → `/generate` 또는 `?redirect=` 경로로 이동 (세션 반환 시)
- [ ] 이미 가입된 이메일 → `이미 가입된 이메일입니다.`
- [ ] 제출 중 버튼·입력 disabled, `가입 중…` 표시
- [ ] 로그인된 상태에서 `/register` → `/` 리다이렉트

#### 로그인 (`/login`)

- [ ] 빈 이메일/비밀번호 → 각 필드 오류 메시지
- [ ] 잘못된 자격 증명 → `이메일 또는 비밀번호를 확인해주세요.`
- [ ] 올바른 자격 증명 → `/` 또는 `?redirect=` 경로
- [ ] `?registered=1` → 가입 완료 안내 문구 표시
- [ ] 제출 중 `로그인 중…` · disabled
- [ ] 로그인된 상태에서 `/login` → `/` 리다이렉트

#### 로그아웃

- [ ] 헤더 로그아웃 클릭 → `/login`, 헤더가 비로그인 UI로 전환
- [ ] 로그아웃 중 버튼 disabled · `로그아웃 중…`

#### 세션·라우터

- [ ] 로그인 후 새로고침 → 여전히 인증 상태, `/generate` 직접 접근 가능
- [ ] 로그아웃 후 `/gallery` 직접 URL → `/login?redirect=/gallery`
- [ ] `initAuth` 완료 전 헤더 네비 숨김 → 완료 후 표시

#### Backend·API

- [ ] `GET /api/auth/me` + 유효 Bearer → `200`, `user.id`·`user.email`
- [ ] Bearer 없음 / 만료 / 잘못된 형식 → `401`
- [ ] `POST /api/generations` 등 보호 API — Authorization 없으면 `401`
- [ ] 요청 body에 `userId`를 넣어도 server는 `req.user.id`만 사용 (타 사용자 데이터 접근 불가)

#### 보안 점검

- [ ] `frontend/` 소스·`VITE_*`에 service role·LLM key 없음
- [ ] Network 탭에서 API 요청에 Bearer만 있고 `user_id` 필드 없음

**로컬 확인**

```bash
docker compose up --build
# frontend http://localhost:5173 — 회원가입·로그인·보호 페이지·로그아웃 수동 확인
docker compose logs -f backend   # 401·인증 관련 오류 확인
```

---

## 관련 문서

- API: `docs/02-contracts/api-contract.md` (`GET /api/auth/me`, Bearer 규칙)
- 보안: `docs/04-security/api-key-policy.md`, `docs/04-security/auth-rls-policy.md`
- UI 가이드: `docs/03-design/design-guide.md`
- 로드맵 테스트: `docs/05-roadmap/test-checklist.md`

## 구현 파일 매핑

| 역할 | 경로 |
|------|------|
| 로그인 페이지 | `frontend/src/views/LoginPage.vue` |
| 회원가입 페이지 | `frontend/src/views/RegisterPage.vue` |
| Auth composable | `frontend/src/composables/useAuth.js` |
| Auth 세션·signIn/Up/Out | `frontend/src/lib/authSession.js` |
| Supabase 클라이언트 | `frontend/src/lib/supabase.js` |
| 라우터 가드 | `frontend/src/router/index.js` |
| 로그아웃 버튼 | `frontend/src/components/auth/LogoutButton.vue` |
| 헤더 | `frontend/src/components/layout/AppHeader.vue` |
| 이메일 검증 | `frontend/src/utils/isValidEmail.js` |
| Backend requireAuth | `backend/src/middlewares/auth.middleware.js` |
| Backend me | `backend/src/routes/auth.routes.js` |
