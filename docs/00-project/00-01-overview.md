# 00-01. Overview

## 목적
- 프로젝트의 전체 구조(Frontend/Backend/Supabase)와 책임 분리를 요약합니다.
- “어디에 무엇을 구현해야 하는가”를 Cursor Agent가 빠르게 파악할 수 있게 합니다.

## 작성 시점
- 2026-06-02 (초안 본문 보강)

---

## 서비스 목적 (초안)

**Emoticon Web**은 사용자가 사진을 업로드하고, 텍스트로 원하는 이모티콘 스타일을 입력한 뒤, AI로 이모티콘 이미지를 생성·저장·다운로드할 수 있는 웹 서비스입니다.

- **누구를 위한 서비스인가:** SNS·메신저용 이모티콘/스티커를 직접 만들고 싶은 일반 사용자
- **무엇을 해결하는가:** 디자인 도구 없이도 “내 얼굴/내 캐릭터” 기반 이모티콘을 빠르게 시도·반복 생성
- **어떻게 제공하는가:** Vue 프론트 + Express API + Supabase(Auth/DB/Storage)로 인증·데이터·파일을 안전하게 분리
- **MVP에서의 성공 기준:** 로그인한 사용자만 자신의 업로드/생성 결과를 보고, 갤러리에서 관리(삭제)할 수 있다

---

## 배경 / 문제 정의 (초안)

- 이모티콘 제작은 보통 전문 툴·외주·고정 템플릿에 의존한다.
- 사용자는 “한 번 업로드 → 여러 스타일 시도 → 결과 저장” 흐름을 원하지만, 파일·계정·권한 관리가 어렵다.
- 생성 API·LLM·이미지 모델 키는 **반드시 서버에서만** 다뤄야 하며, 클라이언트에 노출되면 안 된다.

## 목표 사용자 / 핵심 가치 (초안)

| 구분 | 내용 |
|------|------|
| 목표 사용자 | 개인 크리에이터, 메신저 이모티콘 제작 입문자 |
| 핵심 가치 | 빠른 시도(업로드→입력→생성), 내 결과만 안전하게 보관, 실패 시 재시도 가능한 UX |

## 시스템 구성 (초안)

```
[Browser] Vue 3 + Vite (frontend)
    │  Supabase Auth (anon key, VITE_*)
    │  REST → Express API (VITE_API_BASE_URL)
    ▼
[Express] backend (Node)
    │  Secret key / LLM·생성 API (server-only)
    ▼
[Supabase Cloud]
    ├─ Auth (세션/JWT)
    ├─ Postgres + RLS (user_id 분리)
    └─ Storage (user_id/... 경로)
```

| 레이어 | 기술 | 책임 |
|--------|------|------|
| Frontend | Vue 3, Vite, (vue-router) | UI, Auth UI, 업로드/프리뷰, 상태(loading/error/success) |
| Backend | Express | 프롬프트 정제·이미지 생성·다운로드 프록시, secret API 호출 |
| Supabase | Auth, DB, Storage | 인증, 사용자별 데이터·파일 저장 |
| Dev | Docker Compose | frontend:5173, backend:4000 동시 개발 |

## 실행 환경 (초안)

- **권장:** 프로젝트 루트에서 `docker compose up --build`
- **로컬:** `frontend/`, `backend/` 각각 `npm install` 후 `npm run dev`
- 환경 변수: `.env.example` 참고, 실제 키는 `frontend/.env`, `backend/.env`만 (git 제외)

## 데이터 흐름 개요 (초안)

1. **인증:** 회원가입/로그인 → Supabase 세션 → 보호 라우트 접근
2. **업로드:** 이미지 선택 → Storage(`user_id/...`) + DB 메타 저장
3. **입력·정제:** 이모티콘 텍스트 입력 → Backend LLM으로 프롬프트 정제
4. **생성:** 정제 프롬프트 + 원본 참조 → 이미지 생성 → Storage·DB 저장
5. **활용:** 결과 미리보기 → 다운로드 / 갤러리 목록 → 삭제

## 주요 비기능 요구사항 (초안)

- **보안:** `VITE_*`에는 publishable(anon)만. Secret·service role·LLM 키는 backend-only (`04-security/*` 참고)
- **데이터 분리:** Postgres RLS + Storage `user_id` 경로 (`02-contracts/*`, `04-security/auth-rls-policy.md`)
- **신뢰성:** API 에러 형식 통일 (`02-contracts/error-response.md`), 타임아웃·재시도 정책
- **UX:** 모든 주요 액션에 loading / error / success / empty 상태 (`03-design/design-guide.md`)

## 관련 문서

- MVP 범위: `00-02-mvp-scope.md`
- 사용자 흐름·라우트: `00-03-user-flow.md`
- 14일 계획: `05-roadmap/14-days-checklist.md`
