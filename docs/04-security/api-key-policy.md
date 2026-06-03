# API Key Policy

## 목적
- Supabase 및 외부 API 키/시크릿의 저장 위치/노출 범위를 명확히 합니다.
- Docker/로그/프론트 번들에 secret이 유출되지 않도록 규칙을 고정합니다.

## 작성 시점
- 2026-06-02

## 작성할 내용(목차)
- 키 종류 정의
  - Supabase URL
  - Publishable(anon) key
  - Secret key(service role) — server-only
  - (추후) LLM/API provider key — server-only
- 저장 위치 규칙
  - Frontend: `VITE_*` (브라우저 노출 가능) → **publishable만 허용**
  - Backend: `.env`/서버 환경변수 → secret 허용(최소화)
  - Repo: `.env.example`에 placeholder만
- 금지 사항
  - secret을 `VITE_*`로 넣기 금지
  - secret을 `docker-compose.yml`에 하드코딩 금지
  - 로그에 key/토큰 출력 금지
- 점검 방법
  - grep/rg로 키 패턴 검색
  - PR 체크리스트에 보안 항목 포함

