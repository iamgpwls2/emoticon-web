# Register Page Design

## 목적

- `/register` 회원가입 화면의 레이아웃·입력 UI·반응형 기준을 정의합니다.
- **기능 로직**(Supabase `signUp`, 검증, 라우팅)은 UI 변경과 분리되어 유지됩니다.

## 작성 시점

- 2026-06-08

## 구현 파일

| 파일 | 역할 |
|------|------|
| `frontend/src/views/RegisterPage.vue` | 템플릿·폼·submit handler |
| `frontend/src/style.css` | `.auth-page--register` 전용 스타일 |
| `frontend/src/composables/useAuth.js` | `signUp` (변경 없음) |
| `frontend/src/components/layout/AppHeader.vue` | 상단 공통 헤더 |

> 로그인 페이지(`/login`)는 아직 Day 5 이전 **기본 `.auth-page` 스타일**입니다. 회원가입과 동일 톤으로 맞추는 작업은 별도 단계입니다.

---

## 페이지 구조

```txt
AppHeader
└─ RegisterPage (.auth-page.auth-page--register)
     ├─ .auth-page__decor (sparkle / circle / dots, pointer-events: none)
     └─ .auth-page__content
          ├─ .auth-page__intro
          │    ├─ h1 「회원가입」
          │    └─ 부제 「이모티콘 생성을 시작하려면…」
          └─ .auth-card.auth-card--register
               ├─ form (.auth-form--register)
               │    ├─ 이메일 주소
               │    ├─ 비밀번호 (+ eye toggle)
               │    ├─ 비밀번호 확인 (+ eye toggle)
               │    ├─ formError
               │    └─ submit 「회원가입」
               └─ .auth-footer 「이미 계정이 있나요? 로그인」
```

---

## 배경 · 장식

| 요소 | 설명 |
|------|------|
| 배경 | 연보라 radial + `#f3efff` → `#ffffff` → `#f7f4ff` gradient |
| `.auth-page__sparkle` | ✦ 문자 3곳 |
| `.auth-page__circle` | 연보라 radial blur 원 2개 |
| `.auth-page__dots` | dot pattern 2곳 |
| 상호작용 | 장식 전체 `pointer-events: none` |
| overflow | `overflow-x: hidden` |

---

## Title 영역

| 항목 | 스타일 |
|------|--------|
| 제목 | `clamp(2rem, 4vw, 2.75rem)`, `font-weight: 700`, `#17213f`, 중앙 정렬 |
| 부제 | `17px`, `#667085`, 중앙 정렬 |
| 카드와 간격 | `margin-bottom: 32px` (모바일 `24px`) |

---

## Form Card

| 항목 | Desktop | `max-width: 900px` | `max-width: 600px` |
|------|---------|--------------------|--------------------|
| max-width | `780px` | `calc(100% - 40px)` | `calc(100% - 24px)` |
| padding | `56px 64px` | `40px 32px` | `28px 20px` |
| border-radius | `26px` | 동일 | `22px` |
| 배경 | `#ffffff` | 동일 | 동일 |
| border | `1px solid #e4defa` | 동일 | 동일 |
| shadow | `0 20px 48px rgba(94, 70, 140, 0.12)` | 동일 | 동일 |

---

## 입력 필드

### 라벨 · placeholder

| 필드 | label | placeholder |
|------|-------|-------------|
| 이메일 | 이메일 주소 | `you@example.com` |
| 비밀번호 | 비밀번호 | `6자 이상` |
| 비밀번호 확인 | 비밀번호 확인 | `비밀번호 재입력` |

### `.auth-input-wrap`

| 항목 | Desktop | Mobile (`max-width: 600px`) |
|------|---------|------------------------------|
| height | `68px` | `58px` |
| border-radius | `13px` | 동일 |
| border | `1px solid #e4defa` | 동일 |
| focus | `#c4b5fd` border + 연보라 ring | 동일 |
| invalid | `#fca5a5` border | 동일 |
| 왼쪽 아이콘 | 메일 / 자물쇠 SVG (`#8b5cf6`) | 동일 |
| 오른쪽 | 비밀번호 필드만 eye toggle 버튼 | 동일 |

- input은 wrap 내부에서 border 없음, `font-size: 16px`
- `showPassword` / `showPasswordConfirm` ref로 visibility 토글 (로직만, API 무관)

---

## Submit 버튼 (`.auth-submit--register`)

| 항목 | 값 |
|------|-----|
| width | `100%` |
| height | `68px` (mobile `58px`) |
| 배경 | `linear-gradient(135deg, #8b5cf6 0%, #7c3aed 55%, #6d28d9 100%)` |
| 텍스트 | 「회원가입」/ 로딩 시 「가입 중…」, `#ffffff`, `font-weight: 700` |
| radius | `13px` |
| hover | gradient 진하게 + `translateY(-1px)` + shadow 강화 |
| disabled | `opacity: 0.65` |

---

## 하단 링크

```txt
이미 계정이 있나요? [로그인]
```

- `router-link to="/login"`
- 링크 색: `#7c3aed`, `font-weight: 600`

---

## 유지되는 기능 (변경 금지 영역)

| 항목 | 설명 |
|------|------|
| `v-model` | `email`, `password`, `passwordConfirm` |
| `validateForm` | 이메일 형식, 6자 이상, 확인 일치 |
| `handleSubmit` | `signUp` → session 있으면 redirect, 없으면 `/login?registered=1` |
| `submitting` | 버튼·입력 disabled |
| `formError` / `fieldErrors` | API·검증 메시지 |
| `toUserFriendlyError` | Supabase 오류 한글 매핑 |

---

## 헤더와의 관계

비로그인 시 헤더 오른쪽:

- **로그인** (outline)
- **회원가입** (primary, 현재 페이지와 동일 라벨)

Hero CTA(「시작하기」)와 헤더 「회원가입」은 모두 `/register`로 연결됩니다.

---

## 관련 문서

- [`design-guide.md`](./design-guide.md)
- [`logo-icon.md`](./logo-icon.md)
