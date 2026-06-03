# 00-03. User Flow

## 목적
- 사용자 시나리오를 페이지/라우트/상태 전이 관점으로 정리합니다.
- “보호 라우트”, “권한 없는 접근”, “에러/재시도” UX 기준을 세웁니다.

## 작성 시점
- 2026-06-02 (초안 본문·라우트 표 보강)

---

## 주요 용어

| 용어 | 설명 |
|------|------|
| Anonymous | 로그인하지 않은 사용자 |
| Authenticated | Supabase Auth로 로그인한 사용자 |
| Upload asset | 생성에 쓰는 원본 업로드 이미지 |
| Generated result | AI가 생성한 이모티콘 결과 파일 |

---

## 라우트 표 (초안)

| path | name (예시) | 접근 | 설명 |
|------|-------------|------|------|
| `/` | Home | Public | 랜딩·서비스 소개, 로그인 유도 |
| `/register` | Register | Public | 회원가입 |
| `/login` | Login | Public | 로그인 |
| `/create` | Create | **Protected** | 업로드 → 입력 → 생성 플로우 |
| `/gallery` | Gallery | **Protected** | 내 생성 결과 목록 |
| `/gallery/:id` | GalleryDetail | **Protected** | 단건 상세·다운로드·삭제 (선택) |
| `*` | NotFound | Public | 404 |

**보호 라우트 (Protected):** `/create`, `/gallery`, `/gallery/:id`  
- 미로그인 접근 시 → `/login?redirect=<원래 path>` (권장)
- 로그인 후 → redirect 복귀

**헤더/네비 (초안):** 로그인 시 `Create` · `Gallery` · `Logout` / 비로그인 시 `Login` · `Register`

---

## 플로우 1: 회원가입 / 로그인 / 로그아웃

```mermaid
flowchart LR
  A[방문] --> B{로그인?}
  B -->|No| C[/login or /register]
  C --> D[Supabase Auth]
  D -->|성공| E[/create or redirect]
  B -->|Yes| E
  E --> F[Logout]
  F --> C
```

| 단계 | 화면 | 성공 | 실패 UX |
|------|------|------|---------|
| 회원가입 | `/register` | `/login` 또는 `/create` | 이메일 중복, 약한 비밀번호 → 인라인 에러 |
| 로그인 | `/login` | redirect 또는 `/create` | 잘못된 자격 → 인라인 에러 |
| 세션 | 전역 | 새로고침 후 유지 | 만료 → `/login` + 안내 |
| 로그아웃 | Header | `/` 또는 `/login` | — |

---

## 플로우 2: 업로드 → 프리뷰 → (입력) → 생성

| 단계 | 동작 | 상태 |
|------|------|------|
| 1 | `/create`에서 파일 선택 | idle |
| 2 | 형식·크기 검증 | error → 메시지 + 재선택 |
| 3 | Storage 업로드 | **loading** (버튼 disable) |
| 4 | 프리뷰 표시 | success |
| 5 | 텍스트 입력 + (선택) LLM 정제 | loading / error / success |
| 6 | 생성 요청 | **loading**, 중복 클릭 방지 |
| 7 | 결과 표시 | success → 다운로드 또는 갤러리 이동 |

---

## 플로우 3: 생성 결과 확인 → 다운로드

| 단계 | 화면 | 비고 |
|------|------|------|
| 1 | `/create` 결과 영역 또는 `/gallery/:id` | 썸네일·메타(생성 시각) |
| 2 | [다운로드] 클릭 | loading → 파일 저장 |
| 3 | 실패 | error + 재시도 (signed URL 만료 등) |

---

## 플로우 4: 갤러리 → 삭제

| 단계 | 화면 | 비고 |
|------|------|------|
| 1 | `/gallery` 목록 | empty state: “아직 생성한 이모티콘이 없습니다” + `/create` 링크 |
| 2 | 카드 선택 → 상세(선택) | 본인 데이터만 (RLS) |
| 3 | [삭제] + 확인 모달 | loading |
| 4 | 성공 | 목록에서 제거 + success 토스트 |
| 5 | 권한 없음 | 403 → 에러 메시지 (타 사용자 id 조작 시) |

---

## 글로벌 상태 처리 가이드 (초안)

| 상태 | UI 패턴 |
|------|---------|
| loading | 스피너, 주요 버튼 `disabled`, 중복 submit 방지 |
| error | 토스트 또는 필드 하단 메시지, **재시도** 버튼(네트워크·5xx) |
| success | 토스트 또는 짧은 안내 후 다음 화면 이동 |
| empty | 갤러리·목록에 CTA(생성하러 가기) |

---

## 관련 문서

- PRD Auth: `01-prd/01-auth.md`
- API·Storage: `02-contracts/api-contract.md`, `02-contracts/storage-policy.md`
- 디자인: `03-design/design-guide.md`
