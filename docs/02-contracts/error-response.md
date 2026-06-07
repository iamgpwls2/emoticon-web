# Error Response Contract

## 목적

- Backend API의 에러 응답 형식을 단일 규격으로 고정합니다.
- Frontend는 이 규격을 기반으로 에러 UI(토스트/인라인/리다이렉트)를 구현합니다.

## 작성 시점

- 2026-06-02 (초안)
- 2026-06-06 (Day 6 — `POST /api/prompts/refine` 에러 응답 반영)
- 2026-06-06 (Day 8 — 생성 결과 UI 오류 메시지 반영)

---

## 공통 원칙

| 항목 | 규칙 |
|------|------|
| 사용자 메시지 | 한글·이해 가능한 문구. 내부 원인을 그대로 노출하지 않음 |
| 서버 로그 | `console.error` 등으로 **서버 측**에만 기록 |
| Frontend 파싱 | `body.message` 또는 `body.error.message` 우선 (`prompt.service.js`) |

### 클라이언트 응답에 포함하지 않는 항목

아래 정보는 **절대** JSON 응답 body에 포함하지 않습니다.  
서버 로그에도 API Key 값·전체 Authorization 헤더는 남기지 않습니다.

| 금지 항목 | 설명 |
|-----------|------|
| **API key** | `LLM_API_KEY`, OpenAI key, 기타 외부 API secret |
| **외부 LLM 원본 에러** | OpenAI HTTP status, `error.type`, `error.message` 등 vendor raw payload |
| **stack trace** | Node.js stack, 내부 exception name·경로 |

---

## POST /api/prompts/refine — 에러 응답

엔드포인트: `POST /api/prompts/refine`  
구현: `validatePromptRefine` → `refinePromptController` (`requireAuth` 선행)

---

### 1. 400 입력값 검증 실패

**발생 시점:** `validatePromptRefine` 미통과  
**Status:** `400 Bad Request`

#### Body 형식

```json
{
  "message": "입력값을 확인해 주세요.",
  "errors": [
    {
      "field": "emotion",
      "message": "emotion은 필수값입니다."
    }
  ]
}
```

#### `errors[]` 항목

| `field` | `message` (예시) | 조건 |
|---------|------------------|------|
| `emotion` | `emotion은 필수값입니다.` | trim 후 비어 있음 |
| `motion` | `motion은 필수값입니다.` | trim 후 비어 있음 |
| `inputText` | `inputText는 필수값입니다.` | trim 후 비어 있음 |
| `inputText` | `inputText는 최대 500자까지 입력할 수 있습니다.` | 500자 초과 |
| `originalImageUrl` | `originalImageUrl은 문자열이어야 합니다.` | 전달됐으나 `string` 아님 |

#### Frontend 표시

- MVP: 필드별 `errors[]` 분기 없이 **`message` 또는 fallback**으로 통합 표시 가능
- `PromptRefiner.vue`: 「프롬프트 구체화에 실패했습니다. 다시 시도해 주세요.」(400 전용 문구 미분기)

---

### 2. 401 인증 실패

**발생 시점:** `requireAuth` 미통과 (Authorization header 없음·형식 오류·토큰 무효)  
**Status:** `401 Unauthorized`

#### Body 형식

`requireAuth` 공통 envelope:

```json
{
  "ok": false,
  "error": {
    "message": "Authorization header is required."
  }
}
```

```json
{
  "ok": false,
  "error": {
    "message": "Authorization must be Bearer {access_token}."
  }
}
```

```json
{
  "ok": false,
  "error": {
    "message": "Invalid or expired access token."
  }
}
```

#### Frontend 표시

- `prompt.service.js`: 세션 없음 → 요청 전 throw
- API 401: `body.error.message` 파싱 후 throw → `PromptRefiner`에서 catch 시 통합 실패 메시지

---

### 3. 500 LLM 호출 실패

**발생 시점:** `refinePromptWithLLM` 예외 — OpenAI HTTP 오류, 빈 응답, JSON 파싱 실패, 타임아웃(30s), `LLM_API_KEY` 미설정, 기타 네트워크 오류  
**Status:** `500 Internal Server Error`

#### Body 형식

클라이언트에는 **단일 사용자 메시지**만 반환합니다.

```json
{
  "message": "프롬프트 구체화에 실패했습니다. 다시 시도해 주세요."
}
```

#### 서버 로그 (클라이언트 미포함)

```txt
refinePrompt failed (user=<userId>): <내부 error.message>
```

OpenAI 실패 시 로그 예: HTTP status + `error.type`만 — **응답 body에는 전달하지 않음**

#### Frontend 표시

- `PromptRefiner.vue`: `ErrorMessage` — 「프롬프트 구체화에 실패했습니다. 다시 시도해 주세요.」
- 기존 `storyPrompt` / `finalPrompt`는 **덮어쓰지 않음**
- `loading` 해제 후 버튼 재클릭으로 재시도

---

## 상태 코드 요약 (`POST /api/prompts/refine`)

| 코드 | 원인 | 응답 키 |
|------|------|---------|
| 400 | body 검증 실패 | `message`, `errors[]` |
| 401 | 인증 실패 | `ok`, `error.message` |
| 500 | LLM·서버 내부 오류 | `message` |

---

## Day 8 — 생성 결과 UI 오류 메시지

Day 8 frontend-only 오류(이미지 로드·다운로드)와 `POST /api/generations` 실패 표시를 정리합니다.  
**API 계약(body 형식·status code)은 Day 7과 동일**합니다.

### 사용자 메시지 vs 개발자 로그

| 구분 | 규칙 | 예 |
|------|------|-----|
| **사용자 UI** | 한글, 복구 방법 포함, 내부 원인·URL·stack 미노출 | `ErrorMessage`, `GenerationResult` action-error |
| **브라우저 console** | MVP에서 **의도적 `console.log/error` 없음** — 네트워크 탭·Vue devtools로 디버그 | — |
| **Backend log** | `console.error` / `console.info` — URL·prompt 전체·API key 미포함 | 아래 「서버 로그」 |

---

### 1. 이미지 생성 실패 (`POST /api/generations`)

**발생:** API 4xx/5xx, 네트워크 오류, 세션 없음  
**표시 위치:** `CreatePage.vue` → `ErrorMessage` (「이미지 생성」 버튼 위)

| 원인 | 사용자 메시지 | 출처 |
|------|---------------|------|
| 세션 없음 (요청 전) | `You must be signed in to create an emoticon.` | `generation.service.js` throw |
| `finalPrompt` 없음 (요청 전) | `finalPrompt는 필수값입니다.` | `CreatePage` / `generation.service.js` |
| API 500 | `이모티콘 생성에 실패했습니다. 다시 시도해 주세요.` | response `body.message` |
| API 400 등 | `입력값을 확인해 주세요.` 등 | `body.message` 또는 `body.error.message` |
| JSON 파싱 실패 | `이모티콘 생성에 실패했습니다. 다시 시도해 주세요.` | `generation.service.js` fallback |
| 기타 | `err.message` 또는 위 fallback | `handleGenerateImage` catch |

**서버 로그 (클라이언트 미포함):**

```txt
createGeneration request { userId, hasReferenceImage, hasInputText }
createGeneration failed (user=<userId>): <내부 message>
createGeneration failed (user=<userId>, generation=<id>): <내부 message>
```

> `originalImageUrl` 전체, signed URL, storage path, prompt 전체는 **로그에 남기지 않음**

---

### 2. 이미지 로드 실패 (미리보기)

**발생:** `<img @error>` — CORS, 만료 signed URL, 잘못된 URL 등  
**표시 위치:** `GenerationResult.vue` 비교 영역 (인라인 텍스트)

| 영역 | 사용자 메시지 | 접근성 |
|------|---------------|--------|
| 원본 | `원본 이미지를 불러오지 못했습니다.` | 일반 텍스트 |
| 원본 URL 없음 | `원본 이미지가 없습니다.` | 빈 상태 |
| 생성 | `생성 이미지를 불러오지 못했습니다.` | `role="alert"` |

- 생성 이미지 로드 실패 시 **PNG 다운로드 버튼 disabled**
- URL 변경 시 `@error` 플래그 자동 리셋 (`watch`)

---

### 3. 다운로드 실패

**발생:** `downloadImage()` — fetch 실패 + anchor fallback도 불가  
**표시 위치:** `GenerationResult.vue` — PNG 다운로드 버튼 아래

| 사용자 메시지 |
|---------------|
| `이미지 다운로드에 실패했습니다. 이미지를 새 탭에서 열어 저장해 주세요.` |

**개발자 참고 (UI 미표시):** `downloadImage.js` 내부 throw — `imageUrl is required`, `Image fetch failed with status N`, `Anchor download failed` 등. MVP는 catch 후 사용자 메시지만 표시.

> fetch 실패 시 anchor fallback을 시도하므로, **fallback 성공 시 사용자에게 오류를 표시하지 않음**

---

### 4. 다시 생성 실패

**발생:** 재생성 `POST /api/generations` 실패  
**표시 위치:** `GenerationResult.vue` — 다시 생성하기 버튼 아래

| 사용자 메시지 |
|---------------|
| `다시 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.` |

- `CreatePage` `REGENERATE_FAILED_MESSAGE` — API `body.message`와 **무관하게** 통합 메시지
- 실패해도 **이전 `generatedImageUrl`·결과 카드 유지**
- 새 생성 시 `regenerateErrorMessage` 초기화

**서버 로그:** §1과 동일 (`createGeneration failed ...`)

---

### Day 8 메시지 요약

| 시나리오 | 사용자 메시지 | 컴포넌트 |
|----------|---------------|----------|
| 생성 API 실패 | API/fallback 한글 메시지 | `CreatePage` `ErrorMessage` |
| 생성 이미지 로드 실패 | `생성 이미지를 불러오지 못했습니다.` | `GenerationResult` |
| 원본 이미지 로드 실패 | `원본 이미지를 불러오지 못했습니다.` | `GenerationResult` |
| 다운로드 실패 | `이미지 다운로드에 실패했습니다. ...` | `GenerationResult` |
| 다시 생성 실패 | `다시 생성에 실패했습니다. ...` | `GenerationResult` |

---

## 관련 문서

- API 명세: `02-contracts/api-contract.md` (`POST /api/prompts/refine`, `POST /api/generations`)
- PRD: `01-prd/04-llm-prompt-refine.md`, `01-prd/06-generation-result-download.md`
- API Key: `04-security/api-key-policy.md`
