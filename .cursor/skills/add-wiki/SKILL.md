---
name: add-wiki
description: Dev Portal MCP로 위키 페이지를 생성·수정한다. 사용자가 add-wiki, /add-wiki, 위키 등록, 위키에 올려줘, dev portal wiki를 요청하거나 이 스킬을 첨부했을 때 사용한다.
disable-model-invocation: true
---

# add-wiki

Dev Portal MCP(`user-dev-portal`)로 팀/개인 위키에 글을 등록하는 워크플로.

## 트리거

`add-wiki` 또는 `/add-wiki` 뒤에 제목·본문·카테고리 등을 적는다.

예:
- `add-wiki docs/01-prd/01-auth.md 내용을 위키에 올려줘`
- `/add-wiki 제목: Auth PRD, 카테고리: dev-env, 본문은 아래 마크다운 사용`

## 사전 준비

1. MCP 서버 `user-dev-portal` 도구 스키마를 **호출 전에** 읽는다 (`mcps/user-dev-portal/tools/*.json`).
2. `CallMcpTool` 사용: `server: "user-dev-portal"`.

## 워크플로

```
Task Progress:
- [ ] 1. 요청 파악 (제목, 본문 소스, 카테고리, page_type)
- [ ] 2. 중복 확인 (search_wiki, list_wiki_pages)
- [ ] 3. slug·메타 확정
- [ ] 4. 본문 마크다운 정리 (이미지 URL 처리)
- [ ] 5. create_wiki_page 또는 update_wiki_page / patch_wiki_section
- [ ] 6. 결과 URL·slug 사용자에게 보고
```

### 1. 요청 파악

| 필드 | 필수 | 기본값 | 규칙 |
|------|------|--------|------|
| `title` | ✅ | — | 위키 페이지 제목 |
| `body` | ✅ | — | 마크다운 본문 |
| `slug` | — | title에서 생성 | 영문 소문자·숫자·하이픈만 |
| `category` | — | 사용자 지정 없으면 확인 후 결정 | topic **slug** (이름 아님) |
| `page_type` | — | `shared` | `shared`=팀 위키, `personal`=개인 위키 |

본문 소스가 파일이면 해당 파일을 읽어 마크다운으로 사용한다. 여러 파일이면 사용자에게 합칠지 묻거나 논리적으로 병합한다.

### 2. 중복 확인

등록 전 반드시:

```text
search_wiki({ query: "<제목 키워드>" })
list_wiki_pages({ category: "<category>" })  // 카테고리 알 때
```

동일·유사 slug/제목이 있으면:
- **새 글** vs **기존 글 수정** vs **섹션만 패치** 중 사용자에게 확인한다.
- 수정: `update_wiki_page` 또는 `patch_wiki_section`
- 신규: slug에 접미사 추가 (예: `-202606`, `-v2`)

### 3. slug 생성

1. 제목을 영문 키워드로 요약 (예: `Auth PRD` → `auth-prd`)
2. 이미 사용 중이면 `-YYYYMMDD` 또는 순번 접미사
3. `list_wiki_pages`로 slug 충돌 재확인

### 4. 카테고리 선택

`list_wiki_topics`로 topic slug 목록을 조회한다. 자주 쓰는 카테고리는 [reference.md](reference.md) 참고.

사용자가 카테고리를 지정하지 않았으면 본문 맥락에 맞는 slug를 제안하고 확인한다.

### 5. 본문·이미지

- 위키 본문은 **마크다운** (`body`).
- 외부 이미지 URL이 있으면 `upload_wiki_image({ source_url })`로 내부 URL을 받아 본문에 반영한다.
- 코드 블록·표·체크리스트는 기존 위키 페이지 스타일을 따른다.

### 6. MCP 호출

**신규 페이지** (가장 흔함):

```json
{
  "server": "user-dev-portal",
  "toolName": "create_wiki_page",
  "arguments": {
    "title": "...",
    "slug": "...",
    "body": "...",
    "category": "<topic-slug>",
    "page_type": "shared"
  }
}
```

**전체 본문 교체**:

```json
{
  "toolName": "update_wiki_page",
  "arguments": { "slug": "...", "body": "...", "title": "..." }
}
```

**특정 섹션만** (heading 기준):

```json
{
  "toolName": "patch_wiki_section",
  "arguments": {
    "slug": "...",
    "heading": "진행현황",
    "content": "## 진행현황\n\n...",
    "create_if_missing": true
  }
}
```

### 7. 완료 보고

성공 시 사용자에게 전달:
- 페이지 **제목**, **slug**, **category**
- `page_type` (shared / personal)
- Dev Portal 위키에서 열 수 있는 경로 안내 (slug 기준)

실패 시 MCP 에러 메시지와 함께 원인·다음 조치를 설명한다.

## 주의사항

- `create_wiki_topic`은 **관리자 전용**. 일반 등록 흐름에서 호출하지 않는다.
- `category`에는 topic **이름**이 아니라 **slug**를 넣는다 (`dev-env`, `project-review` 등).
- 사용자 확인 없이 기존 페이지 본문을 덮어쓰지 않는다.
- 등록 전 본문 미리보기(제목·slug·카테고리·본문 앞 20줄)를 보여주고 진행해도 된다. 사용자가 "바로 올려"라고 하면 생략 가능.

## 추가 자료

- MCP 도구 상세·카테고리 목록: [reference.md](reference.md)
