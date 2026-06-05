# Design Guide

## 목적

- UI/UX 디자인 기준(컴포넌트, 상태, 접근성)을 정의합니다.
- 기능 PRD 구현 시 일관된 화면 품질을 보장합니다.

## 작성 시점

- 2026-06-02 (초안)
- 2026-06-03 (Day 5 — 생성 페이지 입력 UI MVP 기준 반영)

> 확정 디자인이 아닌 **MVP 기준**입니다. 이후 단계에서 시각 언어를 보강할 수 있습니다.

---

## 디자인 원칙 (MVP)

- **간결함** — 한 화면에 한 가지 흐름(업로드 → 입력 → 다음 단계)
- **명확한 피드백** — 오류·disabled·글자 수를 즉시 표시
- **복구 가능** — 검증 실패 후 값 수정·재시도 가능

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

## 공통 컴포넌트 (현재)

| 컴포넌트 | 용도 |
|----------|------|
| `ImageUploader` | 파일 선택·미리보기·업로드 |
| `PromptForm` | 감정·모션·텍스트 입력 |
| `ErrorMessage` | 인라인 오류 메시지 |

---

## 관련 문서

- PRD: `01-prd/02-image-upload-preview.md`, `01-prd/03-emoticon-input.md`
- 전역 스타일: `frontend/src/style.css` (`--accent`, `--border` 등)
