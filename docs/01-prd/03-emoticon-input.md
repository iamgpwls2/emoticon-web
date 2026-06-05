# 03. Emoticon Input (PRD)

## 목적

Day 5에서 구현한 **감정·모션·텍스트 입력** 기능의 요구사항을 정의합니다.

## 작성 시점

- 2026-06-03 (Day 5)

## 구현 위치

| 구성요소 | 경로 |
|----------|------|
| 생성 페이지 | `frontend/src/pages/CreatePage.vue` |
| 입력 폼 | `frontend/src/components/PromptForm.vue` |
| 검증 | `frontend/src/utils/inputValidation.js` |
| 오류 UI | `frontend/src/components/ErrorMessage.vue` |

---

## 1. 기능 목적

로그인한 사용자가 이모티콘 생성에 필요한 **감정·모션·텍스트**를 선택·입력한다.  
Day 4 이미지 업로드가 완료된 뒤, 생성 페이지에서 다음 단계로 넘어가기 전 필수 입력을 수집한다.

---

## 2. 감정 옵션

`<select>` 단일 선택. 빈 값은 허용하지 않는다.

| 옵션 |
|------|
| 기쁨 |
| 슬픔 |
| 화남 |
| 놀람 |
| 부끄러움 |
| 신남 |

---

## 3. 모션 옵션

`<select>` 단일 선택. 빈 값은 허용하지 않는다.

| 옵션 |
|------|
| 손 흔들기 |
| 점프 |
| 울기 |
| 박수 |
| 하트 보내기 |
| 고개 숙이기 |

---

## 4. 텍스트 입력 제한

| 항목 | 규칙 |
|------|------|
| 최대 길이 | **30자** (`EMOTICON_TEXT_MAX_LENGTH`) |
| 필수 | trim 후 1자 이상 |
| UI | `0/30` 글자 수 표시, `maxlength`로 초과 입력 차단 |

---

## 5. 필수값 검증 조건

`validatePromptInput({ emotion, motion, text, hasImage })` 기준. **네 항목 모두** 충족해야 한다.

| 항목 | 조건 |
|------|------|
| 이미지 업로드 | `hasImage === true` (CreatePage의 `uploadedImage` 존재) |
| 감정 | 선택값 trim 후 비어 있지 않음 |
| 모션 | 선택값 trim 후 비어 있지 않음 |
| 텍스트 | trim 후 비어 있지 않음, 30자 이하 |

> 이미지 업로드 상태는 **CreatePage**에서 관리한다. PromptForm은 감정·모션·텍스트만 담당한다.

---

## 6. 다음 단계 버튼 disabled 조건

```txt
disabled = !isPromptFormComplete({ emotion, motion, text, hasImage })
```

아래 **하나라도** 미충족이면 비활성화:

- 이미지 미업로드
- 감정 미선택
- 모션 미선택
- 텍스트 미입력 또는 30자 초과

- disabled 상태에서는 **클릭 불가** — 버튼 클릭으로 오류를 표시하지 않는다.
- 활성화된 경우에만 `handleNextStep` 실행 (추가 검증 없이 다음 단계 처리).

---

## 7. 오류 메시지 기준

| 상황 | 메시지 | 표시 시점 |
|------|--------|-----------|
| 이미지 미업로드 | 이미지를 먼저 업로드해 주세요. | 프롬프트 입력 시작 후, **다음 단계 버튼 위** |
| 감정 미선택 | 감정을 입력해 주세요. | 필드 `blur` 또는 `change` 이후 (`touched`) |
| 모션 미선택 | 모션을 입력해 주세요. | 필드 `blur` 또는 `change` 이후 (`touched`) |
| 텍스트 미입력 | 텍스트를 입력해 주세요. | 필드 `blur` 또는 `input` 이후 (`touched`) |
| 텍스트 30자 초과 | 텍스트는 최대 30자까지 입력할 수 있습니다. | 동일 (`maxlength`로 입력 차단) |

**표시 위치**

- 감정·모션·텍스트: `PromptForm` 필드 아래 `ErrorMessage` (필드별 `touched` 후)
- 이미지: `CreatePage` **다음 단계 버튼 위** `ErrorMessage`

**해제 조건**

- 해당 필드 값이 유효해지면 필드 오류 **즉시 사라짐**
- 이미지 업로드 완료 시 버튼 위 이미지 안내 **사라짐**
- 네 항목 모두 완료 시 오류 없음 + 다음 단계 버튼 **활성화**

---

## 7-1. 검증 체크리스트 (Day 5)

- [ ] 감정·모션·텍스트 선택/입력 가능
- [ ] 텍스트 글자 수 `0/30` 표시, 30자 초과 입력 제한
- [ ] 필수값 누락 시 다음 단계 버튼 disabled
- [ ] 네 항목 모두 완료 시 다음 단계 버튼 활성화
- [ ] 입력값 누락 시 해당 입력 영역 또는 버튼 근처에 이해 가능한 오류 메시지 표시

---

## 8. 추후 연계 (LLM)

이 입력값(`emotion`, `motion`, `text`)과 업로드 이미지 경로(`bucket`, `path`)는 **추후 LLM 프롬프트 구체화 단계**에서 `story_prompt` / `final_prompt` 생성에 사용될 예정이다.

- 관련 PRD: `01-prd/04-llm-prompt-refine.md` (예정)
- DB 필드: `02-contracts/db-schema.md` (`emotion`, `motion`, `input_text`, `story_prompt`, `final_prompt`)

Day 5 범위에는 **LLM API 호출·이미지 생성 API 호출 없음**.

---

## 관련 문서

- 이미지 업로드: `01-prd/02-image-upload-preview.md`
- API: `02-contracts/api-contract.md`
- 사용자 흐름: `00-project/00-03-user-flow.md`
