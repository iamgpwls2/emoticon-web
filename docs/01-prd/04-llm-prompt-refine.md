# 04. LLM Prompt Refine (PRD)

## 목적

Day 6에서 구현한 **LLM 프롬프트 구체화** 기능의 요구사항을 정의합니다.  
사용자가 입력한 감정·모션·텍스트(및 업로드 이미지)를 backend LLM이 해석해, 이미지 생성 API에 전달할 **storyPrompt** / **finalPrompt**를 생성합니다.

## 작성 시점

- 2026-06-06 (Day 6)

## 구현 위치

| 구성요소 | 경로 |
|----------|------|
| 생성 페이지 | `frontend/src/pages/CreatePage.vue` |
| 프롬프트 구체화 UI | `frontend/src/components/PromptRefiner.vue` |
| Frontend API 호출 | `frontend/src/services/prompt.service.js` |
| API 라우트 | `backend/src/routes/prompt.routes.js` |
| 컨트롤러 | `backend/src/controllers/prompt.controller.js` |
| 요청 검증 | `backend/src/validators/prompt.validator.js` |
| LLM 호출 | `backend/src/services/llm.service.js` |

---

## 1. 기능 목적

로그인한 사용자가 **감정·모션·텍스트**를 입력한 뒤, **「프롬프트 구체화하기」** 버튼으로 LLM 정제를 요청한다.

| 목표 | 설명 |
|------|------|
| 의도 보존 | 사용자가 선택·입력한 감정·모션·텍스트 의미를 유지한다. |
| 맥락 구체화 | `storyPrompt`로 상황·분위기를 자연어로 정리한다. |
| 생성 준비 | `finalPrompt`로 이미지 생성 API에 바로 넘길 수 있는 시각적 프롬프트를 만든다. |
| 사용자 수정 | `finalPrompt`는 textarea에서 **직접 수정**할 수 있다. |
| 보안 | LLM API Key는 **backend 전용** — 브라우저·frontend env에 노출하지 않는다. |

**흐름 위치:** Day 4 이미지 업로드 → Day 5 감정·모션·텍스트 입력 → **본 단계(LLM 정제)** → 이후 이미지 생성 (`01-prd/05-image-generation.md`)

---

## 2. LLM 입력값

Frontend는 `POST /api/prompts/refine` body로 아래 필드를 전송한다.  
Backend `validatePromptRefine` 통과 후 `llm.service.js`의 user prompt에 그대로 반영된다.

| 필드 | 출처 | 필수 | 설명 |
|------|------|------|------|
| `emotion` | `PromptForm` 선택값 | **필수** | 감정. `03-emoticon-input.md` 옵션(기쁨, 슬픔, 화남, 놀람, 부끄러움, 신남) 중 하나. |
| `motion` | `PromptForm` 선택값 | **필수** | 모션. `03-emoticon-input.md` 옵션(손 흔들기, 점프, 울기, 박수, 하트 보내기, 고개 숙이기) 중 하나. |
| `inputText` | `PromptForm.text` | **필수** | 이모티콘에 표시할 텍스트. UI상 최대 30자(`EMOTICON_TEXT_MAX_LENGTH`). Backend 검증 상한 500자. |
| `originalImageUrl` | `CreatePage` computed | **선택** | 업로드된 원본 이미지 URL. 있으면 LLM에 캐릭터 외형 참조로 전달. |

### originalImageUrl 결정 규칙

`CreatePage`의 `originalImageUrl` computed 기준:

1. `uploadedImage.url`이 있으면 trim 후 사용
2. 없으면 `uploadedImage.bucket` + `uploadedImage.path`로 Supabase Storage **public URL** 생성
3. 이미지 미업로드 시 빈 문자열 → API body에서는 `undefined`로 생략 가능

### Frontend → Backend 매핑

```txt
PromptForm.text  →  inputText  (API body)
promptForm.emotion / motion  →  emotion / motion
originalImageUrl  →  originalImageUrl (선택)
```

### 인증

- `requireAuth` 미들웨어: Bearer JWT(Supabase access token) 필수
- 미로그인 시 frontend `prompt.service.js`에서 요청 전 에러

---

## 3. LLM 출력값

Backend LLM 응답(JSON)을 파싱해 API 응답으로 반환한다.

| 필드 | 타입 | 설명 |
|------|------|------|
| `storyPrompt` | `string` | 상황·분위기를 설명하는 스토리 프롬프트. **읽기 전용** UI(`<p>`)로 표시. |
| `finalPrompt` | `string` | 이미지 생성용 최종 프롬프트. **textarea**로 표시·수정 가능. |

### API 응답 (성공)

```http
POST /api/prompts/refine
Authorization: Bearer <access_token>
Content-Type: application/json

200 OK
{
  "storyPrompt": "...",
  "finalPrompt": "..."
}
```

### DB 저장 필드 (후속 생성 단계)

| API (camelCase) | DB (snake_case) |
|-----------------|-----------------|
| `storyPrompt` | `story_prompt` |
| `finalPrompt` | `final_prompt` |

→ `02-contracts/db-schema.md`

### Parent 상태 연동

`PromptRefiner`는 정제 성공 시 `update:storyPrompt`, `update:finalPrompt` emit.  
`CreatePage`가 `storyPrompt` / `finalPrompt` ref에 보관해 다음 단계(이미지 생성)에 사용한다.

---

## 4. storyPrompt 기준

LLM system prompt(`llm.service.js` → `buildSystemPrompt`) 및 파싱 규칙 기준.

| 항목 | 기준 |
|------|------|
| 역할 | 감정·모션·텍스트를 바탕으로 **이모티콘 장면의 상황·분위기**를 자연어로 설명 |
| 포함 요소 | 누가/무엇, 감정, 동작, (선택) 이미지 위 텍스트 |
| 언어 | **한국어**로 자연스럽게 작성 |
| 참조 이미지 | `originalImageUrl`이 있으면 **업로드한 원본 캐릭터를 유지**한다는 의미 포함 |
| 안전 | 사용자 의도 보존, **안전·가족 친화적** 표현 |
| 형식 | non-empty `string`, trim 후 1자 이상 |
| UI | 정제 성공 후에만 표시. 사용자 **직접 편집 불가** |

**예시 방향 (LLM 생성, 고정 문구 아님):**

> 업로드한 하얀 구름 곰돌이 캐릭터가 기쁜 마음으로 점프하며 「신난당」이라고 외치는 이모티콘 장면. 원본 캐릭터의 외형과 정체성을 그대로 유지합니다.

---

## 5. finalPrompt 기준

| 항목 | 기준 |
|------|------|
| 역할 | **이미지 생성 API**에 전달할 구체적·시각적 프롬프트 |
| 포함 요소 | 시각적 스타일, 캐릭터 포즈, 표정, 구도, 텍스트 오버레이(있을 경우) |
| 참조 이미지 | `originalImageUrl`이 있으면 **provided reference image** 기반 생성을 명시 |
| 언어 | **영어 only** — 이미지 생성 API에 바로 전달 가능해야 함 |
| 안전 | storyPrompt와 동일한 안전·가족 친화 원칙 |
| 형식 | non-empty `string`, trim 후 1자 이상 |
| UI | 정제 **성공 후** textarea 표시. 사용자 **수정 가능** — `@input` 시 `update:finalPrompt` emit |

**예시 방향 (LLM 생성, 고정 문구 아님):**

> Create an emoticon based on the provided reference image. Preserve the same white fluffy cloud-bear character design, rounded silhouette, simple black facial features, and soft handmade texture. Do not change the character into a human, boy, girl, or different animal. Only modify the pose and emotion: make the same character look joyful and jumping in excitement. Add the Korean text "신난당" at the bottom in a cute playful style. Use a clean emoticon-style composition.

---

## 원본 캐릭터 보존 기준

LLM은 최종 이미지 생성 프롬프트를 만들 때 업로드한 원본 이미지의 캐릭터 정체성을 유지해야 한다.

**필수 조건:**

- 원본 이미지의 캐릭터 종류, 색상, 실루엣, 얼굴 특징을 유지한다.
- 원본 캐릭터가 구름형/곰돌이형/동물형이면 사람 캐릭터로 바꾸지 않는다.
- 감정, 모션, 텍스트만 추가하거나 변경한다.
- finalPrompt에는 reference image 기반 생성 조건을 포함한다.
- finalPrompt에는 다른 캐릭터로 변경하지 말라는 negative instruction을 포함한다.

**구현 시 추가 기준 (`originalImageUrl`이 있을 때):**

| 구분 | 필수 의미 |
|------|-----------|
| **finalPrompt (영어)** | `provided reference image` / `reference image` 기반 생성 |
| **finalPrompt (영어)** | `preserve the same original character design` — 색상·실루엣·형태·얼굴 특징 유지 |
| **finalPrompt (영어)** | 감정·동작·텍스트만 변경 |
| **finalPrompt (영어)** | `do not change into a human`, `boy`, `girl`, `different animal` 금지 |
| **storyPrompt (한국어)** | 업로드한 원본 캐릭터/외형 유지 의미 포함 |

### Backend 보조 로직

`llm.service.js`의 `applyCharacterPreservationGuards()`는 LLM 응답 후, `originalImageUrl`이 있을 때 위 필수 의미가 누락되면 **안전하게 보강**한다.

- API 응답 구조(`storyPrompt`, `finalPrompt`)는 변경하지 않는다.
- `originalImageUrl`이 없으면 reference image 관련 문구를 추가하지 않는다.

### Frontend 전달 확인

| 경로 | 동작 |
|------|------|
| `CreatePage.vue` | `uploadedImage` → `originalImageUrl` computed |
| `PromptRefiner.vue` | `originalImageUrl?.trim()`을 `refinePrompt()`에 전달 |
| `prompt.service.js` | 값이 있을 때만 body에 `originalImageUrl` 포함 |
| `prompt.validator.js` | 빈 문자열은 제거, trim된 URL만 controller로 전달 |

**LLM 응답 형식 (backend 강제):**

- OpenAI `response_format: { type: 'json_object' }`
- JSON 키: `storyPrompt`, `finalPrompt`만 (markdown fence 제거 후 파싱)
- 파싱 실패 또는 빈 문자열 → 500 처리 (`6. 실패 동작` 참고)

---

## 6. 실패 동작

### Backend 검증 실패 (400)

`validatePromptRefine` 미통과 시:

```json
{
  "message": "입력값을 확인해 주세요.",
  "errors": [
    { "field": "emotion", "message": "emotion은 필수값입니다." }
  ]
}
```

| field | 조건 |
|-------|------|
| `emotion` | trim 후 비어 있으면 안 됨 |
| `motion` | trim 후 비어 있으면 안 됨 |
| `inputText` | trim 후 비어 있으면 안 됨, 최대 500자 |
| `originalImageUrl` | 전달 시 `string` 타입 |

### LLM / 서버 오류 (500)

| 원인 | Backend 처리 |
|------|----------------|
| `LLM_API_KEY` 미설정 | `LLM request failed.` → 500 |
| OpenAI HTTP non-2xx | status·error type만 서버 로그, 클라이언트에는 일반 메시지 |
| 응답 본문 비어 있음 | 500 |
| JSON 파싱 실패 | 500 |
| `storyPrompt` / `finalPrompt` 누락·빈 문자열 | 500 |
| 30초 타임아웃 (`LLM_TIMEOUT_MS`) | `LLM request timed out.` → 500 |
| 기타 네트워크 오류 | 500 |

**클라이언트 응답 메시지 (500):**

```txt
프롬프트 구체화에 실패했습니다. 다시 시도해 주세요.
```

**서버 로그:** `refinePrompt failed (user=<userId>): <error.message>` — API Key·전체 LLM 응답 본문은 로그에 남기지 않는다.

### Frontend UX (실패)

| 항목 | 동작 |
|------|------|
| 오류 표시 | `ErrorMessage`: 「프롬프트 구체화에 실패했습니다. 다시 시도해 주세요.」 |
| 이전 결과 | 실패 시 **기존** `storyPrompt` / `finalPrompt` 유지(덮어쓰지 않음) |
| 재시도 | 버튼 다시 클릭 가능 (`loading` 해제 후) |
| 인증 실패 | 세션 없음 → `prompt.service.js` throw (동일 사용자 메시지 또는 서버 message) |

---

## 7. loading 및 disabled 처리 기준

### 「프롬프트 구체화하기」 버튼

```txt
canRefine = emotion.trim && motion.trim && inputText.trim
isButtonDisabled = !canRefine || loading
```

| 상태 | 조건 | UI |
|------|------|-----|
| **disabled** | `emotion` / `motion` / `inputText` 중 하나라도 trim 후 비어 있음 | opacity 0.55, `cursor: not-allowed`, 클릭 무시 |
| **disabled** | `loading === true` (LLM 요청 진행 중) | 동일 + 중복 요청 방지 |
| **enabled** | 위 세 필드 모두 유효 + `loading === false` | 클릭 시 `handleRefine` 실행 |

> `originalImageUrl` / 이미지 업로드 여부는 **구체화 버튼 disabled에 포함하지 않는다.**  
> (이미지는 다음 단계·생성에 필수이나, LLM 정제는 텍스트 입력만으로도 요청 가능)

### loading 표시

| 항목 | 기준 |
|------|------|
| 시작 | `handleRefine` 진입 직후 `loading = true` |
| 종료 | 성공·실패 모두 `finally`에서 `loading = false` |
| UI | `role="status"` 문구: 「프롬프트를 구체화하는 중입니다...」 |
| 버튼 | loading 중 **disabled** (위 표 참고) |

### 결과 영역 표시

| UI | 표시 조건 |
|----|-----------|
| 스토리 프롬프트 (`<p>`) | `storyPrompt` 값이 있을 때 |
| 최종 프롬프트 (`<textarea>`) | `refined === true` (정제 **성공 1회 이후**) |

### 「다음 단계」 버튼 (CreatePage)

LLM 정제와 **독립**. Day 5와 동일:

```txt
disabled = !isPromptFormComplete({ emotion, motion, text, hasImage })
```

- `storyPrompt` / `finalPrompt` 완료 여부는 **다음 단계 버튼 disabled에 포함하지 않음** (MVP: 정제는 선택적 단계).

---

## 8. LLM API key backend 전용 원칙

| 원칙 | 내용 |
|------|------|
| 저장 위치 | `backend/.env` — **`LLM_API_KEY`**, (선택) **`LLM_MODEL`** |
| Frontend 금지 | `frontend/.env`, `VITE_*`, Vue 번들·브라우저 코드에 LLM Key **포함 금지** |
| 호출 주체 | `backend/src/services/llm.service.js`만 OpenAI Chat Completions 호출 |
| Frontend 경로 | `prompt.service.js` → **자사 backend** `POST /api/prompts/refine` 만 호출 |
| 인증 | `requireAuth` — 로그인 사용자만 LLM 비용·쿼터 사용 |
| 로그 | API Key 값·Authorization 헤더 **로그 출력 금지** |
| Git | `backend/.env` 커밋 금지. placeholder는 `backend/.env.example`만 |

### 환경 변수

| 변수 | 필수 | 기본값 | 설명 |
|------|------|--------|------|
| `LLM_API_KEY` | **Yes** | — | OpenAI API Key. 미설정 시 500 |
| `LLM_MODEL` | No | `gpt-4o-mini` | Chat completions 모델 |

### 관련 보안 문서

- `04-security/api-key-policy.md` — LLM / Image API Key backend-only 정책
- Docker: `env_file: ./backend/.env`, compose YAML에 secret 하드코딩 금지

---

## 9. 검증 체크리스트 (Day 6)

- [ ] 감정·모션·텍스트 입력 후 「프롬프트 구체화하기」 활성화
- [ ] 필수 입력 미완 시 구체화 버튼 disabled
- [ ] 클릭 시 loading 문구 + 버튼 disabled, 완료 후 해제
- [ ] 성공 시 storyPrompt(읽기 전용) + finalPrompt(textarea) 표시
- [ ] finalPrompt textarea 수정 시 CreatePage 상태 반영
- [ ] LLM/서버 오류 시 사용자 메시지 + 재시도 가능
- [ ] Network 탭·소스에 OpenAI Key / `LLM_API_KEY` 노출 없음
- [ ] 미로그인 시 backend 401 (또는 frontend 선행 차단)

---

## 관련 문서

- 입력 PRD: `01-prd/03-emoticon-input.md`
- 이미지 업로드: `01-prd/02-image-upload-preview.md`
- 이미지 생성: `01-prd/05-image-generation.md`
- API Key: `04-security/api-key-policy.md`
- DB: `02-contracts/db-schema.md`
- 사용자 흐름: `00-project/00-03-user-flow.md`
