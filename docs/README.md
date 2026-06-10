# Docs (개발 문서)

## 목적
- Vue(Frontend) + Express(Backend) + Supabase(Auth/DB/Storage) + Docker Compose 기반의 **구현 기준점**을 문서로 고정합니다.
- Cursor Agent가 기능 구현 시 **PRD(요구사항) → Contracts(인터페이스/정책) → Design/Security → Roadmap/Tests** 순서로 참고할 수 있게 합니다.

## 작성 시점
- 2026-06-02

## 문서 구조
```
docs/
├─ README.md
├─ 00-project/
│  ├─ 00-01-overview.md
│  ├─ 00-02-mvp-scope.md
│  └─ 00-03-user-flow.md
├─ 01-prd/
│  ├─ 01-auth.md
│  ├─ 02-image-upload-preview.md
│  ├─ 03-emoticon-input.md
│  ├─ 04-llm-prompt-refine.md
│  ├─ 05-image-generation.md
│  ├─ 06-generation-result-download.md
│  └─ 07-gallery-delete.md
├─ 02-contracts/
│  ├─ api-contract.md
│  ├─ db-schema.md
│  ├─ storage-policy.md
│  └─ error-response.md
├─ 03-design/
│  ├─ design-guide.md
│  ├─ gallery-page.md
│  ├─ landing-page.md
│  ├─ auth-register-page.md
│  └─ logo-icon.md
├─ 04-security/
│  ├─ auth-rls-policy.md
│  └─ api-key-policy.md
└─ 05-roadmap/
   ├─ 14-days-checklist.md
   └─ test-checklist.md
```

## 권장 읽는 순서
1. `00-project/00-01-overview.md` (전체 개요/아키텍처)
2. `00-project/00-02-mvp-scope.md` (Day 1~14 범위/비범위)
3. `00-project/00-03-user-flow.md` (유저 플로우/상태 전이)
4. `04-security/api-key-policy.md` (키/시크릿 정책 — 가장 먼저 고정)
5. `04-security/auth-rls-policy.md` (RLS/사용자별 데이터 분리 기준)
6. `02-contracts/*` (API/DB/Storage/에러 계약)
7. `01-prd/*` (기능별 PRD)
8. `03-design/design-guide.md` (UI/UX 기준)
9. `05-roadmap/14-days-checklist.md` → `05-roadmap/test-checklist.md`

## 핵심 기준(반드시 준수)
- **사용자별 데이터 분리**: DB는 RLS로 강제, Storage는 `user_id` 기반 경로 + 정책으로 강제
- **API key 비노출**: `VITE_*`는 브라우저 번들 노출 가능. Secret key/service role은 backend-only
- **상태 처리**: 모든 주요 액션(업로드/생성/다운로드/삭제)은 loading/error/success 상태를 UI에 명확히 반영

