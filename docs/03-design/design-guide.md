# Design Guide

## 목적

- UI/UX 디자인 기준(컴포넌트, 상태, 접근성)을 정의합니다.
- 기능 PRD 구현 시 일관된 화면 품질을 보장합니다.

## 작성 시점

- 2026-06-02 (초안)
- 2026-06-03 (Day 5 — 생성 페이지 입력 UI MVP 기준 반영)
- 2026-06-06 (Day 8 — 로딩·결과·다운로드 UI 기준 반영)
- 2026-06-07 (Day 9 — 갤러리 UI 기준 반영)
- 2026-06-07 (Day 11 — ErrorMessage variant·async 상태·empty/loading 기준 반영)
- 2026-06-08 (랜딩 페이지 · 공통 헤더 · 회원가입 UI · 로고 아이콘 반영)

> 확정 디자인이 아닌 **MVP 기준**입니다. 이후 단계에서 시각 언어를 보강할 수 있습니다.

---

## 디자인 원칙 (MVP)

- **간결함** — 한 화면에 한 가지 흐름(업로드 → 입력 → 다음 단계)
- **명확한 피드백** — 오류·disabled·글자 수를 즉시 표시
- **복구 가능** — 검증 실패 후 값 수정·재시도 가능

---

## 전역 앱 셸 · 랜딩 톤 (2026-06-08)

구현: `App.vue`, `AppHeader.vue`, `frontend/src/assets/main.css`

마케팅·인증 화면은 **white / lavender / purple** 톤을 공유합니다. 생성·갤러리 등 기존 MVP 화면은 `style.css` 토큰(`--accent` 등)을 그대로 사용합니다.

### 1. 공통 레이아웃

```txt
.app-shell
├─ AppHeader (전 페이지 공통)
└─ .app-main
     └─ router-view (HomePage / RegisterPage / CreatePage …)
```

- `app-shell`: `overflow-x: hidden` — 모바일 가로 스크롤 방지
- 헤더·랜딩 본문·푸터는 **동일한 중앙 기준선** (`--landing-shell-max`, `--landing-shell-gutter`) 사용

### 2. 랜딩·헤더 공통 토큰

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--landing-shell-max` | `1240px` | 헤더 inner, hero/how/example shell, footer inner 최대 너비 |
| `--landing-shell-gutter` | `48px` | 좌우 여백 (양쪽 합 `96px`) |
| 메인 보라 | `#7c3aed`, `#8b5cf6`, `#6d28d9` | CTA gradient, 강조 텍스트 |
| 제목 색 | `#1e2a4a`, `#17213f`, `#111827` | Hero·인증 제목 |
| 보조 텍스트 | `#4a5578`, `#667085` | 설명·푸터 |
| 보더 | `#ebe6ff`, `#e4defa`, `#ececf0` | 카드·입력·헤더 하단 |
| 그림자 | `rgba(88, 74, 150, 0.08~0.12)` | 랜딩 카드 |
| 인증 그림자 | `rgba(94, 70, 140, 0.12)` | 회원가입 form card |

스타일 파일 분리:

| 영역 | 파일 |
|------|------|
| Header, HomePage (`.home-page`) | `frontend/src/assets/main.css` |
| 회원가입 전용 (`.auth-page--register`) | `frontend/src/style.css` |
| 생성·갤러리 MVP | `frontend/src/style.css` (기존 `.auth-page` 등) |

### 3. 공통 헤더 CTA (비로그인)

| 위치 | 라벨 | 스타일 | 이동 |
|------|------|--------|------|
| 오른쪽 1 | 로그인 | `app-header__btn--secondary` (outline) | `/login` |
| 오른쪽 2 | 회원가입 | `app-header__btn--primary` (보라 gradient) | `/register` (로그인 시 `/generate`) |

로고·아이콘 상세: [`logo-icon.md`](./logo-icon.md)

랜딩 페이지 상세: [`landing-page.md`](./landing-page.md)

회원가입 페이지 상세: [`auth-register-page.md`](./auth-register-page.md)

---

## Day 5 — 생성 페이지 입력 UI

구현: `CreatePage.vue`, `PromptForm.vue`, `ErrorMessage.vue`, `ImageUploader.vue`

### 1. 생성 페이지 입력 UI 구조

```txt
[페이지 제목 + 안내 문구]
├─ 1. 이미지 업로드
│    └ ImageUploader
├─ 2. 이모티콘 설정
│    └ PromptForm (감정 / 모션 / 텍스트 + 필드별 ErrorMessage)
└─ [다음 단계] 영역
     ├ ErrorMessage (이미지 미업로드 안내, 버튼 위)
     └ [다음 단계] 버튼 (미완료 시 disabled, 클릭 불가)
```

- 카드형 단일 컬럼 레이아웃 (`create-page__card`)
- 섹션 번호 제목(`1.`, `2.`)으로 단계 구분

### 2. Form layout 기준

| 항목 | MVP 값 |
|------|--------|
| 컨테이너 최대 너비 | `480px` |
| 페이지 패딩 | `32px 20px` (모바일 `24px 16px`) |
| 섹션 간격 | `28px` (모바일 `24px`) |
| 필드 간격 | `20px` |
| 라벨 ↔ 컨트롤 | `8px` |
| 정렬 | 좌측 정렬, 컨테이너 가운데 배치 |

### 3. 감정 / 모션 select UI 기준

- 네이티브 `<select>` 사용
- 라벨: `감정`, `모션` (14px, medium)
- 첫 옵션: placeholder (`감정을 선택해 주세요` / `모션을 선택해 주세요`), `value=""` + `disabled`
- 컨트롤: `min-height 44px`, `border-radius 8px`, 전체 너비 `100%`
- 포커스: accent 테두리 + 연한 accent 배경 ring (`focus-visible`)

### 4. 텍스트 입력 UI 기준

- `<input type="text">` 단일 행
- 라벨: `이모티콘 텍스트`
- placeholder: `이모티콘에 넣을 텍스트`
- `maxlength=30` — 초과 입력 차단
- select·input과 **동일한** `.prompt-form__control` 스타일

### 5. 글자 수 표시 기준

- 위치: 텍스트 라벨 **오른쪽** (`label-row`)
- 형식: `{현재글자수}/30` (예: `0/30`)
- `aria-live="polite"` — 스크린리더 갱신
- 스타일: 13px, 보조 텍스트 색(`--text`)

### 6. Error 상태 표시 기준

| 위치 | 트리거 | 컴포넌트 |
|------|--------|----------|
| 감정·모션·텍스트 | 필드 `blur` / `change` / `input` 후 (`touched`) | 필드 바로 아래 `ErrorMessage` |
| 이미지 미업로드 | 프롬프트 입력 시작 후, 이미지 없음 | **다음 단계 버튼 위** `ErrorMessage` |

- 컨트롤: `aria-invalid="true"` 시 테두리 붉은 톤
- 메시지: `role="alert"`, 연한 빨간 배경 + 테두리
- 값이 유효해지면 메시지 **즉시 제거**
- **disabled 버튼 클릭으로 오류를 표시하지 않음**

### 7. Disabled 버튼 기준

**대상:** `다음 단계` 버튼

| 상태 | 조건 | 동작 |
|------|------|------|
| disabled | 이미지·감정·모션·텍스트 중 하나라도 미완료 | 클릭 불가, 오류는 필드·버튼 위 안내로 표시 |
| enabled | 네 항목 모두 충족 | 클릭 시 다음 단계 처리 |

disabled 시각 구분 (MVP):

- `opacity: 0.55`
- 배경 `--social-bg`, 텍스트 `--text`, 테두리 `--border`
- `cursor: not-allowed`, hover 효과 없음

enabled 시: accent 배경/텍스트, hover 시 테두리·shadow

### 8. 모바일 반응형 기준

브레이크포인트: **`max-width: 480px`**

| 항목 | 동작 |
|------|------|
| 컨테이너 | `width: 100%`, `max-width: 100%` |
| 제목 | `36px` → `28px` |
| 섹션 제목 | `18px` → `16px` |
| input/select | `font-size: 16px` (iOS 줌 방지) |
| 패딩 | 페이지·컨트롤 소폭 축소 |
| 텍스트 라벨 행 | 필요 시 `flex-wrap` |

---

## Day 8 — 로딩 · 생성 결과 · 다운로드 UI

구현: `LoadingOverlay.vue`, `GenerationResult.vue`, `CreatePage.vue`, `downloadImage.js`

### 1. LoadingOverlay 스타일 기준

| 항목 | MVP 값 |
|------|--------|
| 배경 | `rgba(8, 6, 13, 0.35)` — dark: `rgba(0, 0, 0, 0.45)` |
| z-index | `1000` |
| 패널 | `--bg`, `--border`, `border-radius 12px`, `box-shadow: var(--shadow)` |
| 스피너 | `36×36px`, accent top border, `0.8s` 회전 |
| 메시지 | `15px`, `--text-h`, `word-break: keep-all` |
| 전환 | fade `0.2s ease` |

**모바일 (`max-width: 480px`):** 하단 정렬, 패널 row(스피너+메시지), 배경 opacity 축소

### 2. GenerationResult 카드 스타일 기준

| 항목 | MVP 값 |
|------|--------|
| 섹션 제목 | `18px` medium, `--text-h` (모바일 `16px`) |
| 카드 배경 | `--code-bg` |
| 카드 테두리 | `1px solid var(--border)`, `border-radius 12px` |
| 카드 패딩 | `16px` (모바일 `12px`) |
| 미리보기 wrap | `--bg` 배경, `border-radius 8px`, `overflow: hidden` |
| 힌트 박스 | `--bg` 배경, `13px` (모바일 `12px`) |

### 3. 이미지 비교 UI (desktop / mobile)

| 뷰포트 | grid |
|--------|------|
| `min-width: 641px` | `grid-template-columns: 1fr 1fr`, gap `20px` |
| 그 외 | `1fr` 단일 열, gap `16px` |

- 라벨: `14px` medium — 「원본 이미지」「생성 이미지」
- 이미지: `width 100%`, `object-fit: contain`, `max-height: min(50vh, 320px)`
- 빈 상태: `--social-bg` 배경, `14px`, 가운데 정렬

### 4. 버튼 disabled 상태 기준

**공통 disabled 시각 (MVP):**

- `opacity: 0.55`
- `cursor: not-allowed`
- 배경 `--social-bg`, 텍스트 `--text`, 테두리 `--border`
- hover·shadow 없음

| 버튼 | enabled 스타일 | disabled 조건 |
|------|----------------|---------------|
| **PNG 다운로드** | accent 배경 (`--accent-bg` / `--accent`) | URL 없음 · `isGenerating` · 다운로드 중 · 생성 이미지 로드 실패 |
| **다시 생성하기** | outline (`--bg` + `--border`) | `isGenerating` · `canRegenerate` false |
| **이미지 생성** (`CreatePage`) | accent (Day 5와 동일) | 폼 미완 · `finalPrompt` 없음 · `isGenerating` |

- 터치 타겟: `min-height 44px`, 전체 너비 `100%`
- 포커스: `outline 2px solid var(--accent)`, `outline-offset 2px`

### 5. 오류 메시지 표시 기준

| 위치 | 컴포넌트 | 스타일 |
|------|----------|--------|
| 생성 API 실패 | `CreatePage` → `ErrorMessage` | Day 5 `.error-message` |
| 재생성·다운로드 실패 | `GenerationResult` → `.generation-result__action-error` | 동일 톤 (`#dc2626`, 연한 빨간 배경) |
| 생성 이미지 로드 실패 | `.generation-result__image-error` | `role="alert"`, 비교 영역 인라인 |
| 원본 로드 실패 | `.generation-result__empty-state` | 보조 텍스트 톤 (alert 아님) |

- `ErrorMessage`: `role="alert"`, `14px` (모바일 `13px`)
- 액션 오류는 해당 버튼 **바로 아래** 배치

### 6. 다크 테마 UI 원칙

전역: `frontend/src/style.css` — `color-scheme: light dark`, `prefers-color-scheme: dark` CSS 변수

| 원칙 | 적용 |
|------|------|
| 하드코드 색 최소화 | 레이아웃·카드·버튼은 `--bg`, `--border`, `--text-h`, `--accent` 등 변수 사용 |
| 오류 색 고정 | `#dc2626` + `rgba(220, 38, 38, 0.08)` — light/dark 공통 가독성 |
| 오버레이 | dark에서 배경 opacity 상향 (`0.45` / mobile `0.3`) |
| 대비 | 제목·라벨 `--text-h`, 본문·힌트 `--text` |
| accent | dark: `--accent: #c084fc`, `--accent-bg` opacity 조정 |

> 새 Day 8 컴포넌트는 `#fff` / `#000` 직접 지정 없이 기존 토큰을 재사용합니다.

---

## Day 9 — 갤러리 UI

구현: `GalleryPage.vue`, `GalleryGrid.vue`, `EmoticonCard.vue`

### 1. GalleryPage 레이아웃

```txt
[페이지 제목 + 안내 + 총 N개]
├─ loading  → 로딩 문구 + skeleton grid
├─ error    → ErrorMessage + [다시 시도]
├─ empty    → 빈 상태 문구 + /generate 링크
└─ success  → GalleryGrid + [더 보기] (hasMore일 때)
```

| 항목 | MVP 값 |
|------|--------|
| 컨테이너 | mobile `max-width: 100%`, desktop `960px` |
| 페이지 패딩 | `32px 20px` (mobile `24px 16px`) |
| 제목 | `36px` (mobile `28px`), 가운데 정렬 |
| 섹션 gap | `20px` (mobile `16px`) |

### 2. GalleryGrid 반응형

| 뷰포트 | grid |
|--------|------|
| **Mobile** (`max-width: 640px`) | `grid-template-columns: 1fr` — **1열** |
| **Desktop** (`min-width: 641px`) | `repeat(auto-fill, minmax(220px, 1fr))` |

- gap: mobile `16px`, desktop `20px`
- loading: shimmer skeleton 카드 6개

### 3. EmoticonCard 표시 규칙

| 영역 | 규칙 |
|------|------|
| 미리보기 | `aspect-ratio: 1`, `object-fit: contain`, `--code-bg` 카드 |
| 메타 | `emotion · motion` (14px medium) |
| 텍스트 | `inputText` (14px, `overflow-wrap: anywhere`) |
| 날짜 | `<time datetime>` + `Intl.DateTimeFormat('ko-KR')` |
| 이미지 없음 | placeholder — 「생성 중이거나 실패한 항목입니다.」 등 |

### 4. empty / loading / error UI 문구

| 상태 | 문구·UI |
|------|---------|
| **loading** | 「이모티콘 목록을 불러오는 중입니다...」 + skeleton |
| **empty** | 「아직 생성한 이모티콘이 없습니다.」 + 「이모티콘 만들러 가기」 |
| **error** | API/fallback 메시지 + 「다시 시도」 버튼 (`min-height 44px`) |
| **더 보기** | 「더 보기」 / 진행 중 「불러오는 중...」, `hasMore === false` 시 숨김 |

오류 스타일: Day 5 `ErrorMessage` / Day 8 action-error 톤과 동일 (`#dc2626`)

---

## Day 11 — 오류 처리 · async 상태 · 입력 검증 UX

구현: `ErrorMessage.vue`, `useAsyncState.js`, `apiError.js`, `ImageUploader.vue`, `PromptRefiner.vue`, `CreatePage.vue`, `GalleryPage.vue`, `GenerationResult.vue`

### 1. ErrorMessage 사용 기준

`ErrorMessage`는 `variant` prop으로 용도를 구분합니다.

| `variant` | 용도 | `role` | 표시 위치 (예) |
|-----------|------|--------|----------------|
| `error` | API·검증·다운로드 실패 | `alert` | 버튼·필드 바로 아래 |
| `success` | 업로드·구체화·생성 성공 | `status` | 액션 영역 하단 |
| `hint` | 선행 조건 안내 (이미지 미업로드, finalPrompt 미확인) | `note` | 주요 버튼 위 |
| `loading` | 구체화 등 인라인 진행 표시 | `status` (`aria-live="polite"`) | 버튼 아래 |

- `message`가 비어 있으면 **렌더하지 않음**
- API 실패: `body.message` 우선, 없으면 feature별 fallback (`readApiResponse` / `useAsyncState`)
- 필드 검증: `PromptForm`은 필드별 `error`; Refiner·Uploader는 통합 `error`

### 2. Loading 상태 표시 기준

| 시나리오 | UI | 중복 클릭 방지 |
|----------|-----|----------------|
| **이미지 생성** | `LoadingOverlay` (전역, `pointer-events: all`) | 생성 버튼 disabled + handler early return |
| **업로드** | 버튼 라벨 「업로드 중…」, input disabled | `useAsyncState.run` — `loading` 중 재호출 차단 |
| **프롬프트 구체화** | 버튼 「구체화 중...」+ `ErrorMessage loading` | 버튼 disabled + `run` early return |
| **갤러리 최초 로딩** | 문구 + `GalleryGrid` skeleton | — |
| **갤러리 더 보기** | 버튼 「불러오는 중...」 | `:disabled="isLoadingMore"` |
| **삭제** | 카드 버튼 「삭제 중...」 | `:disabled="deleting"`, 전역 `deletingId` 1건 |

### 3. Success message 표시 기준

| 시나리오 | 메시지 (예) | 비고 |
|----------|-------------|------|
| 업로드 성공 | `이미지 업로드가 완료되었습니다.` | 미리보기는 선택 직후 표시 |
| 구체화 성공 | `프롬프트 구체화가 완료되었습니다.` | storyPrompt / finalPrompt 표시 |
| 삭제 성공 | (MVP) 카드 제거만 | 별도 success 토스트 없음 |

- success 표시 시 동일 영역의 `error`는 `run()` 시작 시 초기화

### 4. Disabled button 기준 (Day 11 통합)

**공통 시각:** `opacity: 0.55`, `cursor: not-allowed`, `--social-bg` / `--text` / `--border`, hover·shadow 없음

| 버튼 | disabled 조건 |
|------|----------------|
| 업로드 | 파일 미선택 · 업로드 중 |
| 이미지 선택 | 업로드 중 |
| 프롬프트 구체화 | emotion/motion/inputText 누락 · 구체화 중 |
| 이미지 생성 | 폼 미완 · finalPrompt 없음 · 생성 중 |
| PNG 다운로드 | URL 없음 · 생성 중 · 다운로드 중 · 이미지 로드 실패 |
| 다시 생성 | 생성 중 · `canRegenerate` false |
| 갤러리 더 보기 | `isLoadingMore` |
| 삭제 | 해당 카드 `deleting` |

disabled 버튼 클릭으로 오류를 **새로 표시하지 않음** — hint/error는 별도 `ErrorMessage` 또는 필드 검증으로 안내.

### 5. Empty state 기준

| 화면 | 조건 | UI |
|------|------|-----|
| 갤러리 | 로딩·에러 아님, items 0건 | 「아직 생성한 이모티콘이 없습니다.」+ `/generate` 링크 |
| GenerationResult 원본 | URL 없음 | 「원본 이미지가 없습니다.」 |
| GenerationResult 생성 | `<img @error>` | 「생성 이미지를 불러오지 못했습니다.」 (`role="alert"`) |

### 6. 모바일 — 오류·로딩 문구 표시

브레이크포인트: **`max-width: 480px`**

| 항목 | 기준 |
|------|------|
| `ErrorMessage` | `font-size: 13px`, padding 축소, `word-break: break-word`, `overflow-wrap: anywhere` |
| `loading` variant | border/background 없음 — 본문과 겹치지 않게 버튼 아래 1줄 |
| `LoadingOverlay` | 하단 정렬, row(스피너+메시지), 메시지 `14px` |
| 긴 API message | 줄바꿈 허용, 가로 스크롤 없음 |
| 터치 타겟 | 주요 버튼 `min-height: 44px` 유지 |

---

## 공통 컴포넌트 (현재)

| 컴포넌트 | 용도 |
|----------|------|
| `AppHeader` | 전역 헤더 (브랜드·로그인/회원가입 또는 생성/갤러리/로그아웃) |
| `LogoIcon` | 헤더 브랜드 토끼 실루엣 SVG |
| `LandingHero` | 랜딩 Hero (텍스트 + preview) |
| `LandingVisual` | Hero 오른쪽 이모티콘 preview flow |
| `LandingHowItWorks` | 이용 방법 3단계 |
| `LandingExampleStrip` | 예시 이모티콘 strip |
| `LandingFooter` | 랜딩 푸터 |
| `LandingStaticImage` | 정적 이미지 + emoji placeholder |
| `ImageUploader` | 파일 선택·미리보기·업로드 (`useAsyncState`) |
| `PromptForm` | 감정·모션·텍스트 입력 |
| `PromptRefiner` | LLM 구체화 (`useAsyncState`) |
| `ErrorMessage` | 인라인 상태 메시지 (`error` / `success` / `hint` / `loading`) |
| `LoadingOverlay` | 생성 중 전역 로딩 |
| `GenerationResult` | 결과 미리보기·비교·다운로드·재생성 |
| `GalleryGrid` | 갤러리 카드 grid |
| `EmoticonCard` | 갤러리 단일 카드 |

---

## 관련 문서

- PRD: `01-prd/02-image-upload-preview.md`, `01-prd/03-emoticon-input.md`, `01-prd/06-generation-result-download.md`, `01-prd/07-gallery-delete.md`
- 에러 규격: `02-contracts/error-response.md`
- 테스트: `05-roadmap/test-checklist.md`
- 전역 스타일: `frontend/src/style.css` (`--accent`, `--border` 등)
- 랜딩 UI: [`landing-page.md`](./landing-page.md)
- 로고 아이콘: [`logo-icon.md`](./logo-icon.md)
- 회원가입 UI: [`auth-register-page.md`](./auth-register-page.md)
