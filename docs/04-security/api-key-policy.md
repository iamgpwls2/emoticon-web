# API Key Policy

## 목적

- Supabase 및 외부 API 키·시크릿의 **저장 위치·노출 범위**를 고정합니다.
- Vue 번들, Docker Compose, 로그, Git을 통한 secret 유출을 방지합니다.

## 작성 시점

- 2026-06-02 (초안)
- 2026-06-03 (Day 3 — Supabase·Backend 인증·외부 API 규칙 반영)

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
- 서버 내부 관리자 작업
- Storage 또는 DB 서버 작업 중 필요한 경우

**금지 사항:**

- frontend 코드에 포함 금지
- `VITE_` 환경변수로 등록 금지
- 응답 JSON에 포함 금지
- console log 출력 금지
- Git commit 금지

service role 사용 시 RLS가 적용되지 않으므로, 쿼리·Storage 접근에 **`req.user.id` 기준 app-level 필터**가 필수입니다. (`04-security/auth-rls-policy.md`)

---

## LLM / Image API Key

LLM API key와 이미지 생성 API key도 **backend에서만** 관리합니다.

**원칙:**

- frontend는 **backend API만** 호출합니다.
- frontend에서 외부 AI API key를 **직접 사용하지 않습니다**.
- backend가 **인증된 사용자 요청**인지 확인(`requireAuth`)한 후 외부 API를 호출합니다.

**환경변수 예시 (backend/.env 전용, placeholder는 `.env.example`만):**

- `OPENAI_API_KEY`, `IMAGE_API_KEY` 등 — Express 라우트 내부에서만 HTTP 호출

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

| 구성요소 | 키 |
|----------|-----|
| `frontend/src/lib/supabase.js` | publishable / anon |
| `backend/src/config/env.js` | URL, anon/publishable, service role 로드·필수 검증 |
| `backend/src/middlewares/auth.middleware.js` | anon 클라이언트 + Bearer JWT |
| `backend/src/services/supabase.service.js` | `supabase` (anon), `supabaseAdmin` (service role) |

---

## 관련 문서

- RLS: `04-security/auth-rls-policy.md`
- 스키마: `02-contracts/db-schema.md`
- Auth PRD: `01-prd/01-auth.md`
- 테스트: `05-roadmap/test-checklist.md`
