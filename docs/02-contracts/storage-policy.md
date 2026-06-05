# Storage Policy (Supabase Storage)

## 목적

- Storage 버킷, 오브젝트 경로 규칙, 접근 정책을 정의합니다.
- 사용자별 데이터 분리와 “삭제 시 일관성(DB/Storage)”을 보장합니다.

## 작성 시점

- 2026-06-02 (초안)
- 2026-06-03 (Day 4 — `user-uploads` 버킷·업로드 경로 규칙 반영)

## 스택 전제

- **업로드 주체**: Express backend (`supabaseAdmin`, service role)
- **인증**: Supabase Auth — Storage 경로의 `user_id`는 **`req.user.id`** (= JWT 검증값)만 신뢰
- **프론트**: Storage 직접 쓰기 금지 — `POST /api/uploads/image` 경유

---

# Storage 정책 문서

## 1. Storage 사용 목적

사용자가 이모티콘 생성을 위해 업로드한 **기준 이미지**를 Supabase Storage에 저장한다.  
저장된 파일은 사용자별로 분리되어야 하며, 다른 사용자의 업로드 파일에 접근할 수 없어야 한다.

---

## 2. Bucket 설정

이미지 업로드에 사용하는 bucket은 다음과 같다.

| 항목 | 값 |
| ----------- | --------------------------------------- |
| Bucket name | `user-uploads` |
| Public 여부 | Private |
| 최대 파일 크기 | 5MB |
| 허용 MIME 타입 | `image/png`, `image/jpeg`, `image/webp` |

`user-uploads` bucket은 **private**으로 생성한다.  
파일 조회가 필요한 경우에는 추후 백엔드에서 로그인 사용자를 확인한 뒤 **signed URL**을 발급하는 방식으로 처리한다.

| 항목 | Day 4 구현 |
|------|------------|
| 환경변수 | `SUPABASE_UPLOAD_BUCKET` (backend `.env`, 기본값 `user-uploads`) |
| 업로드 | `supabaseAdmin.storage.from(bucket).upload(...)` |
| 허용 확장자 (업로드 검증) | `.png`, `.jpg`, `.jpeg`, `.webp` |
| Dashboard | Storage에서 `user-uploads` 버킷 사전 생성 필요 |

> 이후 단계: 생성 결과용 `generated` bucket 추가 예정.

---

## 3. 저장 경로 규칙

업로드 이미지는 사용자 ID를 기준으로 분리하여 저장한다.

```txt
{user_id}/{timestamp}-{uuid}.{ext}
```

예시:

```txt
3f4c9f1e-1234-4567-89ab-111122223333/1780000000000-a1b2c3d4-1111-2222-3333-abcdefabcdef.jpg
```

---

## 4. 경로 구성 요소

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

생성 기록 또는 갤러리 기능과 연결할 때는 Storage path를 DB 테이블에 저장한다.

예상 저장 필드:

| 필드 | 설명 |
| ------------ | ----------------- |
| `user_id` | 파일 소유자 |
| `bucket` | Storage bucket 이름 |
| `path` | Storage 내부 파일 경로 |
| `mime_type` | 파일 MIME 타입 |
| `size` | 파일 크기 |
| `created_at` | 업로드 시각 |

생성 기록(`generation_id`) 연동 시 Storage 경로 확장 예정:

```txt
user_id/{generation_id}/original.{ext}
user_id/{generation_id}/generated.{ext}
```

Day 4는 `generation_id` 없이 **user_id 직하** 업로드만 수행한다.  
DB 연동: `emoticon_generations.original_image_url` (`02-contracts/db-schema.md`)

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

- PRD: `01-prd/02-image-upload-preview.md`
- API: `02-contracts/api-contract.md`
- DB: `02-contracts/db-schema.md`
- 보안: `04-security/api-key-policy.md`, `04-security/auth-rls-policy.md`
