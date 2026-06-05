# API Contract

## 목적

- Frontend ↔ Backend API 인터페이스를 고정합니다.
- Cursor Agent 구현 시 “엔드포인트/요청/응답/에러 형식”을 단일 기준으로 제공합니다.

## 작성 시점

- 2026-06-02 (초안)
- 2026-06-03 (Day 4 — `POST /api/uploads/image` 명세 반영)

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
| — | Prompt refine | Bearer | 이후 | LLM 프롬프트 정제 |
| — | Image generation | Bearer | 이후 | 이미지 생성 |
| — | Gallery list | Bearer | 이후 | 갤러리 목록 |
| — | Delete | Bearer | 이후 | 삭제 |
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

- PRD: `01-prd/02-image-upload-preview.md`
- Storage: `02-contracts/storage-policy.md`
- 에러: `02-contracts/error-response.md`
- 보안: `04-security/api-key-policy.md`, `04-security/auth-rls-policy.md`
