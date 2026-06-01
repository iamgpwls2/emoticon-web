# Emoticon Web

Vue 3 + Vite 프론트엔드, Express 백엔드, Supabase Cloud.

## 로컬 실행 (Docker)

```bash
docker compose up --build
```

| 서비스 | URL |
|--------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:4000 |
| Health check | http://localhost:4000/health |

## Supabase 설정 (Cloud)

Supabase 프로젝트는 [Dashboard](https://supabase.com/dashboard)에서 이미 생성했다고 가정합니다.

1. **API 키 확인** — Project Settings → **API**
   - **Project URL** → `VITE_SUPABASE_URL`, `SUPABASE_URL`
   - **Publishable key** (anon) → `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PUBLISHABLE_KEY`
   - **Secret key** (service_role) → `SUPABASE_SECRET_KEY` (**`backend/.env`에만**)

2. **환경 변수 파일 만들기**
   - 템플릿: [`.env.example`](./.env.example)
   - `frontend/.env` — `VITE_*` 항목만 복사 후 placeholder를 실제 값으로 교체
   - `backend/.env` — `PORT`, `FRONTEND_ORIGIN`, `SUPABASE_*` 복사 후 교체

   ```bash
   # 예: frontend
   # VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY 등을 .env.example 참고해 작성

   # 예: backend
   # SUPABASE_SECRET_KEY는 backend/.env에만 넣습니다.
   ```

3. **보안**
   - 실제 URL·키는 `.env` / `frontend/.env` / `backend/.env`에만 두고 **git에 올리지 않습니다.**
   - Secret key는 브라우저·`VITE_*`·프론트 코드에 넣지 않습니다.

> **Day 1:** Supabase JS 클라이언트 코드는 아직 없습니다. 다음 기능 단계에서 `frontend` / `backend`에 연동합니다.

## 환경 변수

전체 목록과 주석은 [`.env.example`](./.env.example)를 참고하세요.
