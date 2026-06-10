# 관리자 페이지 기능 요건서

## 1. 개요

### 1.1 목적
이모티콘 생성 웹 서비스의 운영 효율화를 위해 관리자 전용 페이지를 구현한다.
관리자는 전체 사용자 현황, 생성 기록, 콘텐츠 검수 상태를 확인하고 관리할 수 있다.

### 1.2 구현 범위

| 구분 | 내용 |
|------|------|
| 필수 구현 | 관리자 권한 관리, 통계 대시보드, 사용자 목록, 생성 기록 검수, 작업 로그 |
| 선택 구현 | 신고 기능, 신고 목록 조회, 사용자 차단, API 비용 통계 |

### 1.3 설계 원칙
- 관리자 권한 검증은 반드시 **백엔드**에서 수행한다
- 프론트엔드 guard는 UX 보호용이며 보안 수단이 아니다
- 기존 생성 파이프라인 `status` 컬럼과 검수용 `moderation_status` 컬럼은 **분리**하여 관리한다
- 기존 로그인, 생성, 갤러리 기능에 영향을 주지 않는다

---

## 2. 용어 정의

| 용어 | 설명 |
|------|------|
| `status` | 이미지 생성 파이프라인 상태 (`generating` / `completed` / `failed`) |
| `moderation_status` | 콘텐츠 검수 상태 (`active` / `hidden` / `deleted_by_admin`) |
| `admin_users` | 관리자 계정 테이블 |
| `admin_audit_logs` | 관리자 작업 로그 테이블 |
| `requireAdmin` | 백엔드 관리자 권한 검증 미들웨어 |

---

## 3. 데이터베이스 요건

### 3.1 관리자 계정 테이블 (`admin_users`)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `user_id` | uuid (PK) | auth.users 참조 |
| `role` | text | 관리자 역할 (기본값: `admin`) |
| `is_active` | boolean | 활성 여부 (기본값: `true`) |
| `created_at` | timestamptz | 등록일 |

- RLS 활성화, 클라이언트 직접 접근 차단
- 백엔드 `supabaseAdmin`(service role)으로만 접근

### 3.2 생성 기록 테이블 컬럼 추가 (`emoticon_generations`)

기존 `status` 컬럼은 변경하지 않는다. 아래 컬럼만 추가한다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `moderation_status` | text | 검수 상태 (기본값: `active`) |
| `reviewed_by` | uuid | 검수한 관리자 ID |
| `reviewed_at` | timestamptz | 검수 일시 |
| `admin_note` | text | 관리자 메모 |

**moderation_status 상태값:**

| 값 | 설명 | 갤러리 노출 |
|----|------|------------|
| `active` | 정상 노출 (기본값) | ✅ 노출 |
| `hidden` | 관리자 숨김 처리 | ❌ 제외 |
| `deleted_by_admin` | 관리자 삭제 처리 | ❌ 제외 |

### 3.3 관리자 작업 로그 테이블 (`admin_audit_logs`)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | uuid (PK) | 로그 ID |
| `admin_user_id` | uuid | 작업한 관리자 ID |
| `action` | text | 수행한 액션 |
| `target_type` | text | 대상 타입 |
| `target_id` | uuid | 대상 ID |
| `metadata` | jsonb | 추가 정보 |
| `created_at` | timestamptz | 작업 일시 |

---

## 4. 백엔드 API 요건

### 4.1 공통 인증
모든 `/api/admin/*` 엔드포인트는 아래 미들웨어를 반드시 통과해야 한다.

```
requireAuth → requireAdmin → controller
```

일반 사용자 접근 시 `403 Forbidden` 반환

### 4.2 API 목록

#### GET /api/admin/me
관리자 권한 여부 확인

**Response**
```json
{
  "isAdmin": true,
  "role": "super_admin"
}
```

---

#### GET /api/admin/stats
대시보드 통계 조회

**Response**
```json
{
  "totalUsers": 10,
  "totalGenerations": 120,
  "hiddenGenerations": 3,
  "pendingReports": 0
}
```

---

#### GET /api/admin/users
전체 사용자 목록 조회

**Query Parameters**

| 파라미터 | 기본값 | 설명 |
|---------|--------|------|
| `page` | 1 | 페이지 번호 |
| `perPage` | 20 | 페이지당 항목 수 |

**Response**
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "createdAt": "2026-01-01T00:00:00Z",
      "lastSignInAt": "2026-06-01T00:00:00Z"
    }
  ],
  "total": 10,
  "page": 1,
  "perPage": 20
}
```

---

#### GET /api/admin/generations
전체 생성 기록 조회

**Query Parameters**

| 파라미터 | 기본값 | 설명 |
|---------|--------|------|
| `page` | 1 | 페이지 번호 |
| `limit` | 20 | 페이지당 항목 수 (최대 50) |
| `moderationStatus` | 없음 (전체) | 검수 상태 필터 |

**Response 주요 필드**

| 필드 | 설명 |
|------|------|
| `status` | 생성 파이프라인 상태 |
| `moderation_status` | 검수 상태 |
| `generated_image_url` | 생성된 이미지 URL |
| `emotion` / `motion` | 감정 / 모션 |
| `reviewed_by` / `reviewed_at` | 검수자 / 검수 일시 |

---

#### PATCH /api/admin/generations/:id/review
생성 기록 검수 상태 변경. `status` 컬럼은 변경하지 않는다.

**Request Body**
```json
{
  "moderationStatus": "hidden",
  "adminNote": "부적절한 생성물로 판단되어 숨김 처리"
}
```

**Response**
업데이트된 `emoticon_generations` 행 (snake_case)

---

### 4.3 일반 사용자 갤러리 API 수정

`listMyGenerations` 쿼리에 아래 조건을 추가한다.

```
기존: saved_to_gallery = true
추가: moderation_status = 'active'
```

`hidden` 또는 `deleted_by_admin` 처리된 항목은 일반 사용자 갤러리에서 제외된다.

---

## 5. 프론트엔드 요건

### 5.1 페이지 구조

```
/admin                   → AdminDashboardPage (통계)
/admin/users             → AdminUsersPage (사용자 목록)
/admin/generations       → AdminGenerationsPage (생성 기록 검수)
/admin/reports           → AdminReportsPage (신고 관리 — 선택)
```

모든 페이지는 `AdminLayout.vue`를 공통 레이아웃으로 사용한다.

### 5.2 라우터 Guard

```
/admin 접근 시:
1. Supabase 세션 준비 대기
2. 세션 없음 → /generate 리다이렉트
3. fetchAdminMe() 호출
4. 403 응답 → /generate 리다이렉트
5. 200 응답 → 페이지 진입 허용
```

> 세션 준비 전 API 호출 시 정상 관리자도 튕겨나가는 문제를 방지하기 위해
> `supabase.auth.getSession()` 확인 후 `fetchAdminMe()`를 호출한다.

### 5.3 AdminLayout.vue

- 기존 서비스 디자인 톤(보라색 `#6d3df2`) 유지
- 좌측 또는 상단 네비게이션 메뉴 포함
- `<router-view />`로 하위 페이지 렌더링

### 5.4 AdminDashboardPage.vue

**표시 항목:**

| 항목 | 설명 |
|------|------|
| 전체 사용자 수 | `totalUsers` |
| 전체 생성 수 | `totalGenerations` |
| 숨김 처리 수 | `hiddenGenerations` |
| 대기 중 신고 수 | `pendingReports` (신고 미구현 시 0) |

### 5.5 AdminUsersPage.vue

**표시 항목:**

| 항목 | 설명 |
|------|------|
| 이메일 | 사용자 이메일 |
| 가입일 | `createdAt` |
| 최근 로그인 | `lastSignInAt` |
| User ID | `id` |

- 페이지네이션 (perPage: 20)
- 초기 버전에서는 사용자 차단 기능 미포함

### 5.6 AdminGenerationsPage.vue

**표시 항목:**

| 항목 | 설명 |
|------|------|
| 생성 이미지 | `generated_image_url` |
| 사용자 ID | `user_id` |
| 감정 / 모션 / 텍스트 | `emotion` / `motion` / `input_text` |
| 생성 상태 | `status` |
| 검수 상태 | `moderation_status` |
| 생성일 | `created_at` |
| 관리자 메모 | `admin_note` |

**검수 버튼:**

| 버튼 | 변경값 |
|------|--------|
| 정상 처리 | `moderation_status = active` |
| 숨김 처리 | `moderation_status = hidden` |
| 삭제 처리 | `moderation_status = deleted_by_admin` |

**필터:**
- `moderation_status` 기준 필터 (전체 / active / hidden / deleted_by_admin)

### 5.7 AdminReportsPage.vue (선택)

신고 기능 미구현 시 아래 문구만 표시한다.
```
아직 신고 기능이 구현되지 않았습니다.
```

---

## 6. 보안 요건

### 6.1 접근 제어

| 주체 | /admin 접근 | /api/admin/* |
|------|------------|--------------|
| 비로그인 사용자 | ❌ /generate 리다이렉트 | ❌ 401 |
| 일반 사용자 | ❌ /generate 리다이렉트 | ❌ 403 |
| 관리자 | ✅ 허용 | ✅ 200 |

### 6.2 환경 변수 보안

| 항목 | 위치 | 비고 |
|------|------|------|
| `SUPABASE_SERVICE_ROLE_KEY` | `backend/.env` 만 | Git 커밋 금지 |
| `VITE_API_BASE_URL` | `frontend/.env` | 포트 4000 확인 |
| `VITE_SUPABASE_*` | `frontend/.env` | service role key 절대 포함 금지 |

---

## 7. 구현 순서 (Phase)

### Phase 1 — 백엔드 기반 작업
1. DB 마이그레이션 (`admin_users`, `moderation_status`, `admin_audit_logs`)
2. `requireAdmin` 미들웨어 구현
3. Admin API 구현 (`routes`, `controller`, `service`, `validator`)
4. `listMyGenerations`에 `moderation_status = 'active'` 조건 추가

**완료 기준:**
- `GET /api/admin/me` → 관리자 200, 일반 유저 403
- `GET /api/admin/stats` → 200
- `GET /api/admin/generations` → 200

### Phase 2 — 프론트엔드 기반 작업
1. `admin.service.js` 생성
2. 라우터에 `/admin` 경로 및 `requiresAdmin` guard 추가
3. `AdminLayout.vue` 생성

**완료 기준:**
- 일반 사용자 `/admin` 접근 시 `/generate` 리다이렉트
- 관리자 `/admin` 접근 시 레이아웃 정상 렌더링

### Phase 3 — 관리자 페이지 구현
1. `AdminDashboardPage.vue`
2. `AdminGenerationsPage.vue`
3. `AdminUsersPage.vue`
4. `AdminReportsPage.vue` (미구현 문구만)

---

## 8. 최종 검증 체크리스트

### DB
- [ ] `admin_users` 테이블 생성 완료
- [ ] 내 계정이 `admin_users`에 등록됨
- [ ] `emoticon_generations`에 `moderation_status` 컬럼 추가됨
- [ ] 기존 `status` 컬럼 미변경 확인
- [ ] `admin_audit_logs` 테이블 생성 완료

### 백엔드
- [ ] `requireAdmin` 미들웨어 정상 동작
- [ ] 일반 사용자 `/api/admin/*` 접근 시 403 반환
- [ ] 관리자 전체 사용자 목록 조회 가능
- [ ] 관리자 전체 생성 기록 조회 가능
- [ ] `moderation_status = hidden` 처리 가능
- [ ] `hidden` 처리 후 기존 `status` 유지 확인
- [ ] 관리자 작업 로그 `admin_audit_logs`에 저장됨
- [ ] `hidden` 항목이 일반 갤러리 API에서 제외됨

### 프론트엔드
- [ ] `admin.service.js` 추가됨
- [ ] `/admin` 라우트 + `requiresAdmin` guard 추가됨
- [ ] 세션 준비 후 `fetchAdminMe()` 호출 확인
- [ ] 대시보드 통계 4개 정상 표시
- [ ] 생성 기록 검수 버튼 정상 동작
- [ ] 사용자 목록 정상 표시

### 보안
- [ ] `frontend/.env`에 service role key 없음
- [ ] `backend/.env` Git 미커밋 확인
- [ ] `VITE_API_BASE_URL` 포트 4000 일치 확인

### 기존 기능
- [ ] 로그인/로그아웃 정상 동작
- [ ] 이모티콘 생성 정상 동작
- [ ] 갤러리 이미지 불러오기 정상 동작