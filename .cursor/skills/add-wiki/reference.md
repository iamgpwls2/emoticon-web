# add-wiki Reference

## MCP 서버

| 항목 | 값 |
|------|-----|
| Server ID | `user-dev-portal` |
| 표시 이름 | dev-portal |

## 위키 관련 도구

| 도구 | 용도 |
|------|------|
| `list_wiki_topics` | 카테고리(topic) slug 목록 |
| `list_wiki_pages` | 페이지 목록 (본문 제외) |
| `search_wiki` | 제목·본문 텍스트 검색 |
| `get_wiki_page` | slug로 본문 조회 |
| `create_wiki_page` | **신규 페이지** (title, slug, body 필수) |
| `update_wiki_page` | 전체/부분 필드 수정 (slug 필수) |
| `patch_wiki_section` | heading 기준 섹션만 교체 |
| `upload_wiki_image` | 외부 URL → 내부 이미지 URL |
| `create_wiki_topic` | 주제 생성 (관리자만, 일반 흐름에서 사용 안 함) |

## create_wiki_page 파라미터

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| `title` | ✅ | 페이지 제목 |
| `slug` | ✅ | URL slug (소문자, 하이픈) |
| `body` | ✅ | 마크다운 본문 |
| `category` | | topic slug |
| `page_type` | | `shared` (팀) / `personal` (개인, API 기본값) |
| `folder_id` | | 폴더 ID (선택) |

## 팀 위키 카테고리 (topic slug)

`list_wiki_topics`로 최신 목록을 다시 조회할 것. 참고용 스냅샷:

| slug | 이름 |
|------|------|
| `dev-env` | 개발 환경 |
| `git` | Git / GitHub / SSH |
| `general` | Vision-openCV |
| `culture` | 팀 문화 |
| `glossary` | 용어 사전 |
| `ai` | 피지컬 ai |
| `dev-portal` | Dev-Portal |
| `factory-os` | Factory OS |
| `dev-portal-qa` | Dev-Portal QA |
| `project-review` | project-review |
| `topic-1780425885786` | 해커톤 |
| `topic-1780472714249` | 사업 공모 지원 |

기타 페이지에서 보이는 category: `product` 등 — topic 목록과 다를 수 있으므로 등록 전 `list_wiki_topics` 확인 권장.

## slug 네이밍 예시

| 제목 | slug |
|------|------|
| Auth PRD | `auth-prd` |
| emoticon-web 검수 리포트 | `review-gpwls-emoticon-web-202606` |
| MCP 연동 테스트 | `mcp-test-page` |

## 본문 템플릿 (선택)

문서를 위키로 옮길 때:

```markdown
# {제목}

> 작성일: YYYY-MM-DD | 출처: {파일 경로 또는 맥락}

---

{본문}
```

검수·리포트류:

```markdown
# {프로젝트명} 검수 리포트

> 검수일: YYYY-MM-DD | 대상: {대상} | 기준: {기준 문서}

---

## 종합 평가

{요약}

---
```
