# API Contract

## 목적

- Frontend ↔ Backend API 인터페이스를 고정합니다.
- Cursor Agent 구현 시 “엔드포인트/요청/응답/에러 형식”을 단일 기준으로 제공합니다.

## 작성 시점

- 2026-06-02 (초안)
- 2026-06-03 (Day 4 — `POST /api/uploads/image` 명세 반영)
- 2026-06-06 (Day 6 — `POST /api/prompts/refine` 명세 반영)
- 2026-06-06 (Day 7 — `POST /api/generations` 명세 반영)
- 2026-06-07 (Day 9 — `GET /api/generations/me` 명세 반영)
- 2026-06-07 (Day 10 — `DELETE /api/generations/:id` 명세 반영)
- 2026-06-11 (갤러리 즐겨찾기 — `isFavorite` 목록 필드 · `PATCH /api/generations/:id/favorite` · `?favorite=true` 필터)

## 스택 전제

- **Frontend**: Vue 3 + Vite — `VITE_API_BASE_URL` (기본 fallback `http://localhost:3000`)
- **Backend**: Express — port `4000` (docker-compose, 직접 호출 시)
- **인증**: Supabase Auth access token → `Authorization: Bearer {access_token}`

---

## 기본 원칙

| 항목 | 규칙 |
|------|------|
| Base URL | `VITE_API_BASE_URL` + `/api/...` |
| 버전 | URL path 버전 없음 (MVP) |
| 인증 | 보호 엔드포인트는 Bearer JWT 필수 (`requireAuth`) |
| Content-Type | JSON API: `application/json` · 업로드: `multipart/form-data` |
| user_id | 클라이언트 전달값 **신뢰하지 않음** — server는 `req.user.id` 사용 |

---

## 엔드포인트 목록

| Method | Path | 인증 | Day | 설명 |
|--------|------|------|-----|------|
| GET | `/health`, `/api/health` | — | 1 | 헬스체크 |
| GET | `/api/auth/me` | Bearer | 3 | 현재 사용자 |
| **POST** | **`/api/uploads/image`** | **Bearer** | **4** | **이미지 업로드 → Supabase Storage** |
| **POST** | **`/api/prompts/refine`** | **Bearer** | **6** | **LLM 프롬프트 정제** |
| **POST** | **`/api/generations`** | **Bearer** | **7** | **이미지 생성 · DB·Storage 저장** |
| **GET** | **`/api/generations/me`** | **Bearer** | **9** | **내 생성 기록 목록 (pagination)** |
| **DELETE** | **`/api/generations/:id`** | **Bearer** | **10** | **내 생성 기록 단건 삭제** |
| **PATCH** | **`/api/generations/:id/favorite`** | **Bearer** | **11** | **즐겨찾기 상태 변경** |
| — | Download | Bearer | 이후 | 다운로드 |

---

## POST /api/uploads/image

로그인한 사용자가 이모티콘 생성을 위한 **기준 이미지**를 업로드한다.

이미지 파일은 백엔드에서 검증한 뒤 Supabase Storage의 `user-uploads` bucket에 저장한다.  
Storage 업로드는 **backend(service role)에서만** 수행한다.

---

### 1. Endpoint

```http
POST /api/uploads/image
```

---

### 2. 인증

인증이 필요하다.

프론트엔드는 Supabase Auth session에서 access token을 가져와 Authorization header에 포함해야 한다.

```http
Authorization: Bearer <access_token>
```

인증 토큰이 없거나 유효하지 않으면 `401 Unauthorized`를 반환한다.

---

### 3. Request

요청 형식은 `multipart/form-data`이다.

| 필드명 | 타입 | 필수 여부 | 설명 |
| ------- | ---- | ----- | ----------- |
| `image` | File | 필수 | 업로드할 이미지 파일 |

허용 파일 조건:

| 항목 | 허용 값 |
| -------- | --------------------------------------- |
| 확장자 | `.png`, `.jpg`, `.jpeg`, `.webp` |
| MIME 타입 | `image/png`, `image/jpeg`, `image/webp` |
| 최대 파일 크기 | 5MB |

Request 예시:

```bash
curl -X POST http://localhost:3000/api/uploads/image \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -F "image=@./sample.png"
```

> 프론트는 `VITE_API_BASE_URL`을 사용한다. backend에 직접 호출할 때는 `http://localhost:4000`을 사용한다.

Storage path 규칙: `02-contracts/storage-policy.md`

---

### 4. Success Response

#### Status

```http
201 Created
```

#### Body

```json
{
  "message": "이미지 업로드가 완료되었습니다.",
  "bucket": "user-uploads",
  "path": "user-id/1780000000000-uuid.png",
  "mimeType": "image/png",
  "size": 123456
}
```

#### Response 필드

| 필드 | 타입 | 설명 |
| ---------- | ------ | ------------------------------ |
| `message` | string | 업로드 성공 메시지 |
| `bucket` | string | 저장된 Supabase Storage bucket 이름 |
| `path` | string | Storage 내부 파일 경로 |
| `mimeType` | string | 검증된 파일 MIME 타입 |
| `size` | number | 파일 크기 (byte) |

---

### 5. Error Response

#### 400 Bad Request

파일이 없거나 허용되지 않은 파일 형식인 경우 반환한다.

```json
{
  "message": "업로드할 이미지 파일을 선택해 주세요."
}
```

```json
{
  "message": "PNG, JPG, JPEG, WEBP 이미지 파일만 업로드할 수 있습니다."
}
```

```json
{
  "message": "실제 이미지 형식이 올바르지 않습니다. PNG, JPG, WEBP 파일만 업로드할 수 있습니다."
}
```

#### 401 Unauthorized

로그인하지 않았거나 인증 토큰이 유효하지 않은 경우 반환한다.

```json
{
  "message": "로그인이 필요합니다."
}
```

#### 413 Payload Too Large

파일 크기가 5MB를 초과한 경우 반환한다.

```json
{
  "message": "이미지는 최대 5MB까지 업로드할 수 있습니다."
}
```

#### 500 Internal Server Error

Storage 저장 또는 서버 내부 처리 중 문제가 발생한 경우 반환한다.

```json
{
  "message": "이미지 저장 중 오류가 발생했습니다."
}
```

> 500 응답에 service role key·내부 secret·Supabase raw stack은 **포함하지 않는다**.

> **Day 4 구현 참고:** 현재 backend는 공통 envelope `{ ok: true, bucket, path, mimeType, size }` / `{ ok: false, error: { message } }` 및 **영문** message를 사용한다. 프론트(`uploadService.js`)는 `error.message`를 파싱한다. 위 한글 `message` 계약과 정렬은 추후 작업으로 남긴다.

---

### 6. Frontend 처리 기준

프론트엔드는 다음 방식으로 API를 호출한다.

1. Supabase Auth session에서 access token을 가져온다.
2. `FormData` 객체를 생성한다.
3. `image` 필드에 선택한 파일을 담는다.
4. `POST /api/uploads/image`로 요청한다.
5. 성공 시 업로드 결과를 상태에 저장한다.
6. 실패 시 서버에서 전달한 `message`를 화면에 표시한다.

요청 중에는 중복 업로드를 막기 위해 업로드 버튼을 비활성화한다.

| 구현 (Day 4) | 경로 |
|------|------|
| Service | `frontend/src/services/uploadService.js` → `uploadImage(file)` |
| Component | `frontend/src/components/ImageUploader.vue` |
| 성공 이벤트 | `emit('uploaded', result)` |

---

### 7. Backend 처리 기준

백엔드는 다음 순서로 요청을 처리한다.

1. Authorization header의 access token을 검증한다.
2. 검증된 사용자 ID를 `req.user.id`로 사용한다.
3. `multer`로 `multipart/form-data`의 `image` 파일을 읽는다.
4. 파일 크기, 확장자, MIME 타입을 검증한다.
5. `file-type`으로 실제 파일 시그니처를 검증한다.
6. Storage 경로를 `{user_id}/{timestamp}-{uuid}.{ext}` 형식으로 생성한다.
7. Supabase Storage `user-uploads` bucket에 업로드한다.
8. 업로드 결과를 JSON으로 반환한다.

Middleware chain: `requireAuth` → `uploadSingleImage` (multer) → `uploadImageController`

---

## POST /api/prompts/refine

로그인한 사용자가 입력한 **감정·모션·텍스트**(및 선택적 참조 이미지 URL)를 backend LLM으로 정제해  
`storyPrompt` / `finalPrompt`를 반환한다.

LLM API Key는 **backend 전용** — frontend는 본 엔드포인트만 호출한다. (`04-security/api-key-policy.md`)

---

### 1. Endpoint

```http
POST /api/prompts/refine
```

---

### 2. 인증

인증이 필요하다.

프론트엔드는 Supabase Auth session에서 access token을 가져와 Authorization header에 포함해야 한다.

```http
Authorization: Bearer <access_token>
```

인증 토큰이 없거나 유효하지 않으면 `401 Unauthorized`를 반환한다.

---

### 3. Request Body

`Content-Type: application/json`

```json
{
  "emotion": "happy",
  "motion": "wave",
  "inputText": "안녕!",
  "originalImageUrl": "https://example.com/image.png"
}
```

Request 예시:

```bash
curl -X POST http://localhost:3000/api/prompts/refine \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "emotion": "happy",
    "motion": "wave",
    "inputText": "안녕!",
    "originalImageUrl": "https://example.com/image.png"
  }'
```

> 프론트는 `VITE_API_BASE_URL`을 사용한다. backend에 직접 호출할 때는 `http://localhost:4000`을 사용한다.

---

### 4. Required Fields

| 필드 | 타입 | 설명 |
|------|------|------|
| `emotion` | string | 감정. trim 후 1자 이상 |
| `motion` | string | 모션. trim 후 1자 이상 |
| `inputText` | string | 이모티콘에 표시할 텍스트. trim 후 1자 이상, 최대 500자 |

---

### 5. Optional Fields

| 필드 | 타입 | 설명 |
|------|------|------|
| `originalImageUrl` | string | 업로드된 원본 이미지 URL. 전달 시 LLM이 캐릭터 외형 참조에 사용. 생략 가능 |

---

### 6. Success Response 200

#### Status

```http
200 OK
```

#### Body

```json
{
  "storyPrompt": "...",
  "finalPrompt": "..."
}
```

#### Response 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| `storyPrompt` | string | 상황·분위기를 설명하는 스토리 프롬프트 |
| `finalPrompt` | string | 이미지 생성 API에 전달할 최종 프롬프트 |

---

### 7. Error Response

#### 400 Bad Request

필수 필드 누락, 빈 문자열, `inputText` 길이 초과, `originalImageUrl` 타입 오류 등 검증 실패 시 반환한다.

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

```json
{
  "message": "입력값을 확인해 주세요.",
  "errors": [
    {
      "field": "inputText",
      "message": "inputText는 최대 500자까지 입력할 수 있습니다."
    }
  ]
}
```

#### 401 Unauthorized

로그인하지 않았거나 인증 토큰이 유효하지 않은 경우 반환한다.

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
    "message": "Invalid or expired access token."
  }
}
```

#### 500 Internal Server Error

LLM API 오류, 응답 파싱 실패, 타임아웃, `LLM_API_KEY` 미설정 등 서버 내부 처리 중 문제가 발생한 경우 반환한다.

```json
{
  "message": "프롬프트 구체화에 실패했습니다. 다시 시도해 주세요."
}
```

> 500 응답에 LLM API Key·OpenAI raw 응답·내부 secret은 **포함하지 않는다**.

---

### Frontend / Backend 처리 (Day 6)

| 구분 | 경로 |
|------|------|
| Frontend Service | `frontend/src/services/prompt.service.js` → `refinePrompt()` |
| Frontend Component | `frontend/src/components/PromptRefiner.vue` |
| Backend route | `backend/src/routes/prompt.routes.js` |
| Backend controller | `backend/src/controllers/prompt.controller.js` |
| Validation | `backend/src/validators/prompt.validator.js` |
| LLM | `backend/src/services/llm.service.js` |

Middleware chain: `requireAuth` → `validatePromptRefine` → `refinePromptController`

---

## POST /api/generations

로그인한 사용자가 `finalPrompt` 기반으로 **이모티콘 이미지를 생성**하고, 결과를 Supabase Storage·`emoticon_generations` 테이블에 저장한다.

외부 이미지 생성 API Key는 **backend 전용** — frontend는 본 엔드포인트만 호출한다. (`04-security/api-key-policy.md`)

---

### 1. Endpoint

```http
POST /api/generations
```

---

### 2. 인증

인증이 필요하다.

프론트엔드는 Supabase Auth session에서 access token을 가져와 Authorization header에 포함해야 한다.

```http
Authorization: Bearer <access_token>
```

인증 토큰이 없거나 유효하지 않으면 `401 Unauthorized`를 반환한다.

---

### 3. Request Body

`Content-Type: application/json`

```json
{
  "originalImageUrl": "https://example.com/image.png",
  "emotion": "happy",
  "motion": "wave",
  "inputText": "안녕!",
  "storyPrompt": "...",
  "finalPrompt": "..."
}
```

Request 예시:

```bash
curl -X POST http://localhost:4000/api/generations \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "emotion": "happy",
    "motion": "wave",
    "inputText": "안녕!",
    "storyPrompt": "A cheerful emoticon scene...",
    "finalPrompt": "A cute sticker character waving..."
  }'
```

> 프론트는 `VITE_API_BASE_URL`을 사용한다. backend에 직접 호출할 때는 `http://localhost:4000`을 사용한다.

---

### 4. Required Fields

| 필드 | 타입 | 설명 |
|------|------|------|
| `emotion` | string | 감정. trim 후 1자 이상 |
| `motion` | string | 모션. trim 후 1자 이상 |
| `inputText` | string | 이모티콘 텍스트. trim 후 1자 이상, 최대 500자 |
| `storyPrompt` | string | LLM 스토리 프롬프트. trim 후 1자 이상 |
| **`finalPrompt`** | string | **이미지 생성 API에 전달할 최종 프롬프트. trim 후 1자 이상 (필수)** |

---

### 5. Optional Fields

| 필드 | 타입 | 설명 |
|------|------|------|
| `originalImageUrl` | string | 업로드된 원본 이미지 URL. 전달 시 backend가 reference image로 다운로드 후 Images **edits** API에 전달. 생략 시 **generations**(text-to-image)만 사용 — **원본 캐릭터 보존은 보장되지 않음** |

---

### 6. Success Response 201

#### Status

```http
201 Created
```

#### Body

```json
{
  "id": "3f4c9f1e-1234-4567-89ab-111122223333",
  "generatedImageUrl": "https://...supabase.co/storage/v1/object/sign/generated-emoticons/...",
  "status": "completed"
}
```

#### Response 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | string (uuid) | `emoticon_generations.id` |
| `generatedImageUrl` | string | 생성 결과 signed URL (private bucket) |
| `status` | string | `completed` |

---

### 7. Error Response

#### 400 Bad Request

**`finalPrompt` 누락** 및 기타 필수 필드 검증 실패 시 반환한다.

```json
{
  "message": "입력값을 확인해 주세요.",
  "errors": [
    {
      "field": "finalPrompt",
      "message": "finalPrompt는 필수값입니다."
    }
  ]
}
```

#### 401 Unauthorized

로그인하지 않았거나 인증 토큰이 유효하지 않은 경우 반환한다.

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
    "message": "Invalid or expired access token."
  }
}
```

#### 500 Internal Server Error

이미지 생성 API 오류, Storage 업로드 실패, `IMAGE_GENERATION_API_KEY` 미설정, DB 갱신 실패 등 서버 내부 처리 중 문제가 발생한 경우 반환한다.  
실패 시 backend는 해당 row를 `status='failed'`로 갱신한다.

```json
{
  "message": "이모티콘 생성에 실패했습니다. 다시 시도해 주세요."
}
```

> 500 응답에 이미지 생성 API Key·service role key·vendor raw 응답은 **포함하지 않는다**.

---

### Frontend / Backend 처리 (Day 7)

| 구분 | 경로 |
|------|------|
| Frontend Service | `frontend/src/services/generation.service.js` → `createGeneration()` |
| Frontend Page | `frontend/src/pages/CreatePage.vue` |
| Backend route | `backend/src/routes/generation.routes.js` |
| Backend controller | `backend/src/controllers/generation.controller.js` |
| Validation | `backend/src/validators/generation.validator.js` |
| Image API | `backend/src/services/imageGeneration.service.js` |
| Storage | `backend/src/services/storage.service.js` |
| DB | `backend/src/services/generation.service.js` |

Middleware chain: `requireAuth` → `validateCreateGeneration` → `createGenerationController`

Backend 처리 순서: `generating` INSERT → reference image 다운로드(있을 때) → Images edits/generations → Storage 업로드 → `completed` | `failed` UPDATE

| `originalImageUrl` | Provider 호출 |
|--------------------|---------------|
| 있음 | `POST /v1/images/edits` + reference image (`input_fidelity=high`) |
| 없음 | `POST /v1/images/generations` (text-to-image only, 원본 보존 미보장) |

DB 저장: INSERT 시 `original_image_url`, 성공 UPDATE 시 `generated_image_url` (`02-contracts/db-schema.md`)

Storage path: `02-contracts/storage-policy.md` — object key `{user_id}/{generation_id}.png`

---

## GET /api/generations/me

로그인 사용자의 **본인** `emoticon_generations` 목록을 `created_at` 최신순으로 페이지네이션 조회합니다.

> 라우트 등록 순서: **`GET /me`는 동적 path(`/:id` 등)보다 먼저** 등록합니다. (`generation.routes.js`)

---

### 1. Endpoint

```http
GET /api/generations/me?page=1&limit=12
```

---

### 2. 인증

`Authorization: Bearer <access_token>` 필수. 미인증·무효 토큰 → `401`.

---

### 3. Query Parameters

| 파라미터 | 타입 | 기본값 | 설명 |
|----------|------|--------|------|
| `page` | integer | `1` | 페이지 번호. **최소 1** (잘못된 값은 1로 처리) |
| `limit` | integer | `12` | 페이지 크기. **최소 1, 최대 50** |
| `collectionId` | string | — | 폴더 필터. uuid 또는 `uncategorized`(미분류) |
| `favorite` | boolean | — | `true`이면 `is_favorite = true`인 갤러리 항목만 조회 |

예시:

```bash
curl -i "http://localhost:4000/api/generations/me?page=1&limit=12" \
  -H "Authorization: Bearer ACCESS_TOKEN"

curl -i "http://localhost:4000/api/generations/me?favorite=true&page=1&limit=12" \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

> `Bearer`는 **대문자 B** 필수. 클라이언트는 `userId` query를 보내지 않습니다 — server는 `req.user.id`만 사용.

---

### 4. Success Response 200

#### Body

```json
{
  "items": [
    {
      "id": "3f4c9f1e-1234-4567-89ab-111122223333",
      "status": "completed",
      "savedToGallery": true,
      "isFavorite": false,
      "collectionId": null,
      "originalImageUrl": "https://...",
      "generatedImageUrl": "https://...supabase.co/storage/v1/object/sign/...",
      "emotion": "기쁨",
      "motion": "손 흔들기",
      "inputText": "안녕!",
      "storyPrompt": "...",
      "finalPrompt": "...",
      "createdAt": "2026-06-07T08:00:00.000Z",
      "updatedAt": "2026-06-07T08:01:00.000Z"
    }
  ],
  "page": 1,
  "limit": 12,
  "total": 25,
  "hasMore": true
}
```

#### Response 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| `items` | array | 현재 페이지 생성 기록 (camelCase) |
| `page` | number | 요청에 사용된 페이지 |
| `limit` | number | 요청에 사용된 limit |
| `total` | number | 본인 전체 row 수 |
| `hasMore` | boolean | `page * limit < total` |

정렬: `created_at DESC`

---

### 5. Error Response

#### 401 Unauthorized

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

#### 500 Internal Server Error

DB 조회 실패 등:

```json
{
  "message": "이모티콘 목록을 불러오지 못했습니다. 다시 시도해 주세요."
}
```

---

### Frontend / Backend 처리 (Day 9)

| 구분 | 경로 |
|------|------|
| Frontend Service | `frontend/src/services/generation.service.js` → `fetchMyGenerations()` |
| Frontend Page | `frontend/src/pages/GalleryPage.vue` |
| Backend route | `backend/src/routes/generation.routes.js` — `GET /me` (POST `/`보다 먼저) |
| Backend controller | `generation.controller.js` → `getMyGenerations` |
| DB | `generation.service.js` → `listMyGenerations` — `.eq('user_id', userId)` |

Middleware chain: `requireAuth` → `getMyGenerations`

목록 API는 `saved_to_gallery = true`인 row만 반환합니다. `favorite=true` 쿼리는 추가로 `is_favorite = true`를 필터합니다.

---

## PATCH /api/generations/:id/favorite

로그인 사용자의 **본인** `emoticon_generations` row 1건의 즐겨찾기 상태를 갱신합니다.

> 라우트 등록 순서: **`GET /me`**, **`POST /bulk-delete`** 보다 뒤 · **`DELETE /:id`** 보다 앞 (`generation.routes.js`)

---

### 1. Endpoint

```http
PATCH /api/generations/:id/favorite
```

---

### 2. 인증

`Authorization: Bearer <access_token>` 필수. 미인증·무효 토큰 → `401`.

---

### 3. Path Parameters

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `id` | uuid | 대상 `emoticon_generations.id` |

---

### 4. Request Body

`Content-Type: application/json`

```json
{
  "isFavorite": true
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `isFavorite` | boolean | Yes | `true` 즐겨찾기 추가 · `false` 해제 |

예시:

```bash
curl -i -X PATCH "http://localhost:4000/api/generations/GENERATION_ID/favorite" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isFavorite": true}'
```

> 클라이언트는 body·query에 `userId`를 보내지 않습니다 — server는 `req.user.id`만 사용합니다.

---

### 5. Success Response 200

```json
{
  "id": "3f4c9f1e-1234-4567-89ab-111122223333",
  "isFavorite": true
}
```

---

### 6. Error Response

#### 400 Bad Request

`isFavorite`가 boolean이 아닌 경우:

```json
{
  "message": "입력값을 확인해 주세요.",
  "errors": [
    {
      "field": "isFavorite",
      "message": "isFavorite는 boolean 값이어야 합니다."
    }
  ]
}
```

#### 401 Unauthorized

로그인하지 않았거나 인증 토큰이 유효하지 않은 경우 반환한다.

#### 404 Not Found

`id`가 존재하지 않거나, **다른 사용자 소유**이거나, `saved_to_gallery = false`인 경우 동일 메시지:

```json
{
  "message": "이모티콘을 찾을 수 없습니다."
}
```

#### 500 Internal Server Error

```json
{
  "message": "즐겨찾기 변경에 실패했습니다. 다시 시도해 주세요."
}
```

---

### Frontend / Backend 처리

| 구분 | 경로 |
|------|------|
| Frontend composable | `frontend/src/composables/useFavorites.js` |
| Frontend service | `frontend/src/services/generation.service.js` → `patchGenerationFavorite()` |
| Frontend UI | `GalleryPage.vue` · `EmoticonCard.vue` 별표 버튼 |
| Backend route | `generation.routes.js` — `PATCH /:id/favorite` |
| Backend controller | `generation.controller.js` → `patchGenerationFavorite` |
| Backend service | `generation.service.js` → `updateGenerationFavorite` — `.eq('id', id).eq('user_id', req.user.id)` |

Middleware chain: `requireAuth` → `validateGenerationIdParam` → `validatePatchGenerationFavorite` → `patchGenerationFavorite`

---

## DELETE /api/generations/:id

로그인 사용자의 **본인** `emoticon_generations` row 1건을 삭제합니다.  
연결된 `generated-emoticons` Storage object도 backend에서 삭제합니다.  
**original upload image**(`user-uploads`)는 Day 10 MVP에서 삭제하지 않습니다.

> 라우트 등록 순서: **`GET /me`는 `DELETE /:id`보다 먼저** 등록합니다. (`generation.routes.js`)

---

### 1. Endpoint

```http
DELETE /api/generations/:id
```

---

### 2. 인증

`Authorization: Bearer <access_token>` 필수. 미인증·무효 토큰 → `401`.

---

### 3. Path Parameters

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `id` | uuid | 삭제할 `emoticon_generations.id` |

예시:

```bash
curl -i -X DELETE "http://localhost:4000/api/generations/GENERATION_ID" \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

> 클라이언트는 body·query에 `userId`를 보내지 않습니다 — server는 `req.user.id`만 사용.

---

### 4. Success Response 200

#### Body

```json
{
  "success": true
}
```

---

### 5. Error Response

#### 401 Unauthorized

로그인하지 않았거나 인증 토큰이 유효하지 않은 경우 반환한다.

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
    "message": "Invalid or expired access token."
  }
}
```

#### 404 Not Found

`id`가 존재하지 않거나, **다른 사용자 소유**인 경우 반환한다.  
두 경우 모두 동일한 메시지로 응답해 **id 존재 여부를 노출하지 않습니다**.

```json
{
  "message": "이모티콘을 찾을 수 없습니다."
}
```

#### 500 Internal Server Error

DB 삭제 실패 등 서버 내부 처리 중 문제가 발생한 경우 반환한다.

```json
{
  "message": "이모티콘 삭제에 실패했습니다. 다시 시도해 주세요."
}
```

> Storage object 삭제 실패는 `console.warn`만 남기고 DB 삭제 흐름을 우선합니다. (`02-contracts/storage-policy.md`)

---

### Frontend / Backend 처리 (Day 10)

| 구분 | 경로 |
|------|------|
| Frontend Service | `frontend/src/services/generation.service.js` → `deleteGeneration()` |
| Frontend Page | `frontend/src/pages/GalleryPage.vue` |
| Frontend Card | `frontend/src/components/EmoticonCard.vue` |
| Backend route | `backend/src/routes/generation.routes.js` — `DELETE /:id` |
| Backend controller | `generation.controller.js` → `deleteGeneration` |
| Backend service | `generation.service.js` → `deleteMyGeneration` |
| Storage | `storage.service.js` → `deleteGeneratedEmoticonByUrl` |

Middleware chain: `requireAuth` → `deleteGeneration`

Backend 처리 순서: `id` + `user_id` 조회 → `generated_image_url` Storage 삭제 → DB row DELETE

---

## 상태 코드 규칙

| 코드 | 용도 |
|------|------|
| 200 | 조회 성공 |
| 201 | 생성 성공 (업로드 포함) |
| 204 | 본문 없음 삭제 등 |
| 400 | validation, 잘못된 요청 |
| 401 | 미인증 |
| 403 | 권한 없음 |
| 404 | 리소스 없음 |
| 409 | conflict |
| 413 | payload too large (업로드 5MB) |
| 429 | rate limit (선택) |
| 500 | server / Storage 오류 |

---

## Rate limit / idempotency (선택)

- Day 4: 미적용
- 업로드 path에 UUID 포함 → 동일 파일 재업로드 시 **새 object** 생성

---

## 관련 문서

- PRD (업로드): `01-prd/02-image-upload-preview.md`
- PRD (LLM 정제): `01-prd/04-llm-prompt-refine.md`
- PRD (이미지 생성): `01-prd/05-image-generation.md`
- PRD (갤러리·삭제): `01-prd/07-gallery-delete.md`
- Storage: `02-contracts/storage-policy.md`
- 에러: `02-contracts/error-response.md`
- 보안: `04-security/api-key-policy.md`, `04-security/auth-rls-policy.md`
