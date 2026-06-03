# Error Response Contract

## 목적
- Backend API의 에러 응답 형식을 단일 규격으로 고정합니다.
- Frontend는 이 규격을 기반으로 에러 UI(토스트/인라인/리다이렉트)를 구현합니다.

## 작성 시점
- 2026-06-02

## 작성할 내용(목차)
- 공통 에러 스키마(초안)
  - `error.code`
  - `error.message`
  - `error.details` (선택)
  - `request_id` (선택)
- 상태 코드별 규칙
  - 400: validation
  - 401: unauthenticated
  - 403: unauthorized (RLS/권한)
  - 404: not found
  - 409: conflict
  - 429: rate limited
  - 5xx: server error
- 프론트 표시 규칙
  - 사용자에게 보여줄 메시지 vs 로그용 details 구분
- 예시(placeholder)
- Supabase 관련 에러 매핑(선택)

