# Test Checklist

## 목적

- 기능 구현 후 "깨지지 않았는지"를 최소 비용으로 확인하기 위한 체크리스트를 제공합니다.
- Docker Compose 개발 환경 기준의 확인 절차를 고정합니다.

## 작성 시점

- 2026-06-02 (초안)
- 2026-06-07 (Day 11 — 오류 처리·UX·입력 검증 테스트 항목 추가)

---

## 공통

- [ ] `docker compose config` 통과
- [ ] `docker compose up --build`로 기동
- [ ] Frontend(5173) / Backend(4000) 접근 확인

---

## Auth

- [ ] 회원가입 / 로그인 / 로그아웃
- [ ] 보호 라우트 접근 제어
- [ ] 세션 유지 / 새로고침

---

## Upload / Preview

- [ ] PNG·JPG·WEBP 업로드 성공 → 미리보기 표시
- [ ] 잘못된 형식 → 클라이언트 `ErrorMessage` (API 호출 전)
- [ ] 5MB 초과 → 클라이언트 또는 API 413 `ErrorMessage`
- [ ] **업로드 실패 처리** — API/네트워크 오류 시 `ErrorMessage`, 버튼 재활성화
- [ ] 업로드 중 버튼 disabled, 중복 클릭 없음

---

## Prompt refine / Generation

- [ ] 필수 입력 없을 때 구체화 버튼 disabled
- [ ] **LLM 실패 처리** — `ErrorMessage` + fallback, 기존 story/final prompt 유지
- [ ] 구체화 중 버튼 disabled + loading 표시
- [ ] **generation 실패 처리** — `CreatePage` `ErrorMessage`, 이전 결과 유지(재생성 시)
- [ ] 생성 성공 → `GenerationResult` 표시
- [ ] **loading 중 중복 클릭 방지** — 생성 버튼 disabled + `LoadingOverlay` + handler early return
- [ ] 다운로드 / 재생성 실패 → `GenerationResult` `ErrorMessage`

---

## Gallery / Delete

- [ ] 최초 로딩 — 문구 + skeleton grid
- [ ] 빈 상태 — 「아직 생성한 이모티콘이 없습니다.」
- [ ] **gallery 실패 처리** — `ErrorMessage` + 「다시 시도」 버튼
- [ ] 더 보기 중 버튼 disabled
- [ ] 삭제 confirm → 성공 시 카드 제거
- [ ] **delete 실패 처리** — `ErrorMessage`, 카드 유지
- [ ] 삭제 중 해당 카드 버튼 disabled

---

## Day 11 — API 에러 응답 · 보안

각 시나리오에서 응답 body가 `{ message, code, details? }` 형식인지 확인합니다.

| Status | 확인 방법 (예) | 기대 `code` |
|--------|----------------|-------------|
| **400** | `POST /api/generations` body에 `emotion` 누락 | `VALIDATION_ERROR` |
| **401** | Bearer 없이 보호 API 호출 | `UNAUTHORIZED` |
| **403** | (MVP 예약) `HttpError.forbidden()` 적용 엔드포인트 | `FORBIDDEN` |
| **404** | `DELETE /api/generations/{없는-uuid}` | `NOT_FOUND` |
| **500** | LLM key 제거 후 refine 호출 등 | `EXTERNAL_API_ERROR` 또는 `SERVER_ERROR` |

추가 확인:

- [ ] **서버 내부 에러 원문 노출 없음** — 응답에 stack·OpenAI raw·DB message·API key·token 없음
- [ ] 413 업로드 — 5MB 초과 시 `VALIDATION_ERROR` code, 사용자용 size 메시지
- [ ] `originalImageUrl` 비-HTTP URL → 400 (controller 진입 전)
- [ ] Frontend — API `message`가 `ErrorMessage`에 표시, 없으면 feature별 fallback

---

## 보안

- [ ] RLS 정책으로 타 사용자 데이터 접근 불가
- [ ] Storage 경로에 `user_id` 적용 확인
- [ ] secret key가 프론트 번들 / 클라이언트 응답 / 서버 로그(원문)에 없음

---

## 관련 문서

- 에러 규격: `02-contracts/error-response.md`
- UX 기준: `03-design/design-guide.md`
- API 명세: `02-contracts/api-contract.md`
