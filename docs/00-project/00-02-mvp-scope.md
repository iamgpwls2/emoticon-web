# 00-02. MVP Scope

## 목적
- Day 1~14 동안 “무엇을 만든다/안 만든다”를 명확히 해 범위 확장을 방지합니다.
- 기능 PRD/Contracts/Tests 작성의 기준점으로 사용합니다.

## 작성 시점
- 2026-06-02 (초안 본문·우선순위 보강)
- 2026-06-10 (MVP 제외 범위 — 관리자 페이지 명시)

---

## MVP에 포함되는 것 (우선순위)

| 우선순위 | 기능 | 설명 | PRD |
|----------|------|------|-----|
| **Must** | Auth | 회원가입, 로그인, 로그아웃, 세션 유지, 보호 라우트 | `01-prd/01-auth.md` |
| **Must** | 이미지 업로드/프리뷰 | 파일 검증, 업로드, 생성 전 미리보기 | `01-prd/02-image-upload-preview.md` |
| **Must** | 이모티콘 텍스트 입력 | 스타일·키워드 등 생성용 입력 | `01-prd/03-emoticon-input.md` |
| **Must** | 이미지 생성 | 정제 프롬프트 기반 생성, 결과 저장 | `01-prd/05-image-generation.md` |
| **Must** | 갤러리/삭제 | 내 생성 목록, 단건 삭제(DB+Storage) | `01-prd/07-gallery-delete.md` |
| **Should** | LLM 프롬프트 정제 | 입력 → 생성용 프롬프트 자동 정제 | `01-prd/04-llm-prompt-refine.md` |
| **Should** | 결과 다운로드 | 생성 이미지 파일 다운로드 | `01-prd/06-generation-result-download.md` |

> **Must:** 14일 MVP 종료 시 반드시 동작해야 함  
> **Should:** 시간이 부족하면 단순 프롬프트(정제 생략)로 대체 가능 — 문서·Contracts에 fallback 명시

---

## MVP에서 제외 (Non-goals)

| 항목 | 이유 |
|------|------|
| 결제/구독 | MVP 검증 범위 밖 |
| 팀/공유·다른 사용자에게 전송 | 권한·RLS 복잡도 증가 |
| 관리자 콘솔 | 운영 자동화는 2차 — 상세는 아래 「MVP 제외 범위」 |
| 고급 편집(리터칭, 레이어) | 생성·보관에 집중 |
| 소셜 로그인 | 이메일/비밀번호 우선 (추후 확장) |

---

## MVP 제외 범위

### 관리자 페이지

본 프로젝트는 MVP 단계이므로 별도의 관리자 페이지는 구현하지 않는다.  
사용자, 생성 기록, 이미지 Storage 관리는 Supabase Dashboard를 통해 확인한다.

관리자 페이지에서 필요한 전체 사용자 관리, 콘텐츠 검수, 신고 처리, 사용량 통계 기능은 서비스 확장 시 추가 기능으로 고려한다.

---

## 품질 기준 (초안)

- **UX:** 업로드·생성·삭제·다운로드마다 loading / error(재시도) / success 피드백
- **보안:** 사용자별 데이터 분리(RLS), Storage `user_id` 경로, secret key 프론트 미노출
- **테스트:** `05-roadmap/test-checklist.md` 스모크 + Auth·RLS·Storage 최소 시나리오

---

## 릴리스 기준 (Definition of Done, 초안)

- [ ] `docker compose up --build`로 frontend(5173)·backend(4000/health) 기동
- [ ] 로그인 사용자만 생성·갤러리 접근 가능
- [ ] 타 사용자 리소스 조회/삭제 불가(RLS·Storage 정책 검증)
- [ ] 생성 결과가 갤러리에 표시되고 삭제 시 Storage·DB 일관성 유지
- [ ] `.env.example`만 커밋, 실제 키 미커밋

---

## 관련 문서

- 개요: `00-01-overview.md`
- 사용자 흐름: `00-03-user-flow.md`
- 일정: `05-roadmap/14-days-checklist.md`
