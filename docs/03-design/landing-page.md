# Landing Page Design

## 목적

- Emoticon Web 메인(`/`) 랜딩 화면의 레이아웃·컴포넌트·반응형 기준을 정의합니다.
- Hero, How it works, Example strip, Footer가 **동일한 중앙 컨테이너 기준선**을 공유합니다.

## 작성 시점

- 2026-06-08

## 구현 파일

| 구분 | 경로 |
|------|------|
| 페이지 | `frontend/src/pages/HomePage.vue` |
| Hero | `frontend/src/components/home/LandingHero.vue` |
| Preview | `frontend/src/components/home/LandingVisual.vue` |
| How | `frontend/src/components/home/LandingHowItWorks.vue` |
| Examples | `frontend/src/components/home/LandingExampleStrip.vue` |
| Footer | `frontend/src/components/home/LandingFooter.vue` |
| 정적 이미지 상수 | `frontend/src/constants/landingImages.js` |
| 스타일 | `frontend/src/assets/main.css` (`.home-page` 하위) |

---

## 페이지 구조

```txt
HomePage (.home-page)
├─ LandingHero (.landing-hero)
│    └─ .hero-shell
│         ├─ .landing-hero__content (텍스트·CTA·장점)
│         └─ .landing-hero__visual
│              └─ LandingVisual (.landing-visual)
│                   └─ .hero-preview-flow
├─ LandingHowItWorks (.landing-how)
│    └─ .how-shell → .landing-how__inner
├─ LandingExampleStrip (.landing-strip)
│    └─ .example-shell
└─ LandingFooter (.landing-footer)
     └─ .landing-footer__inner
```

헤더는 `App.vue`의 `AppHeader`가 담당하며, inner 너비도 동일 shell 토큰을 사용합니다.

---

## 중앙 컨테이너 (Shell)

| 클래스 | 적용 위치 |
|--------|-----------|
| `hero-shell` | Hero 2열 grid |
| `how-shell` | How it works |
| `example-shell` | Example strip |
| `app-header__inner` | 헤더 (동일 max/gutter) |
| `landing-footer__inner` | 푸터 |

```css
width: min(var(--landing-shell-max), calc(100% - (var(--landing-shell-gutter) * 2)));
margin-inline: auto;
```

| 토큰 | 값 |
|------|-----|
| `--landing-shell-max` | `1240px` |
| `--landing-shell-gutter` | `48px` |

---

## Hero 영역

### Desktop (`min-width: 1101px`)

| 항목 | 값 |
|------|-----|
| `hero-shell` grid | `minmax(0, 460px) 680px` |
| gap | `72px` |
| 섹션 padding | `64px 0 72px` |
| 제목 | `52px`, accent gradient on 「AI 이모티콘」 |
| Primary CTA | 「시작하기 →」 only (`landing-hero__btn--primary`) |
| CTA 라우팅 | 비로그인 → `/register`, 로그인 → `/generate` |

> Hero에는 **로그인 버튼을 두지 않습니다.** 로그인은 헤더 CTA로만 제공합니다.

### Tablet / Mobile (`max-width: 1100px`)

- `hero-shell`: 1열, `justify-items: center`
- Hero 텍스트·CTA·장점: 중앙 정렬
- Preview: 아래로 스택

---

## Hero Preview Flow

구현: `LandingVisual.vue` — `position: absolute` / `100vw` 사용 **금지**. `hero-shell` grid 오른쪽 컬럼 안에서만 배치합니다.

### 레이아웃 (Desktop)

```txt
.hero-preview-flow (680px, grid 3열)
├─ .source-character-card (240px)
│    ├─ .source-image-box (200×200px)
│    └─ label 「원본 캐릭터」
├─ .flow-arrow (140×300px, SVG branch 점선)
└─ .result-emoticon-list (280px)
     └─ .result-emoticon-card × 3 (280×92px, 가로형)
          ├─ 이미지 (88×76px)
          └─ 라벨 (웃음 / 박수 / 사랑해)
```

| 클래스 | Desktop |
|--------|---------|
| `hero-preview-flow` | `grid-template-columns: 240px 140px 280px`, `width: 680px` |
| `source-character-card` | `240px`, `padding: 20px`, `border-radius: 24px` |
| `source-image-box` | `200×200px`, `border-radius: 20px` |
| `result-emoticon-card` | `280×92px`, `padding: 12px 22px 12px 14px` |
| `flow-arrow` | SVG `viewBox="0 0 140 300"`, 보라 점선 + branch 화살표 |

### 반응형 Preview

| 브레이크포인트 | 동작 |
|----------------|------|
| `max-width: 1100px` | flow `620px`, grid `220px 120px 260px`, 카드·이미지 축소 |
| `max-width: 720px` | 1열 스택, `.flow-arrow` **숨김**, 카드 `max-width: 100%` |

### 이미지 에셋

- 경로 상수: `frontend/src/constants/landingImages.js`
- 공개 정적 파일: `frontend/public/landing/` (`hero-original.png`, `hero-smile.png` 등)
- 미존재 시 `LandingStaticImage`가 emoji + gradient placeholder 표시
- Hero preview 교체용: `LANDING_HERO_DEMO_ASSETS` (추후 `src/assets/demo-*.png` import로 교체 가능)

---

## How it Works

- 제목: 「어떻게 이모티콘을 만들까요?」
- 3단계 카드 + chevron (`landing-how__inner` 흰색 라운드 카드)
- Desktop (`min-width: 1101px`): 카드 가로 배치

---

## Example Strip

- 제목: 「다양한 이모티콘 예시」+ 정적 「더 보기 >」
- 7개 예시 카드 (`LANDING_EXAMPLE_IMAGES`)

| 뷰포트 | grid |
|--------|------|
| `min-width: 1201px` | 7열 |
| `641px ~ 1200px` | 4열 |
| `max-width: 640px` | 가로 스크롤 strip (`landing-strip__track` flex) |

---

## Footer

- 브랜드 + tagline + © 2024
- `landing-footer__inner`가 shell 토큰과 동일 기준선 사용
- Desktop: 3열 grid (브랜드 | copyright | spacer)

---

## 색상 · 배경

`.home-page` 배경:

- 연보라 radial gradient + `#f3efff` → `#ffffff` → `#f7f4ff` linear
- Hero preview glow/sparkle: `pointer-events: none` 장식

---

## CTA 정책 요약

| 위치 | 비로그인 | 로그인 |
|------|----------|--------|
| Header | 로그인 + **회원가입** | 생성 + 갤러리 + 로그아웃 |
| Hero | **시작하기 →** (`/register`) | **시작하기 →** (`/generate`) |

---

## 관련 문서

- [`design-guide.md`](./design-guide.md) — 전역 shell 토큰·공통 컴포넌트 목록
- [`logo-icon.md`](./logo-icon.md) — 헤더 로고
