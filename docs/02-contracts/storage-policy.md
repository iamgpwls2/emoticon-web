# Storage Policy (Supabase Storage)

## 목적
- Storage 버킷, 오브젝트 경로 규칙, 접근 정책을 정의합니다.
- 사용자별 데이터 분리와 “삭제 시 일관성(DB/Storage)”을 보장합니다.

## 작성 시점
- 2026-06-02

## 작성할 내용(목차)
- 버킷 설계(초안)
  - `uploads` (원본)
  - `generated` (생성 결과)
- 경로 규칙(중요)
  - `user_id/{resource_id}/...` 또는 `user_id/{date}/...`
  - user_id는 **auth.uid()** 기준으로만 신뢰
- 접근 정책
  - 본인만 read/write
  - public 노출 여부(기본: private)
  - signed URL 사용 여부
- 파일 검증/제약
  - mime type / size 제한
- 삭제 정책
  - DB 레코드 삭제 시 Storage 오브젝트 삭제 연동
- 로깅/감사(선택)

