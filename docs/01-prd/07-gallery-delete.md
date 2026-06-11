# 07. Gallery & Delete (PRD)

## 목적

- 로그인 사용자가 **본인이 생성한 이모티콘**을 갤러리에서 조회·삭제합니다.
- Day 9: 목록 조회 API·UI. Day 10: 삭제 API·갤러리 삭제 UI.

## 작성 시점

- 2026-06-02 (초안)
- 2026-06-07 (Day 9 — 갤러리 조회 API·GalleryPage 반영)
- 2026-06-07 (Day 10 — 삭제 API·EmoticonCard 삭제 UI 반영)
- 2026-06-11 (즐겨찾기 DB 연동 — `is_favorite` · `PATCH /api/generations/:id/favorite`)

## 스택 전제

- **Frontend**: `GalleryPage.vue`, `GalleryGrid.vue`, `EmoticonCard.vue`, `fetchMyGenerations()`, `deleteGeneration()`
- **Backend**: `GET /api/generations/me`, `DELETE /api/generations/:id` (`requireAuth`)
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

## Day 10 — 삭제

### 목적

- 갤러리 카드에서 **본인 이모티콘**을 삭제
- DB row 삭제 + `generated-emoticons` Storage object 삭제
- **original upload image**(`user-uploads`)는 MVP에서 **삭제하지 않음**

### API

| 항목 | 값 |
|------|-----|
| Endpoint | `DELETE /api/generations/:id` |
| 인증 | `Authorization: Bearer {access_token}` 필수 |
| 성공 | `{ "success": true }` |
| 소유권 | `id` + `req.user.id` 일치 row만 삭제 — 타인·미존재 id → `404` |

상세: `02-contracts/api-contract.md`

### 카드 삭제 UI (`EmoticonCard`)

| 항목 | 요구사항 |
|------|----------|
| 버튼 | 카드 하단 **삭제** 버튼 (danger 스타일 — 빨간 테두리·배경) |
| 확인 | 삭제 전 `window.confirm` — 「이 이모티콘을 삭제할까요? 삭제하면 복구할 수 없습니다.」 |
| 삭제 중 | **해당 카드** 삭제 버튼만 `disabled`, 라벨 「삭제 중...」 |
| 성공 | `GalleryPage` `items`에서 해당 id **즉시 제거** (전체 재조회 없음), `total` 1 감소 |
| 실패 | 갤러리 grid **상단**에 오류 메시지 (`ErrorMessage`) — grid·더 보기 유지 |
| 마지막 1건 삭제 | empty 상태 UI로 전환 |

### 데이터 흐름

```txt
[삭제 클릭] → window.confirm
  → 확인 → deleteGeneration(id) API
    → 성공: items.filter (프론트 상태만 갱신)
    → 실패: deleteErrorMessage 표시
```

### Storage 정책 (MVP)

| 대상 | Day 10 |
|------|--------|
| `generated-emoticons` | **삭제** — `generated_image_url`에서 object path 추출 후 backend service role |
| `user-uploads` (original) | **유지** — MVP에서 삭제하지 않음 |

상세: `02-contracts/storage-policy.md`

### 구현 경로

| 구분 | 경로 |
|------|------|
| Frontend Service | `frontend/src/services/generation.service.js` → `deleteGeneration()` |
| Frontend Page | `frontend/src/pages/GalleryPage.vue` → `handleDelete()` |
| Frontend Card | `frontend/src/components/EmoticonCard.vue` |
| Frontend Grid | `frontend/src/components/GalleryGrid.vue` — `deletingId` 전달 |
| Backend route | `backend/src/routes/generation.routes.js` — `DELETE /:id` (`GET /me` **뒤**) |
| Backend controller | `generation.controller.js` → `deleteGeneration` |
| Backend service | `generation.service.js` → `deleteMyGeneration` |
| Storage | `storage.service.js` → `deleteGeneratedEmoticonByUrl` |

---

## 즐겨찾기 (DB 연동)

### 목적

- 갤러리 카드 **별표(☆/★)** 와 왼쪽 사이드바 **즐겨찾기** 메뉴 UI는 유지합니다.
- 즐겨찾기 상태는 `emoticon_generations.is_favorite`에 저장하며, **localStorage는 사용하지 않습니다.**

### API

| 항목 | 값 |
|------|-----|
| 목록 | `GET /api/generations/me?favorite=true` — `isFavorite: true` 항목만 |
| 변경 | `PATCH /api/generations/:id/favorite` — body `{ "isFavorite": boolean }` |
| 인증 | `Authorization: Bearer {access_token}` 필수 |
| 소유권 | `id` + `req.user.id` + `saved_to_gallery = true` 일치 row만 갱신 — 타인·미존재 → `404` |

### 카드 즐겨찾기 UI (`EmoticonCard`)

| 항목 | 요구사항 |
|------|----------|
| 버튼 | 카드 메타 영역 **별표** — 비활성 `☆` · 활성 `★` |
| 클릭 | `toggle-favorite` 이벤트 → `GalleryPage.handleToggleFavorite` |
| 요청 중 | 해당 카드 별표 버튼 `disabled` · `aria-busy` |
| 성공 | `item.isFavorite` 갱신 · 추가 시 토스트 「즐겨찾기에 추가했습니다.」 |
| 실패 | 별표 상태 **이전 값으로 롤백** · 토스트로 오류 메시지 |
| 즐겨찾기 폴더 | 해제 시 목록에서 해당 카드 **즉시 제거** |

### 사이드바 · 모바일 칩

| 항목 | 동작 |
|------|------|
| 즐겨찾기 메뉴 | `favoriteCount` — 서버 `GET ...?favorite=true&limit=1`의 `total` 기준 |
| 폴더 선택 | `favorite` 폴더 선택 시 API `favorite=true`로 목록 fetch (클라이언트 필터 아님) |
| 더 보기 | 즐겨찾기 폴더에서도 `hasMore` 기준 pagination 지원 |

### 데이터 흐름

```txt
[별 클릭] → optimistic UI (isFavorite 토글)
  → PATCH /api/generations/:id/favorite
    → 성공: 서버 응답 반영 · favoriteCount 갱신
    → 실패: isFavorite 롤백 · 토스트 오류
```

### 구현 경로

| 구분 | 경로 |
|------|------|
| DB | `supabase/migrations/20260611_01_add_is_favorite_to_generations.sql` |
| Frontend composable | `frontend/src/composables/useFavorites.js` |
| Frontend service | `generation.service.js` → `patchGenerationFavorite()`, `fetchMyGenerations({ favorite })` |
| Backend service | `generation.service.js` → `updateGenerationFavorite`, `listMyGenerations({ favorite })` |

---

## Day 9 검증 체크리스트

- [ ] `/gallery` — 로그인 사용자만 접근
- [ ] 본인 생성 기록만 표시
- [ ] loading / empty / error / success 4상태
- [ ] 카드: 이미지·감정·모션·텍스트·생성일
- [ ] 모바일 1열 grid
- [ ] 「더 보기」 — `hasMore` 기준 append
- [ ] `POST /api/generations` (생성) 기존 동작 유지

## Day 10 검증 체크리스트

- [ ] 카드 **삭제** 버튼 표시 (danger 스타일)
- [ ] 삭제 전 confirm 표시 · 취소 시 유지
- [ ] 삭제 중 해당 카드 버튼만 disabled
- [ ] 삭제 성공 시 카드 즉시 제거 · `총 N개` 감소
- [ ] 삭제 실패 시 상단 오류 메시지 · grid 유지
- [ ] 마지막 1건 삭제 → empty 상태
- [ ] 타 사용자 generation id → `404`
- [ ] `GET /api/generations/me` · 「더 보기」 기존 동작 유지
- [ ] 모바일에서 삭제 버튼 레이아웃 정상

## 즐겨찾기 검증 체크리스트

- [ ] 별 클릭 시 `PATCH /api/generations/:id/favorite` 호출 · body에 `userId` 없음
- [ ] 요청 중 해당 카드 별표만 disabled
- [ ] 성공 시 새로고침 후에도 즐겨찾기 상태 유지 (DB)
- [ ] 실패 시 별표 이전 상태로 복원 · 오류 토스트
- [ ] 즐겨찾기 폴더 — `?favorite=true` 목록만 표시
- [ ] 즐겨찾기 폴더에서 해제 시 카드 즉시 제거
- [ ] 사이드바·모바일 칩 즐겨찾기 개수 표시
- [ ] 타 사용자 generation id → `404`
- [ ] localStorage `emoticon-web:favorite-ids` 미사용

---

## 관련 문서

- API: `02-contracts/api-contract.md` (`GET /api/generations/me`, `PATCH /api/generations/:id/favorite`, `DELETE /api/generations/:id`)
- Storage: `02-contracts/storage-policy.md`
- 디자인: `03-design/design-guide.md` (Day 9)
- 보안: `04-security/auth-rls-policy.md` (갤러리 조회·삭제)
- DB: `02-contracts/db-schema.md` (`emoticon_generations`)
