# 05. Image Generation (PRD)

## 목적

- LLM이 정제한 `finalPrompt`를 사용해 이모티콘 이미지를 생성하고, 결과를 Storage·DB에 저장·표시하는 요구사항을 정의합니다.

## 작성 시점

- 2026-06-02 (초안)
- 2026-06-06 (Day 7 — `POST /api/generations` · 생성 기록 저장 흐름 반영)

## 스택 전제

- **Frontend**: `CreatePage.vue` → `generation.service.js` → backend API
- **Backend**: `POST /api/generations` — 이미지 생성 API·Storage·DB는 **server-only**
- **인증**: Supabase Auth Bearer JWT (`requireAuth`)

---

## 생성 요청 조건

| 조건 | 설명 |
|------|------|
| 로그인 | **로그인 사용자만** 요청 가능. 미인증 시 `401` |
| 이미지 업로드 | 기준 이미지 업로드 완료 (`CreatePage` `hasImage`) |
| 입력 완료 | 감정·모션·텍스트 입력 완료 (`isPromptFormComplete`) |
| 프롬프트 정제 | `POST /api/prompts/refine`으로 `storyPrompt` / `finalPrompt` 확보 |
| **`finalPrompt` 필수** | trim 후 1자 이상. 없으면 frontend에서 요청 차단 + backend `400` |

`originalImageUrl`은 선택이지만, 업로드 이미지가 있으면 payload에 포함해 캐릭터 참조 맥락을 DB에 남깁니다.

---

## 요청 흐름 (Frontend)

1. 사용자가 **이미지 생성** 버튼 클릭
2. `CreatePage.vue` → `createGeneration()` (`frontend/src/services/generation.service.js`)
3. `Authorization: Bearer {access_token}` 포함해 `POST /api/generations` 호출
4. 성공 시 `generatedImageUrl` 미리보기 표시, `id`를 `generationId` 상태에 저장

> frontend는 **외부 이미지 생성 API를 직접 호출하지 않습니다.** (`04-security/api-key-policy.md`)

---

## 중복 요청 방지 (Frontend)

| 방식 | 구현 |
|------|------|
| `isGenerating` 상태 | 요청 시작 시 `true`, `finally`에서 `false` |
| 버튼 disabled | `isGenerating` 또는 폼 미완성·`finalPrompt` 없음 시 비활성 |
| handler guard | `handleGenerateImage` 시작부 `if (isGenerating.value) return` |

backend는 요청마다 **새 `emoticon_generations` row**를 insert합니다. 동일 사용자의 연속 클릭 시에도 각 요청은 별도 `generationId`·Storage path를 갖습니다. 실패 row는 `failed`로 남깁니다.

---

## Backend 처리 순서 · DB 저장 타이밍

```txt
1. requireAuth → req.user.id 확정
2. validateCreateGeneration (finalPrompt 등 검증)
3. INSERT emoticon_generations  status='generating'
4. generateImageFromPrompt({ finalPrompt, originalImageUrl })     ← backend only
      originalImageUrl 있음 → OpenAI Images edits API (reference image + input_fidelity=high)
      originalImageUrl 없음 → OpenAI Images generations API (text-to-image only)
5. uploadGeneratedEmoticon(userId, record.id, buffer)
      Storage path: {user_id}/{generation_id}.png
6a. 성공 → UPDATE status='completed', generated_image_url=<signed URL>
6b. 실패 → UPDATE status='failed', error_message=<안전한 메시지>
7. JSON 응답 { id, generatedImageUrl, status }
```

### 성공 시

- Storage: `generated-emoticons` bucket에 PNG 업로드
- DB: `status='completed'`, `generated_image_url`에 signed URL 저장, `error_message=null`
- 응답: `201` + `{ id, generatedImageUrl, status: 'completed' }`

### 실패 시

- DB: `status='failed'`, `error_message` 저장 (API key·vendor raw 오류 미포함)
- 응답: `500` + `{ message: '이모티콘 생성에 실패했습니다. 다시 시도해 주세요.' }`
- 이미지 생성 실패·Storage 업로드 실패 모두 동일하게 `markGenerationFailed` 호출

---

## 이미지 생성 Provider · 원본 캐릭터 보존

| 구분 | 설명 |
|------|------|
| Provider | OpenAI Images API (`gpt-image-1`) |
| `originalImageUrl` **있음** | `POST /v1/images/edits` — reference image를 multipart로 전달, `input_fidelity=high` |
| `originalImageUrl` **없음** | `POST /v1/images/generations` — **text-to-image only** |
| 참조 이미지 다운로드 | backend가 Supabase Storage URL을 service role로 다운로드 (`user-uploads` private bucket 대응) |
| `finalPrompt` 보강 | `originalImageUrl`이 있으면 controller에서 캐릭터 보존 문구를 보강 후 provider에 전달 |

### 원본 캐릭터 보존 한계

| 조건 | 보존 수준 |
|------|-----------|
| `originalImageUrl` + edits API | reference image 기반 편집으로 **유사도 향상**. 100% 동일 보장은 **아님** |
| `originalImageUrl` 없음 (generations only) | **원본 캐릭터 보존은 보장되지 않음** — `finalPrompt` 텍스트만으로 생성 |
| LLM `finalPrompt` | `provided reference image`, `preserve the original character`, `do not change into a human` 등 보존 조건 포함 (정제 단계 + 생성 직전 보강) |

---

## UX 요구사항

| 상태 | UI |
|------|-----|
| 생성 중 | 버튼 문구 「이미지 생성 중...」, disabled |
| 성공 | 「3. 생성 결과」 섹션에 `generatedImageUrl` 미리보기 |
| 실패 | `ErrorMessage`로 사용자 이해 가능한 한글/검증 메시지 표시 |

---

## 구현 매핑

| 구분 | 경로 |
|------|------|
| Frontend Page | `frontend/src/pages/CreatePage.vue` |
| Frontend Service | `frontend/src/services/generation.service.js` |
| Backend Route | `backend/src/routes/generation.routes.js` |
| Backend Controller | `backend/src/controllers/generation.controller.js` |
| Validation | `backend/src/validators/generation.validator.js` |
| Image API | `backend/src/services/imageGeneration.service.js` |
| Storage | `backend/src/services/storage.service.js` |
| DB | `backend/src/services/generation.service.js` |

---

## 관련 문서

- API: `02-contracts/api-contract.md` — `POST /api/generations`
- DB: `02-contracts/db-schema.md` — `emoticon_generations`
- Storage: `02-contracts/storage-policy.md` — `generated-emoticons`
- 보안: `04-security/api-key-policy.md`
- LLM 정제: `01-prd/04-llm-prompt-refine.md`
