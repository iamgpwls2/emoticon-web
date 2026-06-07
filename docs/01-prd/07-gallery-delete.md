# 07. Gallery & Delete (PRD)

## 목적

- 로그인 사용자가 **본인이 생성한 이모티콘**을 갤러리에서 조회합니다.
- Day 9: 목록 조회 API·UI. Day 10: 삭제 (TODO).

## 작성 시점

- 2026-06-02 (초안)
- 2026-06-07 (Day 9 — 갤러리 조회 API·GalleryPage 반영)

## 스택 전제

- **Frontend**: `GalleryPage.vue`, `GalleryGrid.vue`, `EmoticonCard.vue`, `fetchMyGenerations()`
- **Backend**: `GET /api/generations/me` (`requireAuth`)
- **인증**: Supabase Auth Bearer JWT · router `requiresAuth`

---

## Day 9 — 갤러리 조회

### 목적

- `/gallery`에서 내 생성 기록을 카드 grid로 확인
- 생성 페이지(`/generate`)와 별도로 **목록만** 조회 (생성·삭제는 각각 해당 화면/API)

### 접근 권한

| 항목 | 규칙 |
|------|------|
| 대상 | **로그인 사용자만** (`meta: { requiresAuth: true }`) |
| 데이터 범위 | **본인 `user_id` 기록만** — backend `req.user.id` 필터 |
| 클라이언트 | query/body에 `userId` 전달하지 않음 |

### 카드 표시 항목 (`EmoticonCard`)

| UI | API 필드 | 비고 |
|----|----------|------|
| 생성 이미지 | `generatedImageUrl` | 없거나 로드 실패 시 placeholder |
| 감정 | `emotion` | `emotion · motion` 한 줄 |
| 모션 | `motion` | |
| 입력 텍스트 | `inputText` | |
| 생성일 | `createdAt` | `ko-KR` 날짜 형식 (예: `2026년 6월 7일 오후 3:30`) |

> `generating` / `failed` row도 목록에 포함될 수 있음 — 이미지 없으면 상태 안내 문구 표시.

### UX 상태

| 상태 | 조건 | UI |
|------|------|-----|
| **loading** | 최초 fetch 중 | 「이모티콘 목록을 불러오는 중입니다...」 + skeleton grid |
| **empty** | `items.length === 0` | 「아직 생성한 이모티콘이 없습니다.」 + `/generate` 링크 |
| **error** | API 실패 | 오류 메시지 + 「다시 시도」 |
| **success** | 1건 이상 | grid + 「총 N개」 |

### Pagination · 더 보기

| 항목 | MVP 값 |
|------|--------|
| API | `GET /api/generations/me?page=1&limit=12` |
| 기본 `limit` | `12` |
| UI | success 시 `hasMore === true`일 때만 「더 보기」 표시 |
| 동작 | 클릭 시 `page + 1` 요청 → 기존 `items` **append** |
| 숨김 | `hasMore === false`이면 버튼 미표시 |

---

## Day 10 — 삭제 (TODO)

> Day 9 범위 **미포함**. 아래는 예정 항목입니다.

- [ ] 단건 삭제 API (`DELETE /api/generations/:id` 등)
- [ ] 삭제 확인 UI
- [ ] DB row 삭제 + Storage object 삭제 정책
- [ ] 타 사용자 리소스 삭제 방지 (RLS + backend `user_id` 필터)

---

## Day 9 검증 체크리스트

- [ ] `/gallery` — 로그인 사용자만 접근
- [ ] 본인 생성 기록만 표시
- [ ] loading / empty / error / success 4상태
- [ ] 카드: 이미지·감정·모션·텍스트·생성일
- [ ] 모바일 1열 grid
- [ ] 「더 보기」 — `hasMore` 기준 append
- [ ] `POST /api/generations` (생성) 기존 동작 유지

---

## 관련 문서

- API: `02-contracts/api-contract.md` (`GET /api/generations/me`)
- 디자인: `03-design/design-guide.md` (Day 9)
- 보안: `04-security/auth-rls-policy.md` (갤러리 조회)
- DB: `02-contracts/db-schema.md` (`emoticon_generations`)
