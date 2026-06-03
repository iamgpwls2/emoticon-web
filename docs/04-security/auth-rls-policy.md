# Auth & RLS Policy

## 목적
- 사용자별 데이터 분리를 **DB 레벨(RLS)** 에서 강제하기 위한 정책을 정리합니다.
- “프론트/백엔드 버그로 타 사용자 데이터가 노출”되는 사고를 구조적으로 방지합니다.

## 작성 시점
- 2026-06-02

## 작성할 내용(목차)
- 목표/위협 모델(간단)
  - 타 사용자 데이터 조회/삭제 시도
  - 임의 `user_id` 주입
- 기본 원칙
  - `auth.uid()`가 유일한 신뢰 기준
  - 테이블별 `user_id` 컬럼 필수(또는 owner FK)
- 테이블별 정책(초안)
  - SELECT: `user_id = auth.uid()`
  - INSERT: `user_id = auth.uid()` 강제
  - UPDATE/DELETE: `user_id = auth.uid()`
- 서비스 역할/secret key 사용 범위
  - backend-only, 최소 권한 원칙
  - 로깅/감사
- 테스트 시나리오
  - 다른 유저로 로그인했을 때 조회/삭제 불가 확인

