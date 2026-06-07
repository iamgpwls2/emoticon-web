# Error Response Contract

## 목적

- Backend API의 에러 응답 형식을 단일 규격으로 고정합니다.
- Frontend는 이 규격을 기반으로 `ErrorMessage`·fallback 메시지를 표시합니다.

## 작성 시점

- 2026-06-02 (초안)
- 2026-06-06 (Day 6 — `POST /api/prompts/refine` 에러 응답 반영)
- 2026-06-06 (Day 8 — 생성 결과 UI 오류 메시지 반영)
- 2026-06-07 (Day 11 — 공통 `{ message, code, details? }` 규격·error middleware 통합)

---

## 공통 응답 형식

모든 API 에러는 아래 JSON envelope을 사용합니다.

```json
{
  "message": "사용자에게 보여줄 한글 메시지",
  "code": "ERROR_CODE",
  "details": {}
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `message` | `string` | ✅ | 사용자용 메시지 (한글, 복구 방법 포함) |
| `code` | `string` | ✅ | 기계 판별용 코드 (`ErrorCode` enum) |
| `details` | `object` | — | 필드별 검증 오류 등 부가 정보 (없으면 생략) |

구현: `backend/src/utils/httpError.js` (`HttpError`), `backend/src/middlewares/error.middleware.js` (`errorHandler`, `notFoundHandler`)

### ErrorCode 목록

| `code` | HTTP | 용도 |
|--------|------|------|
| `VALIDATION_ERROR` | 400 (또는 413) | body·파일 검증 실패 |
| `UNAUTHORIZED` | 401 | 인증 실패 |
| `FORBIDDEN` | 403 | 권한 없음 (MVP 예약) |
| `NOT_FOUND` | 404 | 리소스·경로 없음 |
| `STORAGE_ERROR` | 500 | Supabase Storage 실패 |
| `EXTERNAL_API_ERROR` | 500 | LLM·이미지 생성 API 실패 |
| `SERVER_ERROR` | 500 | 기타 서버 내부 오류 |

---

## 상태 코드별 예시

### 400 — Validation Error

**발생:** validator 미통과, 잘못된 multipart, 잘못된 URL 형식 등  
**Status:** `400 Bad Request`

```json
{
  "message": "입력값을 확인해 주세요.",
  "code": "VALIDATION_ERROR",
  "details": {
    "errors": [
      { "field": "emotion", "message": "emotion은 필수값입니다." },
      { "field": "inputText", "message": "inputText는 최대 500자까지 입력할 수 있습니다." }
    ]
  }
}
```

단일 필드 오류 예 (`POST /api/uploads/image` — 파일 없음):

```json
{
  "message": "업로드할 이미지 파일을 선택해 주세요.",
  "code": "VALIDATION_ERROR"
}
```

> **413 (파일 크기):** 5MB 초과 업로드는 `400`이 아닌 **`413 Payload Too Large`** 이며, `code`는 `VALIDATION_ERROR`입니다.  
> `message`: `이미지는 최대 5MB까지 업로드할 수 있습니다.`

---

### 401 — Auth Error

**발생:** `requireAuth` 미통과 (Authorization 없음·형식 오류·토큰 무효)  
**Status:** `401 Unauthorized`

```json
{
  "message": "로그인이 필요합니다.",
  "code": "UNAUTHORIZED"
}
```

```json
{
  "message": "Invalid or expired access token.",
  "code": "UNAUTHORIZED"
}
```

---

### 403 — Forbidden Error

**발생:** 인증은 됐으나 리소스 접근 권한 없음 (MVP에서 `HttpError.forbidden()` 예약, 엔드포인트별 적용은 이후 확장)  
**Status:** `403 Forbidden`

```json
{
  "message": "접근 권한이 없습니다.",
  "code": "FORBIDDEN"
}
```

---

### 404 — Not Found Error

**발생:** 등록되지 않은 API 경로, 존재하지 않는 generation 삭제/조회 등  
**Status:** `404 Not Found`

```json
{
  "message": "요청한 API를 찾을 수 없습니다.",
  "code": "NOT_FOUND"
}
```

```json
{
  "message": "이모티콘을 찾을 수 없습니다.",
  "code": "NOT_FOUND"
}
```

> 타 사용자 generation ID 삭제 시에도 동일 메시지(열거 방지).

---

### 500 — Server Error

**발생:** LLM·이미지 생성 API 실패, Storage 실패, 처리되지 않은 예외  
**Status:** `500 Internal Server Error`

```json
{
  "message": "프롬프트 구체화에 실패했습니다. 다시 시도해 주세요.",
  "code": "EXTERNAL_API_ERROR"
}
```

```json
{
  "message": "서버 처리 중 오류가 발생했습니다. 다시 시도해 주세요.",
  "code": "SERVER_ERROR"
}
```

알 수 없는 예외는 `normalizeError()`가 `SERVER_ERROR`로 변환합니다.

---

## 클라이언트 노출 금지 정책

아래 정보는 **절대** JSON 응답 body에 포함하지 않습니다.

| 금지 항목 | 설명 |
|-----------|------|
| **서버 내부 에러 원문** | Node stack, exception name, DB/Storage raw message, OpenAI vendor payload |
| **API key / secret** | `LLM_API_KEY`, service role key, `sk-...`, `sb_...` 등 |
| **토큰** | Authorization header 전체, access token, refresh token |
| **stack trace** | 개발·운영 환경 모두 응답 body 미포함 |

**서버 로그:** `errorHandler`에서 `console.error` — `sanitizeLogMessage()`로 key·token 패턴 마스킹.  
개발 환경(`NODE_ENV !== 'production'`)에서만 stack을 **로그**에 출력(응답에는 미포함).

**Frontend:** `readApiResponse()` → `parseApiErrorBody()`로 `body.message` 우선 파싱.  
legacy `{ ok: false, error: { message } }` 형식도 fallback으로 지원하나, Day 11 이후 신규 응답은 `{ message, code }`만 사용합니다.

---

## Frontend 표시 요약

| 영역 | 실패 시 | fallback (API message 없을 때) |
|------|---------|----------------------------------|
| 업로드 | `ImageUploader` `ErrorMessage` | `이미지 업로드에 실패했습니다. 다시 시도해 주세요.` |
| 프롬프트 구체화 | `PromptRefiner` `ErrorMessage` | `프롬프트 구체화에 실패했습니다. 다시 시도해 주세요.` |
| 이미지 생성 | `CreatePage` `ErrorMessage` | `이모티콘 생성에 실패했습니다. 다시 시도해 주세요.` |
| 갤러리 조회 | `GalleryPage` `ErrorMessage` + 다시 시도 | `이모티콘 목록을 불러오지 못했습니다. 다시 시도해 주세요.` |
| 삭제 | `GalleryPage` `ErrorMessage` | `이모티콘 삭제에 실패했습니다. 다시 시도해 주세요.` |

클라이언트 선행 검증(파일 형식·크기, 필수 입력)은 API 호출 전 `ErrorMessage`로 표시합니다.

---

## 관련 문서

- API 명세: `02-contracts/api-contract.md`
- API Key: `04-security/api-key-policy.md`
- UX 기준: `03-design/design-guide.md` (Day 11)
- 테스트: `05-roadmap/test-checklist.md` (Day 11)
