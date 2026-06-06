# Storage Policy (Supabase Storage)

## 목적

- Storage 버킷, 오브젝트 경로 규칙, 접근 정책을 정의합니다.
- 사용자별 데이터 분리와 “삭제 시 일관성(DB/Storage)”을 보장합니다.

## 작성 시점

- 2026-06-02 (초안)
- 2026-06-03 (Day 4 — `user-uploads` 버킷·업로드 경로 규칙 반영)
- 2026-06-06 (Day 7 — `generated-emoticons` bucket·생성 결과 경로 반영)

## 스택 전제

- **업로드 주체**: Express backend (`supabaseAdmin`, service role)
- **인증**: Supabase Auth — Storage 경로의 `user_id`는 **`req.user.id`** (= JWT 검증값)만 신뢰
- **프론트**: Storage 직접 쓰기 금지 — `POST /api/uploads/image` 경유

---

# Storage 정책 문서

## 1. Storage 사용 목적

| 용도 | Bucket | 설명 |
|------|--------|------|
| 기준 이미지 업로드 | `user-uploads` | 사용자가 생성 전 업로드한 원본 |
| **생성 결과** | **`generated-emoticons`** | **AI가 생성한 이모티콘 PNG** (Day 7) |

저장된 파일은 사용자별로 분리되어야 하며, 다른 사용자의 파일에 접근할 수 없어야 한다.

---

## 2. Bucket 설정

### 2.1 `user-uploads` (기준 이미지)

| 항목 | 값 |
| ----------- | --------------------------------------- |
| Bucket name | `user-uploads` |
| Public 여부 | Private |
| 최대 파일 크기 | 5MB |
| 허용 MIME 타입 | `image/png`, `image/jpeg`, `image/webp` |

`user-uploads` bucket은 **private**으로 생성한다.

| 항목 | Day 4 구현 |
|------|------------|
| 환경변수 | `SUPABASE_UPLOAD_BUCKET` (backend `.env`, 기본값 `user-uploads`) |
| 업로드 | `supabaseAdmin.storage.from(bucket).upload(...)` |
| API | `POST /api/uploads/image` |
| Dashboard | Storage에서 `user-uploads` 버킷 사전 생성 필요 |

### 2.2 `generated-emoticons` (생성 결과)

| 항목 | 값 |
| ----------- | --------------------------------------- |
| Bucket name | `generated-emoticons` |
| Public 여부 | **Private (권장)** |
| 업로드 주체 | backend service role only |
| API | `POST /api/generations` |
| contentType | `image/png` (기본) |

**권장 전체 경로 (개념):**

```txt
generated-emoticons/{user_id}/{generation_id}.png
```

**Supabase object key** (bucket 이름 **미포함**):

```txt
{user_id}/{generation_id}.png
```

예시:

```txt
3f4c9f1e-1234-4567-89ab-111122223333/a1b2c3d4-e5f6-7890-abcd-ef1234567890.png
```

| 항목 | Day 7 구현 |
|------|------------|
| 업로드 | `backend/src/services/storage.service.js` → `uploadGeneratedEmoticon()` |
| `upsert` | `false` — 동일 `generation_id` 중복 저장 방지 |
| Read | private — backend가 **signed URL** 발급 후 `generated_image_url`에 저장 |
| Dashboard | Storage에서 `generated-emoticons` 버킷 사전 생성 필요 |

프론트는 Storage에 **직접 쓰지 않습니다.** 미리보기는 API 응답의 `generatedImageUrl`(signed URL)을 사용합니다.

---

## 3. 저장 경로 규칙

### 3.1 `user-uploads`

업로드 이미지는 사용자 ID를 기준으로 분리하여 저장한다.

```txt
{user_id}/{timestamp}-{uuid}.{ext}
```

예시:

```txt
3f4c9f1e-1234-4567-89ab-111122223333/1780000000000-a1b2c3d4-1111-2222-3333-abcdefabcdef.jpg
```

### 3.2 `generated-emoticons`

생성 결과 PNG는 **`emoticon_generations.id`** (= `generation_id`)를 파일명에 사용한다.

```txt
{user_id}/{generation_id}.png
```

- `user_id`: `req.user.id` (JWT 검증값)
- `generation_id`: `createGeneratingRecord` INSERT 시 발급된 UUID
- bucket 이름은 object key에 **포함하지 않음**

---

## 4. 경로 구성 요소 (`user-uploads`)

| 구성 요소 | 설명 |
| ----------- | -------------------------------- |
| `user_id` | Supabase Auth에서 발급된 로그인 사용자 ID (`req.user.id`) |
| `timestamp` | 업로드 시점의 `Date.now()` 값 |
| `uuid` | `crypto.randomUUID()`로 생성한 고유 ID |
| `ext` | 실제 파일 MIME 타입을 기준으로 결정한 확장자 (`file-type` magic bytes, `jpeg` → `jpg`) |

업로드 옵션: `upsert: false`, `contentType` = 검증된 MIME.

---

## 5. 파일명 규칙

원본 파일명(`originalname`)은 Storage 저장 파일명으로 **직접 사용하지 않는다**.

이유는 다음과 같다.

1. 한글, 공백, 특수문자 등으로 인한 경로 문제를 방지하기 위해서이다.
2. 같은 이름의 파일 업로드 충돌을 방지하기 위해서이다.
3. 사용자가 올린 원본 파일명에 포함된 개인정보 노출 가능성을 줄이기 위해서이다.
4. 파일 확장자 위장을 막기 위해 실제 MIME 검증 결과를 기준으로 확장자를 정하기 위해서이다.

---

## 6. 사용자별 데이터 분리

모든 업로드 파일은 반드시 로그인 사용자의 `user_id` 하위 경로에 저장한다.

백엔드는 클라이언트가 전달한 `user_id`를 **신뢰하지 않고**, 인증 토큰에서 검증된 사용자 ID를 사용해야 한다.

허용되는 저장 예시:

```txt
{authenticated_user_id}/파일명.png
```

허용하지 않는 저장 예시:

```txt
public/파일명.png
다른사용자ID/파일명.png
파일명.png
```

backend service role 업로드 시 RLS가 적용되지 않으므로, 경로 prefix는 **반드시 `req.user.id/`** 로 고정한다.  
프론트가 Storage에 직접 접근할 경우 Supabase RLS `auth.uid()` 정책 적용을 권장한다.

---

## 7. 보안 정책

Supabase **service role key**는 백엔드 환경변수에서만 사용한다.  
프론트엔드에는 service role key를 **절대 노출하지 않는다**. (상세: `04-security/api-key-policy.md`)

Storage 업로드는 다음 순서로 처리한다.

1. 백엔드에서 `Authorization` header의 access token을 검증한다.
2. 검증된 사용자 ID를 가져온다.
3. 파일 검증을 수행한다 (크기, 확장자, MIME, magic bytes).
4. `{user_id}/{timestamp}-{uuid}.{ext}` 경로로 Storage에 업로드한다.

| 작업 | Day 4 |
|------|-------|
| Upload | backend service role (인증·검증 후) |
| Read | private — signed URL 또는 backend API (이후) |
| Delete | gallery/delete 단계에서 정의 (이후) |
| Public URL | 사용하지 않음 |

---

## 8. 추후 확장

`user-uploads` 업로드 결과는 프론트 상태·`original_image_url`로 연결한다.

`generated-emoticons` object path는 `emoticon_generations.generated_image_url`(signed URL)과 같은 `generation_id` row에 연결한다.

| 필드 (DB) | Storage 연계 |
| ------------ | ----------------- |
| `original_image_url` | `user-uploads` 업로드 URL (Day 4) |
| `generated_image_url` | `generated-emoticons/{user_id}/{generation_id}.png` signed URL (Day 7) |

---

## 삭제 정책

- Day 4: 삭제 API 미구현
- 이후: DB `emoticon_generations` 삭제 시 동일 `user_id` prefix Storage 오브젝트 연동 삭제

---

## 로깅/감사 (선택)

- 업로드 실패: server log에 Supabase `error.message`만 (secret·key 미포함)
- 성공: `path`, `user_id`, `size` — PII 최소화

---

## 관련 문서

- PRD: `01-prd/02-image-upload-preview.md`, `01-prd/05-image-generation.md`
- API: `02-contracts/api-contract.md`
- DB: `02-contracts/db-schema.md`
- 보안: `04-security/api-key-policy.md`, `04-security/auth-rls-policy.md`
