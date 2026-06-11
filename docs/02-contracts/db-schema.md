# DB Schema (Supabase Postgres)

## 목적

- Supabase(Postgres) 테이블·제약·인덱스의 **단일 기준**을 정의합니다.
- RLS 정책은 `04-security/auth-rls-policy.md`와 함께 유지·검증합니다.

## 작성 시점

- 2026-06-02 (초안)
- 2026-06-03 (Day 3 — `emoticon_generations` 본문 반영)
- 2026-06-06 (Day 7 — `status` 값 `generating` · 생성 파이프라인 반영)
- 2026-06-11 (갤러리 즐겨찾기 — `is_favorite` 컬럼 반영)

## 스택 전제

- **Vue 3 + Vite** (frontend), **Express** (backend), **Supabase Auth/Postgres**, **Docker Compose** 개발 환경
- 사용자 식별: Supabase Auth `auth.users.id` (= JWT `sub`, backend `req.user.id`)

---

## 원칙

| 원칙 | 설명 |
|------|------|
| 사용자별 분리 | 모든 사용자 데이터는 `user_id` (= `auth.uid()`) 기준 |
| 소유권 FK | `user_id` → `auth.users(id)` 참조, `ON DELETE CASCADE` |
| 감사 필드 | `created_at`(생성 시각), `updated_at`(마지막 변경 시각) |
| RLS 필수 | 애플리케이션 버그와 무관하게 DB에서 타 사용자 데이터 차단 |

---

## `emoticon_generations`

사용자별 이모티콘 생성 기록을 저장하는 테이블입니다.  
모든 데이터는 `user_id`를 기준으로 분리되며, `auth.users(id)`를 참조합니다.

- 업로드 원본 URL·사용자 입력(감정/동작/텍스트)·LLM·이미지 API 프롬프트·결과 URL을 한 row에 연결
- `status`로 생성 파이프라인(`generating` → `completed` | `failed`) 추적
- 갤러리 목록·삭제·다운로드 API의 DB 기준 테이블 (`01-prd/05-image-generation.md`, `07-gallery-delete.md`)

### 컬럼 정의

| 컬럼 | 타입 | Null 허용 | 설명 |
|------|------|----------:|------|
| `id` | `uuid` | No | 생성 기록 고유 ID. PK, `gen_random_uuid()` 기본값 |
| `user_id` | `uuid` | No | Supabase Auth 사용자 ID, `auth.users(id)` 참조 |
| `original_image_url` | `text` | Yes | 사용자가 업로드한 원본 이미지 URL (참조·감사용) |
| `generated_image_url` | `text` | Yes | **이미지 생성 성공 시** Storage signed URL 등 결과 이미지 URL. `status='completed'`일 때 설정 |
| `emotion` | `text` | Yes | 사용자가 입력한 감정 |
| `motion` | `text` | Yes | 사용자가 입력한 동작 |
| `input_text` | `text` | Yes | 사용자가 입력한 텍스트 |
| `story_prompt` | `text` | Yes | LLM이 구체화한 스토리/설명 프롬프트 |
| `final_prompt` | `text` | Yes | 이미지 생성 API에 전달한 최종 프롬프트 |
| `status` | `text` | No | 생성 상태. Day 7 MVP: `generating` · `completed` · `failed` |
| `saved_to_gallery` | `boolean` | No | 갤러리 저장 여부. 기본 `false` — 사용자가 「갤러리에 저장」 시 `true` |
| `is_favorite` | `boolean` | No | 즐겨찾기 여부. 기본 `false` — `PATCH /api/generations/:id/favorite`로 갱신 |
| `collection_id` | `uuid` | Yes | 소속 폴더(`emoticon_collections.id`). 미분류는 `null` |
| `error_message` | `text` | Yes | **생성 실패 시** 원인 요약(사용자·개발자 확인용). API key·vendor raw 오류 미포함. `status='failed'`일 때 설정 |
| `created_at` | `timestamptz` | No | 생성 기록 생성 시각. `now()` 기본값 |
| `updated_at` | `timestamptz` | No | 생성 기록 수정 시각. status·URL 변경 시 갱신 |

### `status` 값 (Day 7 MVP)

| 값 | 의미 |
|----|------|
| `generating` | `POST /api/generations` 수신 후 INSERT. 이미지 생성·Storage 업로드 처리 중 |
| `completed` | 생성·업로드 성공. `generated_image_url` 설정 |
| `failed` | 이미지 생성 또는 Storage 업로드 실패. `error_message` 설정 |

상태 전이: `generating` → `completed` | `failed`  
요청 시작 시 INSERT(`generating`) → 성공/실패 UPDATE.

> 초안 DDL의 `pending` · `processing`은 Day 7 구현에서 사용하지 않습니다. DB CHECK 제약은 `generating`을 포함하도록 마이그레이션합니다.

### `error_message` · `generated_image_url`

| 컬럼 | 설정 시점 | 내용 |
|------|-----------|------|
| `generated_image_url` | `markGenerationCompleted` | `generated-emoticons` bucket object의 signed URL |
| `error_message` | `markGenerationFailed` | 안전한 실패 요약 (예: `Image generation request failed.`) |
| `error_message` | `markGenerationCompleted` | `null`로 초기화 |

모든 UPDATE는 `.eq('id', generationId).eq('user_id', userId)`로 **본인 record만** 갱신합니다.

### 데이터 분리 기준

- 모든 생성 기록은 **`user_id` 기준**으로 사용자별 분리합니다.
- 클라이언트에서 전달된 `user_id`는 **신뢰하지 않습니다**.
- Backend에서는 인증 미들웨어에서 검증된 **`req.user.id`** 를 기준으로 저장·조회·수정·삭제합니다.
- RLS·Backend 상세: `04-security/auth-rls-policy.md`

### `created_at` · `updated_at`

- **`created_at`**: 레코드 최초 INSERT 시각. 갤러리 정렬·감사용. 이후 변경하지 않음.
- **`updated_at`**: status 변경, 프롬프트·URL 저장 등 마지막 UPDATE 시각. 트리거 또는 애플리케이션에서 갱신.

### DDL (Supabase SQL Editor / 마이그레이션 참고)

```sql
create table public.emoticon_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  original_image_url text,
  generated_image_url text,
  emotion text,
  motion text,
  input_text text,
  story_prompt text,
  final_prompt text,
  status text not null default 'generating'
    check (status in ('generating', 'completed', 'failed')),
  saved_to_gallery boolean not null default false,
  is_favorite boolean not null default false,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index emoticon_generations_user_id_created_at_idx
  on public.emoticon_generations (user_id, created_at desc);

-- updated_at 자동 갱신 (선택)
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger emoticon_generations_updated_at
  before update on public.emoticon_generations
  for each row execute function public.set_updated_at();
```

---

## RLS · Storage 연계

- 테이블 RLS: `04-security/auth-rls-policy.md`
- Storage 경로 규칙: `02-contracts/storage-policy.md` — 업로드 `user-uploads`, 생성 결과 `generated-emoticons`
- URL 컬럼(`original_image_url`, `generated_image_url`)은 Storage signed URL 또는 public URL을 저장할 수 있음

---

## 관련 문서

- API: `02-contracts/api-contract.md`
- 보안: `04-security/auth-rls-policy.md`, `04-security/api-key-policy.md`
- 일정: `05-roadmap/14-days-checklist.md` (Day 3)
