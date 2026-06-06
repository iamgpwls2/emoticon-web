# API Key Policy

## 목적

- Supabase 및 외부 API 키·시크릿의 **저장 위치·노출 범위**를 고정합니다.
- Vue 번들, Docker Compose, 로그, Git을 통한 secret 유출을 방지합니다.

## 작성 시점

- 2026-06-02 (초안)
- 2026-06-03 (Day 3 — Supabase·Backend 인증·외부 API 규칙 반영)
- 2026-06-06 (OpenAI API key 관리 정책 상세화)
- 2026-06-06 (Day 7 — `IMAGE_GENERATION_API_KEY` · 생성 Storage 정책 반영)

## 스택 전제

- **Frontend**: Vue 3 + Vite (`frontend/.env`, `VITE_*`만)
- **Backend**: Express (`backend/.env`, server-only secret)
- **실행**: Docker Compose (`env_file` 사용, compose YAML에 secret 하드코딩 금지)

---

## Supabase anon key

`SUPABASE_ANON_KEY`는 Supabase 클라이언트 접근에 사용할 수 있는 **공개 키**입니다.

> 이 프로젝트는 Dashboard의 **publishable key**도 anon과 동일 용도로 사용합니다.  
> Frontend: `VITE_SUPABASE_PUBLISHABLE_KEY` · Backend: `SUPABASE_PUBLISHABLE_KEY` (`env.js`가 anon 이름과 상호 fallback)

**사용 위치:**

- frontend Supabase Auth 로그인/회원가입 (`frontend/src/lib/supabase.js`)
- frontend에서 RLS가 적용된 Supabase 요청
- backend에서 access token 검증용 Supabase client (`backend/src/services/supabase.service.js` → `supabase`, `requireAuth`)

**주의사항:**

- anon key는 공개될 수 있지만, **반드시 RLS 정책과 함께** 사용해야 합니다.
- anon key만으로 **다른 사용자의 데이터에 접근할 수 없어야** 합니다. (`04-security/auth-rls-policy.md`)

---

## Supabase service role key

`SUPABASE_SERVICE_ROLE_KEY`는 **관리자 권한** 키입니다.  
RLS를 우회할 수 있으므로 **backend에서만** 사용합니다.

> 이 프로젝트는 `SUPABASE_SECRET_KEY` 이름으로도 동일 키를 로드합니다 (`backend/src/config/env.js`).  
> 코드상 클라이언트: `supabaseAdmin` (`backend/src/services/supabase.service.js`)

**사용 위치:**

- backend 환경변수 (`backend/.env`)
- 서버 내부 관리자 작업 (Storage 업로드, `emoticon_generations` INSERT/UPDATE)
- `generated-emoticons` · `user-uploads` bucket 쓰기 (`supabaseAdmin`)

**금지 사항:**

- frontend 코드에 포함 금지
- `VITE_` 환경변수로 등록 금지
- 응답 JSON에 포함 금지
- console log 출력 금지
- Git commit 금지

service role 사용 시 RLS가 적용되지 않으므로, 쿼리·Storage 접근에 **`req.user.id` 기준 app-level 필터**가 필수입니다. (`04-security/auth-rls-policy.md`)

---

## OpenAI API key

OpenAI API key(이 프로젝트 환경변수명: **`LLM_API_KEY`**)는 **backend에서만** 관리합니다.  
프롬프트 구체화(`POST /api/prompts/refine`) 시 `backend/src/services/llm.service.js`가 OpenAI Chat Completions API를 호출합니다.

### 저장 위치

| 위치 | 허용 |
|------|------|
| `backend/.env` | ✅ **유일한 저장 위치** |
| `frontend/.env` | ❌ 금지 |
| `VITE_*` 환경변수 | ❌ 금지 |
| Vue / JS / TS 소스 코드 | ❌ 금지 |
| Git 저장소 | ❌ 금지 |

1. **OpenAI API key는 `backend/.env`에만 저장한다.**
2. **`frontend/.env` 또는 `VITE_` 환경변수에는 저장하지 않는다.**  
   Vite는 `VITE_` 접두사 변수를 **브라우저 번들에 포함**하므로, OpenAI key를 프론트 env에 넣으면 즉시 노출됩니다.
3. **Vue 코드에는 OpenAI API key를 작성하지 않는다.**  
   하드코딩, 주석, 테스트용 임시 값 포함 전부 금지.

### 호출 경로

4. **frontend는 OpenAI API를 직접 호출하지 않고, backend의 `POST /api/prompts/refine`만 호출한다.**

```txt
Browser → frontend/src/services/prompt.service.js
       → backend POST /api/prompts/refine (Bearer JWT)
       → backend/src/services/llm.service.js
       → OpenAI API (server-only)
```

- frontend: `refinePrompt()` — `Authorization: Bearer {access_token}` 만 전송
- backend: `requireAuth` → `validatePromptRefine` → `refinePrompt` controller → `refinePromptWithLLM`
- OpenAI endpoint URL(`https://api.openai.com/v1/chat/completions`)도 **backend 코드에만** 존재

### 에러 응답·로깅

5. **backend는 OpenAI API 호출 실패 시 민감정보를 클라이언트에 반환하지 않는다.**

클라이언트에 **포함 금지** 항목:

- API key (`LLM_API_KEY` 값)
- OpenAI 원본 에러 body (타입, 메시지, request id 등)
- stack trace
- `process.env` 덤프

클라이언트 응답 예시 (고정 메시지):

```json
{
  "message": "프롬프트 구체화에 실패했습니다. 다시 시도해 주세요."
}
```

서버 로그에는 원인 파악용으로 **요약 정보만** 남긴다 (예: HTTP status, OpenAI error type). key 값·전체 응답 body는 로그에 남기지 않는다.

### env 파일·Git

6. **`.env`는 Git에 commit하지 않는다.** (`.gitignore` 적용)
7. **`.env.example`에는 변수명과 placeholder만 작성한다.** 실제 key 문자열·팀원 개인 key 금지.

```bash
# backend/.env.example — 변수명만, placeholder 예시
LLM_API_KEY=your-llm-api-key
LLM_MODEL=gpt-4o-mini
```

### 팀 운영

8. **팀원 개인 API key를 공유하지 않는다.**  
   Slack, PR, 이슈, 화면 공유, 채팅에 key를 붙여넣지 않는다. 각자 OpenAI Dashboard에서 발급·관리.
9. **필요 시 key를 삭제하고 새로 발급하는 방식으로 교체한다.**  
   유출·노출·퇴사·권한 회수가 의심되면 기존 key를 **즉시 폐기(revoke)** 하고 새 key를 `backend/.env`에만 반영. Docker 사용 시 `docker compose up -d --force-recreate backend`로 재적용.

### 환경변수 (backend 전용)

| 변수 | 필수 | 설명 |
|------|------|------|
| `LLM_API_KEY` | Yes | OpenAI API key. 미설정 시 500 |
| `LLM_MODEL` | No | 기본값 `gpt-4o-mini` (`llm.service.js`) |

### 금지 사항 요약

- frontend에서 `fetch('https://api.openai.com/...')` 직접 호출
- `VITE_LLM_API_KEY`, `VITE_OPENAI_API_KEY` 등 `VITE_` 접두사 등록
- 에러 응답·Network 탭·소스맵을 통한 key 노출
- compose YAML / Dockerfile / README에 실제 key 기록

---

## Image generation API key

외부 **이미지 생성 API key**(환경변수명: **`IMAGE_GENERATION_API_KEY`**)는 OpenAI LLM key와 동일하게 **backend에서만** 관리합니다.  
`POST /api/generations` 처리 시 `backend/src/services/imageGeneration.service.js`가 외부 Images API를 호출합니다.

### 저장 위치

| 위치 | 허용 |
|------|------|
| `backend/.env` | ✅ **유일한 저장 위치** |
| `frontend/.env` | ❌ **금지** |
| `VITE_*` 환경변수 | ❌ **금지** |
| Vue / JS / TS 소스 코드 | ❌ **금지** |
| Git 저장소 | ❌ **금지** |

1. **`IMAGE_GENERATION_API_KEY`는 `backend/.env`에만 저장한다.**
2. **frontend 코드·frontend env에 노출하지 않는다.**  
   `VITE_IMAGE_GENERATION_API_KEY` 등 `VITE_` 접두사 등록 금지.
3. **Vue 코드에 key를 작성하지 않는다.** (하드코딩·주석·테스트 값 포함 전부 금지)

### 호출 경로

4. **외부 이미지 생성 API 호출은 backend에서만 수행한다.**  
   frontend는 `POST /api/generations`만 호출한다.

```txt
Browser → frontend/src/services/generation.service.js
       → backend POST /api/generations (Bearer JWT)
       → backend/src/services/imageGeneration.service.js
       → 외부 Images API (server-only)
       → backend/src/services/storage.service.js (supabaseAdmin, service role)
       → backend/src/services/generation.service.js (DB)
```

- frontend: `createGeneration()` — `Authorization: Bearer {access_token}` 만 전송
- backend: `requireAuth` → `validateCreateGeneration` → image generate → Storage upload → DB update
- API endpoint URL(`IMAGE_GENERATION_API_URL`)도 **backend env·코드에만** 존재

### Supabase service role key (생성 Storage)

5. **`generated-emoticons` bucket 업로드·signed URL 발급**은 `supabaseAdmin`(service role)으로만 수행한다.  
   service role key는 **backend 전용** — frontend·`VITE_*`·응답 JSON·로그에 포함하지 않는다.

### 에러 응답·로깅

6. **backend는 이미지 생성 API 실패 시 민감정보를 클라이언트에 반환하지 않는다.**

클라이언트에 **포함 금지** 항목:

- `IMAGE_GENERATION_API_KEY` 값
- 외부 provider 원본 에러 body
- service role key
- stack trace

클라이언트 응답 예시:

```json
{
  "message": "이모티콘 생성에 실패했습니다. 다시 시도해 주세요."
}
```

### 환경변수 (backend 전용)

| 변수 | 필수 | 설명 |
|------|------|------|
| `IMAGE_GENERATION_API_KEY` | Yes | 외부 Images API key. 미설정 시 500 |
| `IMAGE_GENERATION_MODEL` | No | 기본값 `dall-e-3` (`imageGeneration.service.js`) |
| `IMAGE_GENERATION_API_URL` | No | 기본값 OpenAI Images endpoint |

```bash
# backend/.env.example — placeholder만
IMAGE_GENERATION_API_KEY=your-image-generation-api-key
IMAGE_GENERATION_MODEL=dall-e-3
IMAGE_GENERATION_API_URL=https://api.openai.com/v1/images/generations
```

### 금지 사항 요약

- frontend에서 외부 Images API URL 직접 `fetch`
- `VITE_IMAGE_GENERATION_API_KEY` 등 `VITE_` 접두사 등록
- frontend env·번들을 통한 key 노출
- compose YAML / Dockerfile / README에 실제 key 기록

---

## env 파일 관리

**커밋 가능:**

```txt
.env.example
frontend/.env.example
backend/.env.example
```

- placeholder·localhost만 포함
- 실제 secret·프로덕션 URL/키 금지

**커밋 금지:**

```txt
.env
.env.local
frontend/.env
backend/.env
```

- `.gitignore`로 제외
- PR 전 `git status`로 `.env`가 staged 되지 않았는지 확인

**로컬 설정:**

```bash
cp backend/.env.example backend/.env   # Dashboard 값 입력
cp frontend/.env.example frontend/.env # publishable key만
docker compose up -d --force-recreate backend
```

`docker compose restart`만으로는 `env_file` 변경이 반영되지 않을 수 있음 → `--force-recreate` 사용.

---

## Docker Compose

- `env_file: ./backend/.env`, `./frontend/.env` 로 주입
- compose YAML·Dockerfile·README에 **실제 secret 문자열 기록 금지**
- 빌드 args로 secret 전달 금지 (이미지 레이어 유출 위험)

---

## 점검 체크리스트

**PR 전:**

```bash
rg -i "service_role|sb_secret|sk-" --glob '!**/.env' --glob '!**/node_modules/**'
git status   # .env 가 staged 되지 않았는지
```

- Bearer token / service role key를 Slack·PR·채팅에 붙여넣지 않기
- 에러 핸들러에서 `process.env` 전체 또는 key 값 로깅 금지

---

## 구현 매핑 (현재 코드)

| 구성요소 | 키 / 역할 |
|----------|-----------|
| `frontend/src/lib/supabase.js` | publishable / anon |
| `frontend/src/services/prompt.service.js` | `POST /api/prompts/refine` 호출 (OpenAI 직접 호출 없음) |
| `frontend/src/services/generation.service.js` | `POST /api/generations` 호출 (Images API 직접 호출 없음) |
| `backend/src/config/env.js` | URL, anon/publishable, service role 로드·필수 검증 |
| `backend/src/middlewares/auth.middleware.js` | anon 클라이언트 + Bearer JWT |
| `backend/src/services/supabase.service.js` | `supabase` (anon), `supabaseAdmin` (service role) |
| `backend/src/services/llm.service.js` | `LLM_API_KEY` → OpenAI Chat Completions (server-only) |
| `backend/src/services/imageGeneration.service.js` | `IMAGE_GENERATION_API_KEY` → Images API (server-only) |
| `backend/src/services/storage.service.js` | `supabaseAdmin` → `generated-emoticons` upload · signed URL |
| `backend/src/services/generation.service.js` | `emoticon_generations` CRUD (service role) |
| `backend/src/controllers/prompt.controller.js` | 실패 시 고정 500 메시지, key·stack 미노출 |
| `backend/src/controllers/generation.controller.js` | 실패 시 `failed` UPDATE + 고정 500 메시지 |

---

## 관련 문서

- RLS: `04-security/auth-rls-policy.md`
- 스키마: `02-contracts/db-schema.md`
- Auth PRD: `01-prd/01-auth.md`
- 테스트: `05-roadmap/test-checklist.md`
