# Logo Icon

## 목적

- Emoticon Web 브랜드 마크(헤더 왼쪽 아이콘)의 형태·크기·구현 방식을 정의합니다.
- 메인·로그인·회원가입·인증 후 화면 모두 `AppHeader`를 통해 **동일한 로고**가 표시됩니다.

## 작성 시점

- 2026-06-08

## 구현 파일

| 파일 | 역할 |
|------|------|
| `frontend/src/components/layout/LogoIcon.vue` | 토끼 실루엣 SVG |
| `frontend/src/components/layout/AppHeader.vue` | 로고 마크 + 「Emoticon Web」 텍스트 |
| `frontend/src/assets/main.css` | `.app-header__logo-icon` 컨테이너 스타일 |

---

## 디자인 스펙

### 컨테이너 (`.app-header__logo-icon`)

| 항목 | Desktop | Mobile (`max-width: 640px`) |
|------|---------|-------------------------------|
| 크기 | `44×44px` | `38×38px` |
| `border-radius` | `13px` | `11px` |
| 배경 | `linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)` | 동일 |
| 그림자 | `0 4px 12px rgba(124, 58, 237, 0.25)` | 동일 |
| 정렬 | `Emoticon Web` 텍스트와 flex row, 세로 중앙 | 동일 |

### SVG (`.logo-icon__rabbit`)

| 항목 | Desktop | Mobile |
|------|---------|--------|
| 표시 크기 | `30×30px` | `26×26px` |
| `viewBox` | `0 0 24 24` | 동일 |
| 색상 | `currentColor` → 컨테이너에서 `#ffffff` | 동일 |

### 실루엣 형태

- **흰색 단색 실루엣** (눈·코·입 **없음**)
- 구성: 좌·우 귀 타원 2개 + 얼굴/몸통 타원 1개

```txt
ellipse (왼쪽 귀)  cx=8.15  cy=6.6   rx=2.45 ry=6.1
ellipse (오른쪽 귀) cx=15.85 cy=6.6   rx=2.45 ry=6.1
ellipse (얼굴)      cx=12    cy=15.4  rx=7.5  ry=6.75
```

---

## 사용 예

```vue
<span class="app-header__logo-icon" aria-hidden="true">
  <LogoIcon />
</span>
```

- `router-link.app-header__brand` 내부에 배치
- 장식 목적이므로 아이콘 wrapper에 `aria-hidden="true"` (브랜드 링크 자체는 접근 가능)

---

## 변경 시 주의

- PNG/emoji 대신 **inline SVG 컴포넌트**로 유지 (확대·축소 시 깨짐 방지)
- 얼굴 디테일(눈·코·입) 추가 시 브랜드 가이드 재검토 필요 — 현재 스펙은 **실루엣 only**
- 푸터 `landing-footer__logo-icon`은 별도 소형 마크(16px 아이콘)이며, 헤더 `LogoIcon`과는 다른 구현입니다.

---

## 관련 문서

- [`design-guide.md`](./design-guide.md)
- [`landing-page.md`](./landing-page.md)
