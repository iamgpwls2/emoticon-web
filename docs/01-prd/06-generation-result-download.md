# 06. Generation Result & Download (PRD)

## 목적

- Day 8: 이미지 생성 중 로딩 UI, 생성 결과 미리보기, 원본/생성 비교, PNG 다운로드, 다시 생성하기 UX를 정의합니다.

## 작성 시점

- 2026-06-02 (초안)
- 2026-06-06 (Day 8 — `LoadingOverlay`, `GenerationResult`, 다운로드·재생성 반영)

## 스택 전제

- **Frontend**: `CreatePage.vue`, `LoadingOverlay.vue`, `GenerationResult.vue`, `downloadImage.js`
- **Backend API**: Day 7 `POST /api/generations` 계약 유지 (변경 없음)
- **인증**: Supabase Auth Bearer JWT

---

## Day 8 목표

| # | 목표 |
|---|------|
| 1 | 생성 중 전역 로딩 UI로 중복 조작 방지 |
| 2 | 생성 결과 미리보기 + 원본/생성 이미지 비교 |
| 3 | 생성 PNG 다운로드 |
| 4 | 동일 payload로 **다시 생성하기** (재시도) |
| 5 | 성공·실패·빈 상태별 명확한 UX |

---

## 페이지 구조 (Day 8)

```txt
[페이지 제목 + 안내]
├─ 1. 이미지 업로드
├─ 2. 이모티콘 설정
│    ├ PromptForm
│    └ PromptRefiner (생성 중 fieldset disabled)
├─ 3. 생성 결과 (generatedImageUrl 있을 때만 표시)
│    ├ 원본 / 생성 이미지 비교
│    ├ PNG 다운로드 · 다시 생성하기
│    └ 최종 프롬프트
├─ LoadingOverlay (isGenerating 시 전역)
└─ [이미지 생성] 버튼
```

구현: `frontend/src/pages/CreatePage.vue`

---

## 1. 생성 중 로딩 UI

**컴포넌트:** `LoadingOverlay.vue`

| 항목 | 요구사항 |
|------|----------|
| 표시 조건 | `isGenerating === true` (최초 생성·다시 생성 공통) |
| 메시지 | 기본: 「이모티콘을 생성하는 중입니다. 잠시만 기다려 주세요.」 |
| 동작 | `position: fixed` 전체 화면 덮음, `pointer-events: all`로 클릭 차단 |
| 접근성 | `role="status"`, `aria-live="polite"`, `aria-busy="true"` |
| 연동 | `PromptRefiner` fieldset `disabled`, 생성·재생성 버튼 disabled |

---

## 2. 생성 결과 미리보기

**컴포넌트:** `GenerationResult.vue`

| 항목 | 요구사항 |
|------|----------|
| 표시 조건 | `generatedImageUrl` trim 후 1자 이상 |
| 섹션 제목 | `3. 생성 결과` |
| 카드 | `--code-bg` 배경, `border-radius 12px`, shadow |
| 생성 이미지 | `<img>` `object-fit: contain`, `max-height: min(50vh, 320px)` |
| 최종 프롬프트 | `finalPrompt` 있을 때만 하단 표시 (`white-space: pre-wrap`) |
| 생성 ID | `data-generation-id` 속성 (테스트·디버그용) |

---

## 3. 원본 / 생성 이미지 비교

| 뷰포트 | 레이아웃 |
|--------|----------|
| **Desktop** (`min-width: 641px`) | 2열 grid (원본 \| 생성) |
| **Mobile** (`max-width: 640px`) | 1열 세로 스택 |

| 상태 | 원본 영역 | 생성 영역 |
|------|-----------|-----------|
| URL 있음 · 로드 성공 | `<img>` 미리보기 | `<img>` 미리보기 |
| URL 없음 | 「원본 이미지가 없습니다.」 | — |
| URL 있음 · 로드 실패 | 「원본 이미지를 불러오지 못했습니다.」 | 「생성 이미지를 불러오지 못했습니다.」 (`role="alert"`) |

- 안내 문구: 「생성 결과가 원본 캐릭터와 다르다면 프롬프트를 수정하거나 다시 생성해 주세요.」

---

## 4. PNG 다운로드

**유틸:** `frontend/src/utils/downloadImage.js`

| 항목 | 요구사항 |
|------|----------|
| 버튼 라벨 | 기본 「PNG 다운로드」, 진행 중 「다운로드 중...」 |
| 파일명 | `emoticon-{generationId}.png` (ID 없으면 `emoticon-result.png`) |
| 방식 | `fetch` + blob 우선 → CORS 등 실패 시 `<a download>` fallback |
| disabled | URL 없음 · 생성 중 · 다운로드 중 · 생성 이미지 로드 실패 |
| 실패 메시지 | 「이미지 다운로드에 실패했습니다. 이미지를 새 탭에서 열어 저장해 주세요.」 |

> MVP는 확장자만 `.png`로 저장합니다. 실제 MIME 변환은 하지 않습니다.

---

## 5. 다시 생성하기

| 항목 | 요구사항 |
|------|----------|
| 표시 | 최초 생성 **성공 후** `lastGenerationPayload` 저장 시 버튼 활성 |
| 클릭 | `POST /api/generations` 재호출 (`createGeneration(lastGenerationPayload)`) |
| payload 유지 | `originalImageUrl`, `emotion`, `motion`, `inputText`, `storyPrompt`, `finalPrompt` (마지막 성공 요청 스냅샷) |
| 성공 | `generatedImageUrl`, `generationId` 갱신 |
| 실패 | 「다시 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.」 |
| 진행 중 | 버튼 「다시 생성 중...」, disabled |
| 중복 방지 | `isGenerating` guard + 버튼 disabled + `LoadingOverlay` |

> 폼을 수정한 뒤 **다시 생성하기**를 누르면 **현재 폼이 아닌** 마지막 성공 payload가 사용됩니다.

---

## 6. 성공 / 실패 / 빈 상태 UX

| 상태 | UI |
|------|-----|
| **빈** (미생성) | `GenerationResult` 섹션 숨김 |
| **생성 중** | `LoadingOverlay` + 버튼 disabled + 라벨 「이미지 생성 중...」 / 「다시 생성 중...」 |
| **생성 성공** | 결과 카드 표시, 다운로드·재생성 버튼 활성 |
| **생성 실패** | `CreatePage` `ErrorMessage` — API 메시지 또는 「이모티콘 생성에 실패했습니다. 다시 시도해 주세요.」 |
| **재생성 실패** | `GenerationResult` 액션 영역 오류 (기존 결과 유지) |
| **이미지 로드 실패** | 비교 영역 인라인 오류 (다운로드 버튼 disabled) |

---

## 7. 모바일 대응 기준

브레이크포인트: **`max-width: 480px`**, 비교 grid **`641px`**

| 항목 | Desktop | Mobile |
|------|---------|--------|
| 비교 레이아웃 | 2열 | 1열 |
| `LoadingOverlay` | 중앙 패널 | 하단 고정형 패널 (row) |
| 카드 패딩 | `16px` | `12px` |
| 힌트·프롬프트 글자 | `13–14px` | `12–13px` |
| 버튼 | `min-height 44px` 전체 너비 | 동일 |

`CreatePage` 컨테이너: `641px` 이상 `max-width: 720px`

---

## Day 8 검증 체크리스트

### Frontend UX

- [ ] 생성 중 `LoadingOverlay` 표시
- [ ] 생성 중 「이미지 생성」·「다시 생성하기」·프롬프트 구체화 disabled
- [ ] 성공 시 `3. 생성 결과` 섹션 표시
- [ ] Desktop 2열 / Mobile 1열 비교
- [ ] PNG 다운로드 동작 (또는 fallback 안내)
- [ ] 다시 생성하기 — 동일 payload 재호출
- [ ] 재생성 성공 시 새 이미지로 교체
- [ ] 실패 시 사용자 메시지 표시

### Backend · DB (Day 7 연동 확인)

```bash
docker compose up --build
docker compose logs -f backend
```

- [ ] 로그: `createGeneration request { hasReferenceImage: true, ... }` (URL 전체 미노출)
- [ ] DB `original_image_url` 저장
- [ ] DB `generated_image_url` — `status='completed'` 시 저장
- [ ] DB `final_prompt` — `applyCharacterPreservationGuards()` 보강 프롬프트 저장

```sql
select id, status, original_image_url, generated_image_url, final_prompt, created_at
from public.emoticon_generations
order by created_at desc
limit 5;
```

---

## 관련 문서

- API: `02-contracts/api-contract.md` (`POST /api/generations`)
- Day 7 PRD: `01-prd/05-image-generation.md`
- 디자인: `03-design/design-guide.md` (Day 8 섹션)
- 에러: `02-contracts/error-response.md` (Day 8 섹션)
