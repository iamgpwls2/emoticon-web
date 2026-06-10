# Gallery Page Design

## 목적

- `/gallery` 갤러리 화면의 **Explorer 레이아웃**(사이드바 + 메인 패널)·폴더 UX·카드 UI·반응형 기준을 정의합니다.
- 기능 로직(PRD·API)은 [`01-prd/08-gallery-collections.md`](../01-prd/08-gallery-collections.md)를 따르고, 본 문서는 **화면 구조·시각·상태·인터랙션**에 집중합니다.

## 작성 시점

- 2026-06-10 (사이드바 폴더·즐겨찾기·드래그 앤 드롭·카드 해시태그 반영)

## 구현 파일

| 구분 | 경로 |
|------|------|
| 페이지 | `frontend/src/pages/GalleryPage.vue` |
| 사이드바 | `frontend/src/components/GallerySidebar.vue` |
| 그리드 | `frontend/src/components/GalleryGrid.vue` |
| 카드 | `frontend/src/components/EmoticonCard.vue` |
| 폴더 생성 모달 | `frontend/src/components/FolderCreateModal.vue` |
| 토스트 | `frontend/src/components/GalleryToast.vue` |
| 즐겨찾기 | `frontend/src/composables/useFavorites.js` |
| 폴더 API 클라이언트 | `frontend/src/services/collection.service.js` |
| 목록 API 클라이언트 | `frontend/src/services/generation.service.js` |

> 스타일은 각 Vue SFC의 `<style scoped>`에 정의되어 있습니다. 전역 `main.css`가 아닌 **컴포넌트 스코프 CSS** 기준입니다.

---

## 페이지 구조

```txt
GalleryPage (.gallery-page.gallery-page--explorer)
└─ .gallery-page__layout
     ├─ GallerySidebar (.gallery-page__sidebar--desktop)   ← Desktop only
     └─ .gallery-page__main
          ├─ .gallery-page__mobile-folders (폴더 chip 가로 스크롤)  ← Mobile/Tablet only
          └─ .gallery-page__panel
               ├─ header (.gallery-page__main-header)
               │    ├─ .gallery-page__folder-info (제목·개수·설명)
               │    └─ .gallery-page__controls (선택·정렬·보기·폴더 삭제)
               ├─ ErrorMessage (폴더 액션 오류)
               ├─ .gallery-page__selection-hint (선택 모드 안내)
               ├─ 상태 영역 (loading / error / empty / success)
               └─ GalleryGrid + 항목 수 + [더 보기]
├─ FolderCreateModal (Teleport → body)
└─ GalleryToast (fixed, 우하단)
```

### 진입 시 기본 상태

| 항목 | 값 |
|------|-----|
| 기본 선택 폴더 | **전체 이미지** (`selectedFolderId = 'all'`) |
| 보기 모드 | `grid` |
| 정렬 | `newest` (최신순) |
| 진입 토스트 | 「드래그 & 드롭으로 폴더를 이동할 수 있어요!」(3초) |

---

## 색상 · 톤

갤러리는 랜딩과 동일한 **lavender / purple** 계열을 사용합니다.

| 용도 | 색상 |
|------|------|
| 페이지 배경 | `#f7f4ff` |
| 패널·사이드바 배경 | `#ffffff` |
| 패널·카드 보더 | `#e8e2f8`, `#ece8f7` |
| 주요 액센트 | `#6d3df2` |
| 액센트 배경 | `#f2ecff`, `#f1ebff`, `#fbf8ff` |
| 보조 텍스트 | `#7c86a3` |
| 본문 텍스트 | `#111827` |
| 위험(삭제) | `#ff4d6d` / 배경 `#fff5f7` / 보더 `#ffc9d3` |
| 카드 그림자 | `rgba(80, 60, 160, 0.08~0.14)` |

### 카드 해시태그

| 태그 | 배경 | 글자 | 표시 조건 |
|------|------|------|-----------|
| PNG | `#f1ebff` | `#6d3df2` | 모든 카드 |
| 폴더명 | `#fff4cc` | `#9a6b00` | `collectionId`가 있는 이미지만 |

---

## 레이아웃 · 반응형

### Desktop (`min-width: 961px`)

| 항목 | 값 |
|------|-----|
| 페이지 padding | `24px 20px 40px` |
| layout grid | `minmax(280px, 300px)` + `minmax(0, 1fr)` |
| layout max-width | `1280px`, 가운데 정렬 |
| layout gap | `20px` |
| 사이드바 | 항상 표시 |
| 모바일 폴더 chip | `display: none` |

### Tablet / Mobile (`max-width: 960px`)

| 항목 | 값 |
|------|-----|
| layout | 1열 (사이드바 숨김) |
| `.gallery-page__mobile-folders` | 가로 스크롤 chip 행 표시 |
| 폴더 chip | pill (`border-radius: 999px`), 활성 시 보라 배경 |

### Small Mobile (`max-width: 640px`)

| 항목 | 값 |
|------|-----|
| 페이지 padding | `16px 12px 28px` |
| 패널 padding | `16px` |
| 컨트롤 버튼·정렬 select | `width: 100%` |
| 보기 전환 토글 | `width: 100%`, 버튼 50%씩 |

---

## GallerySidebar (Desktop)

### 섹션 구성

```txt
aside.gallery-sidebar
├─ [+ 폴더 생성하기] (primary outline 버튼)
├─ 섹션 「내 폴더」
│    ├─ 🖼️ 전체 이미지
│    ├─ ⭐ 즐겨찾기
│    └─ 📂 미분류
└─ 섹션 「폴더」 (+ 미니 추가 버튼)
     ├─ 사용자 폴더 목록 (📁 + 이름 + 개수 + ⋮ 메뉴)
     └─ empty: 「만든 폴더가 없습니다.」
```

### 폴더 항목 상태

| 상태 | 시각 |
|------|------|
| 기본 | 투명 배경, `#111827` 텍스트 |
| hover | 배경 `#f2ecff` |
| active (선택) | 배경 `#f2ecff`, 보더 `#cbb8ff`, 텍스트 `#6d3df2` |
| drop highlight (드래그 중) | 배경 `#efe7ff`, 점선 보더 `#6d3df2` |

### 드롭 대상 규칙

| 폴더 | 드롭 허용 |
|------|-----------|
| 전체 이미지 | ✗ |
| 즐겨찾기 | ✗ |
| 미분류 | ✓ |
| 사용자 폴더 | ✓ |

### 폴더 메뉴 (⋮)

- `window.prompt` 기반 MVP — 이름 변경(새 이름 입력) · 삭제(`삭제` 입력)
- 커스텀 폴더에만 표시

---

## 메인 패널 헤더

### 폴더 정보 영역

| 요소 | 규칙 |
|------|------|
| 아이콘 | 📁 (`aria-hidden`) |
| 제목 | `h1`, `clamp(24px, 3vw, 32px)`, `font-weight: 800` |
| 개수 pill | `N개`, 배경 `#f1ebff` |
| 설명 | 사용자 폴더: API `description` 또는 「설명 없음」 |
| 이름 수정 | 사용자 폴더만 — ✎ 버튼 → 인라인 input → 저장/취소 |

### 컨트롤 영역

| 컨트롤 | 라벨·동작 |
|--------|-----------|
| 선택 | 「선택」 / 활성 시 「선택 취소」 |
| 정렬 | select — 최신순 · 오래된순 · 이름순 |
| 보기 | ▦ 그리드 / ☰ 리스트 (`role="group"`) |
| 폴더 삭제 | 사용자 폴더 선택 시만, danger 스타일 |

---

## GalleryGrid

### 그리드 보기 (`viewMode = 'grid'`)

| 뷰포트 | 열 수 |
|--------|------|
| `< 640px` | 1 |
| `≥ 640px` | 2 |
| `≥ 900px` | 3 |
| `≥ 1200px` | 4 |

- gap: `18px`
- loading: shimmer skeleton **8개** (`skeletonCount` 기본값)

### 리스트 보기 (`viewMode = 'list'`)

- `flex-direction: column`, gap `14px`
- `EmoticonCard` — `emoticon-card--list`: 미리보기 `120px` 정사각형 + 본문 가로 배치

---

## EmoticonCard

### 본문 정보 (위 → 아래)

| 영역 | 내용 |
|------|------|
| 미리보기 | `aspect-ratio: 1`, `object-fit: contain`, lazy load |
| 메타 | `emotion · motion` (보라, 15px bold) + 즐겨찾기 ★/☆ |
| 입력 텍스트 | `inputText` |
| 날짜 | `YYYY.MM.DD HH:mm` (`<time datetime>`) |
| 해시태그 | PNG + (있으면) 폴더명 |

### 액션 (선택 모드 OFF)

| 버튼 | 라벨 | 스타일 |
|------|------|--------|
| 저장 | 「저장」 / 「저장 중...」 | 보라 배경 `#f1ebff` |
| 삭제 | 「삭제」 / 「삭제 중...」 | 빨간 outline |

- 선택 모드 ON: 액션 영역 **숨김**, 좌상단 체크박스 표시
- 삭제 전 `window.confirm` 필수

### 카드 인터랙션 상태

| 상태 | 시각·동작 |
|------|-----------|
| hover | `translateY(-4px)`, 그림자 강화 |
| selected | 보라 보더 + `::after` 오버레이 |
| moving | `opacity: 0.65` |
| dragging | `opacity: 0.6`, `scale(0.96)` |
| draggable | `cursor: grab` (이미지 URL 있을 때) |

---

## FolderCreateModal

| 항목 | 값 |
|------|-----|
| 표시 | `Teleport to="body"`, `z-index: 130` |
| 백드롭 | `rgba(17,24,39,0.35)` + `blur(4px)` |
| 패널 너비 | `min(420px, 100%)` |
| 입력 | 최대 50자, 중복 이름 인라인 오류 |
| 버튼 | 취소(ghost) · 생성(primary) / 「만드는 중...」 |
| 닫기 | ESC·백드롭 클릭 (loading 중 비활성) |
| 포커스 | 열릴 때 입력 필드 자동 focus |

---

## GalleryToast

| 항목 | 값 |
|------|-----|
| 위치 | fixed, `right/bottom: 24px` (모바일 `16px`, 좌우 full-width) |
| z-index | `120` |
| 지속 | 3초 (`TOAST_DURATION_MS`) |
| 접근성 | `role="status"`, `aria-live="polite"` |
| 애니메이션 | fade + `translateY(12px)` |

---

## 화면 상태 (상태 전이)

```txt
onMounted
├─ loadCollections + loadImages
└─ 진입 토스트

본문
├─ isInitialLoading → 로딩 문구 + skeleton grid
├─ errorMessage     → ErrorMessage + [다시 시도]
├─ !hasAnyImages    → 전역 empty + /generate 링크
├─ isEmpty (폴더별) → 폴더별 empty 문구
└─ isSuccess        → GalleryGrid + 항목 수 + [더 보기]
```

### Empty 문구

| 조건 | 문구 |
|------|------|
| 전역 (생성 0건) | 「아직 생성한 이모티콘이 없습니다.」 |
| 즐겨찾기 | 「즐겨찾기한 이미지가 없습니다…」 |
| 미분류 | 「미분류 이미지가 없습니다.」 |
| 사용자 폴더 | 「이 폴더가 비어 있습니다…」 |

### 오류 표시

| 종류 | 위치 | 컴포넌트 |
|------|------|----------|
| 목록 로드 실패 | 패널 중앙 | `ErrorMessage` + 재시도 |
| 삭제 실패 | grid 상단 | `ErrorMessage` |
| 폴더 액션 실패 | 헤더 아래 | `ErrorMessage` |
| 다운로드 실패 | 카드 하단 | `role="alert"` 문구 |

---

## 주요 인터랙션

### 폴더 선택

- 사이드바(Desktop) 또는 chip(Mobile) 클릭 → `selectedFolderId` 갱신 → 목록 재조회
- API: `collectionId` 생략(전체) · `uncategorized` · `uuid`

### 즐겨찾기

- 카드 ★ 토글 → `localStorage` (`useFavorites`)
- 「즐겨찾기」 폴더는 클라이언트 필터 (서버 쿼리 없음)
- 즐겨찾기 폴더에서는 **더 보기** 숨김

### 이미지 이동

| 방식 | 흐름 |
|------|------|
| 드래그 앤 드롭 | 카드 drag → 사이드바/chip 폴더 drop |
| 선택 모드 | 선택 → 사이드바 폴더 drop (다중) |

- 드래그 MIME: `application/x-emoticon-ids`
- 이동 중 카드: `moving` 상태, 액션 비활성

### 페이지네이션

| 항목 | 값 |
|------|-----|
| page size | 12 |
| UI | 「더 보기」 — `hasMore`일 때만 |
| 즐겨찾기 | pagination 미사용 |

---

## 접근성 (MVP)

| 요소 | 처리 |
|------|------|
| 사이드바 | `aria-label="폴더 목록"` |
| 모바일 chip | `aria-label="폴더 선택"` |
| 보기 전환 | `aria-label="보기 전환"`, 각 버튼 `aria-label` |
| 즐겨찾기 | `aria-pressed`, `aria-label` |
| 로딩 | `aria-busy`, `aria-live="polite"` |
| 모달 | `role="dialog"`, `aria-modal`, `aria-labelledby` |
| 그리드 로딩 | skeleton `aria-hidden="true"` |

---

## 관련 문서

- PRD: [`01-prd/07-gallery-delete.md`](../01-prd/07-gallery-delete.md), [`01-prd/08-gallery-collections.md`](../01-prd/08-gallery-collections.md)
- API: [`02-contracts/api-contract.md`](../02-contracts/api-contract.md)
- 공통 UI 기준: [`design-guide.md`](./design-guide.md)
- 랜딩 톤·헤더: [`landing-page.md`](./landing-page.md)
