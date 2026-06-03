# API Contract

## 목적
- Frontend ↔ Backend API 인터페이스를 고정합니다.
- Cursor Agent 구현 시 “엔드포인트/요청/응답/에러 형식”을 단일 기준으로 제공합니다.

## 작성 시점
- 2026-06-02

## 작성할 내용(목차)
- 기본 원칙
  - Base URL / 버전 정책
  - 인증(토큰/세션) 전달 방식
  - 공통 응답 헤더/코드
- 엔드포인트 목록(초안)
  - `GET /health`
  - Auth 연동(선택): `GET /me`
  - Upload: presign or proxy 업로드 여부
  - Prompt refine
  - Image generation
  - Gallery list
  - Delete
  - Download
- 요청/응답 스키마
  - 필드 타입/필수 여부
  - 예시 payload (placeholder)
- 상태 코드 규칙
  - 200/201/204, 400/401/403/404/409, 429, 500
- Rate limit / idempotency(선택)
- 에러 응답은 `error-response.md`를 참조

