# 14 Days Checklist

## 목적
- Day 1~14 동안 “무엇을 문서화/보완하고 무엇을 구현할지”를 함께 추적합니다.
- 각 Day의 구현은 반드시 관련 PRD/Contracts/Security 문서를 참고하도록 연결합니다.

## 작성 시점
- 2026-06-02

## 작성할 내용(목차)
- Day별 목표
- Day별 문서 작성/보완 목록
- Day별 구현/테스트 체크
- 문서 링크 맵(PRD ↔ Contracts ↔ Security ↔ Tests)

---

## Day 1 — 개발환경/기반 정리
- **문서**
  - `00-project/00-01-overview.md`: 시스템 구성/실행 환경 요약
  - `04-security/api-key-policy.md`: 키/시크릿 규칙 확정
  - `05-roadmap/test-checklist.md`: compose 기반 스모크 테스트 틀
- **체크**
  - Docker Compose로 frontend/backend 기동 확인
  - `.env.example`은 placeholder만(실제 키 금지)

## Day 2 — Supabase Auth 연결 준비
- **문서**
  - `01-prd/01-auth.md`: Auth UX/보호 라우트/상태 처리 요구사항 확정
  - `02-contracts/api-contract.md`: Auth 관련 엔드포인트/세션 전달 방식 초안
  - `04-security/auth-rls-policy.md`: RLS 기본 원칙 확정(테이블 생기기 전이라도 규칙 먼저)
- **체크**
  - Frontend는 publishable(anon) key만 사용
  - Secret key(service role)는 backend-only

## Day 3 — DB 스키마 초안/정책
- **문서**
  - `02-contracts/db-schema.md`: `generations`, `assets` 등 최소 테이블 초안
  - `04-security/auth-rls-policy.md`: 테이블별 RLS 정책 초안 작성
- **체크**
  - user_id 기반 분리(모든 테이블/쿼리 전제)

## Day 4 — Storage 설계/정책
- **문서**
  - `02-contracts/storage-policy.md`: 버킷/경로(`user_id/...`)/접근 정책 확정
  - `04-security/auth-rls-policy.md`: Storage 연계 테스트 시나리오 보강
- **체크**
  - 업로드/생성 결과 모두 user_id 경로 규칙 준수

## Day 5 — 이미지 업로드/프리뷰 PRD 확정
- **문서**
  - `01-prd/02-image-upload-preview.md`: 제약/오류/재시도/UX 확정
  - `02-contracts/api-contract.md`: 업로드 흐름(직접 업로드 vs 프록시) 결정/명시
  - `02-contracts/error-response.md`: 업로드 에러 규격 보강

## Day 6 — 입력(이모티콘 텍스트) PRD 확정
- **문서**
  - `01-prd/03-emoticon-input.md`: 입력 항목/검증/프리셋(선택) 확정
  - `03-design/design-guide.md`: 폼 UX/검증 패턴 확정

## Day 7 — LLM 프롬프트 정제 PRD/보안 확정
- **문서**
  - `01-prd/04-llm-prompt-refine.md`: 정책/입출력/실패 처리 확정
  - `04-security/api-key-policy.md`: LLM 키는 backend-only 규칙 추가(추후)
  - `02-contracts/api-contract.md`: refine 엔드포인트 스키마 초안

## Day 8 — 이미지 생성 PRD 확정
- **문서**
  - `01-prd/05-image-generation.md`: 중복 요청 방지/타임아웃/결과 저장 확정
  - `02-contracts/api-contract.md`: generation 엔드포인트 스키마 초안

## Day 9 — 에러 응답 규격 고도화
- **문서**
  - `02-contracts/error-response.md`: 코드 체계/표준 메시지/프론트 표시 규칙 확정
- **체크**
  - 모든 주요 액션에 loading/error/success 상태 반영 기준 확인

## Day 10 — 다운로드 PRD/Contracts 확정
- **문서**
  - `01-prd/06-generation-result-download.md`: signed URL vs proxy 결정
  - `02-contracts/api-contract.md`: download 엔드포인트/권한 규칙 반영

## Day 11 — 갤러리/삭제 PRD/정책 확정
- **문서**
  - `01-prd/07-gallery-delete.md`: 목록/삭제/일관성( DB+Storage ) 확정
  - `02-contracts/db-schema.md`: 삭제 시 외래키/캐스케이드 전략 확정(선택)

## Day 12 — 디자인 가이드 확정/정리
- **문서**
  - `03-design/design-guide.md`: App Shell(헤더/네브), 상태 컴포넌트 패턴 확정
  - `00-project/00-03-user-flow.md`: 실제 라우트/보호 라우트 반영

## Day 13 — 보안 점검/정책 검증
- **문서**
  - `04-security/api-key-policy.md`: 실제 운영 규칙(로그/compose) 최종 점검
  - `04-security/auth-rls-policy.md`: RLS/Storage 정책 테스트 케이스 확정
- **체크**
  - repo 전역 검색으로 secret 노출 0 확인

## Day 14 — 출시 전 점검/테스트 체크리스트 완성
- **문서**
  - `05-roadmap/test-checklist.md`: 전체 회귀 테스트 체크리스트 확정
  - `00-project/00-02-mvp-scope.md`: 범위/비범위 최종 확정
- **체크**
  - Docker Compose로 end-to-end 스모크 테스트

