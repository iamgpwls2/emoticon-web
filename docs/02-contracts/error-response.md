# Error Response Contract

## 목적

- Backend API의 에러 응답 형식을 단일 규격으로 고정합니다.
- Frontend는 이 규격을 기반으로 에러 UI(토스트/인라인/리다이렉트)를 구현합니다.

## 작성 시점

- 2026-06-02 (초안)
- 2026-06-06 (Day 6 — `POST /api/prompts/refine` 에러 응답 반영)

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

## 관련 문서

- API 명세: `02-contracts/api-contract.md` (`POST /api/prompts/refine`)
- PRD: `01-prd/04-llm-prompt-refine.md`
- API Key: `04-security/api-key-policy.md`
