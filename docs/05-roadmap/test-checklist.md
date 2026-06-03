# Test Checklist

## 목적
- 기능 구현 후 “깨지지 않았는지”를 최소 비용으로 확인하기 위한 체크리스트를 제공합니다.
- Docker Compose 개발 환경 기준의 확인 절차를 고정합니다.

## 작성 시점
- 2026-06-02

## 작성할 내용(목차)
- 공통
  - `docker compose config` 통과
  - `docker compose up --build`로 기동
  - Frontend(5173) / Backend(4000) 접근 확인
- Auth
  - 회원가입/로그인/로그아웃
  - 보호 라우트 접근 제어
  - 세션 유지/새로고침
- Upload/Preview
  - 파일 제한/오류 처리
  - 업로드 성공 후 프리뷰
- Prompt refine / Generation
  - 로딩/취소/에러/재시도
  - 결과 저장/표시
- Download
  - 권한 확인(본인만)
  - 실패/재시도
- Gallery/Delete
  - 목록/페이징
  - 삭제 일관성(DB/Storage)
- 보안
  - RLS 정책으로 타 사용자 데이터 접근 불가
  - Storage 경로에 user_id 적용 확인
  - secret key가 프론트 번들/로그에 없음

