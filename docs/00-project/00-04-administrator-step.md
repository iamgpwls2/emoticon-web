# 관리자 페이지 구현 가이드

## 1. 목표

이미지 생성 웹에 관리자 전용 페이지를 추가한다.

관리자 페이지에서는 다음 기능을 제공한다.

- 전체 사용자 목록 조회
- 전체 생성 기록 조회
- 생성 이미지 검수 상태 변경
- 부적절한 생성물 숨김 처리
- 기본 사용량 통계 확인
- 관리자 작업 로그 저장

관리자 기능은 일반 사용자 기능과 분리하며, 관리자 권한 검증은 반드시 backend에서 수행한다.

---

## 2. 구현 범위

### 2.1 필수 구현

- 관리자 권한 테이블 추가
- 관리자 전용 API 추가
- 관리자 전용 Vue 페이지 추가
- 전체 사용자 목록 조회
- 전체 생성 기록 조회
- 생성 기록 상태 변경
  - `active`
  - `hidden`
  - `deleted_by_admin`
- 관리자 작업 로그 저장
- 일반 사용자 갤러리에서 `hidden` 상태 제외

### 2.2 선택 구현

- 신고 기능
- 신고 목록 조회
- 신고 처리 상태 변경
- 사용자 차단
- API 비용 통계

---

## 3. 작업 브랜치 생성

### 작업 서비스

- WSL2 Terminal
- Cursor Terminal

### 명령어

```bash
git checkout main
git pull
git checkout -b feature/admin-dashboard

```

만약 아직 최신 기능이 `main`에 merge되지 않았다면, 현재 가장 최신 기능 브랜치에서 생성한다.

```bash
git checkout 현재_최신_브랜치명
git checkout -b feature/admin-dashboard

```

---

## 4. DB 테이블 및 컬럼 추가

### 작업 서비스

- Supabase Dashboard
- SQL Editor

---

### Step 4-1. 관리자 계정 테이블 추가

```sql
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

```

---

### Step 4-2. 내 계정을 관리자 계정으로 등록

Supabase Dashboard에서 다음 경로로 이동한다.

```txt
Authentication → Users → 내 계정 선택 → User ID 복사

```

복사한 User ID를 아래 SQL에 넣는다.

```sql
insert into public.admin_users (user_id, role, is_active)
values ('여기에_내_AUTH_USER_ID', 'super_admin', true);

```

---

### Step 4-3. 생성 기록 테이블에 검수 상태 컬럼 추가

기존 생성 기록 테이블이 `emoticon_generations`라고 가정한다.

```sql
alter table public.emoticon_generations
add column if not exists status text not null default 'active',
add column if not exists reviewed_by uuid references auth.users(id),
add column if not exists reviewed_at timestamptz,
add column if not exists admin_note text;

```

상태값은 다음 기준으로 사용한다.

```txt
active: 정상 상태
hidden: 관리자 숨김 처리
deleted_by_admin: 관리자 삭제 처리

```

---

### Step 4-4. 관리자 작업 로그 테이블 추가

```sql
create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_audit_logs enable row level security;

```

---

### Step 4-5. 신고 테이블 추가

신고 기능을 구현할 경우에만 추가한다.

```sql
create table if not exists public.generation_reports (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.emoticon_generations(id) on delete cascade,
  reporter_id uuid references auth.users(id) on delete set null,
  reason text not null,
  detail text,
  status text not null default 'pending',
  handled_by uuid references auth.users(id),
  handled_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.generation_reports enable row level security;

```

사용자가 자신의 신고만 생성하고 조회할 수 있도록 RLS 정책을 추가한다.

```sql
create policy "Users can create reports"
on public.generation_reports
for insert
to authenticated
with check (reporter_id = auth.uid());

create policy "Users can read own reports"
on public.generation_reports
for select
to authenticated
using (reporter_id = auth.uid());

```

---

## 5. Backend 환경 변수 추가

### 작업 서비스

- Cursor
- backend/.env
- backend/.env.example

---

### Step 5-1. backend/.env에 service role key 추가

```env
SUPABASE_SERVICE_ROLE_KEY=너의_supabase_service_role_key

```

주의사항:

```txt
frontend/.env에는 절대 추가하지 않는다.
service_role key는 Git에 올리지 않는다.
실제 키 값은 backend/.env에만 보관한다.

```

---

### Step 5-2. backend/.env.example 수정

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

```

실제 값은 넣지 않는다.

---

## 6. Backend 관리자 Supabase Client 추가

### 작업 서비스

- Cursor

### 생성 파일

```txt
backend/src/config/supabaseAdmin.js

```

### 코드

```js
import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

```

---

## 7. Backend 관리자 권한 Middleware 추가

### 생성 파일

```txt
backend/src/middlewares/admin.middleware.js

```

### 코드

```js
import { supabaseAdmin } from '../config/supabaseAdmin.js';

export async function requireAdmin(req, res, next) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        message: '로그인이 필요합니다.',
      });
    }

    const { data, error } = await supabaseAdmin
      .from('admin_users')
      .select('role, is_active')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      return res.status(500).json({
        message: '관리자 권한 확인 중 오류가 발생했습니다.',
      });
    }

    if (!data) {
      return res.status(403).json({
        message: '관리자 권한이 없습니다.',
      });
    }

    req.admin = {
      userId,
      role: data.role,
    };

    next();
  } catch (error) {
    return res.status(500).json({
      message: '관리자 권한 검증 실패',
    });
  }
}

```

---

## 8. Backend Admin API 추가

### 생성 파일

```txt
backend/src/routes/admin.routes.js
backend/src/controllers/admin.controller.js
backend/src/services/admin.service.js

```

---

### Step 8-1. Admin Routes 작성

```js
import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/admin.middleware.js';
import {
  getAdminMe,
  getAdminStats,
  getAdminUsers,
  getAdminGenerations,
  reviewGeneration,
  getReports,
  updateReport,
} from '../controllers/admin.controller.js';

const router = Router();

router.use(authMiddleware);
router.use(requireAdmin);

router.get('/me', getAdminMe);
router.get('/stats', getAdminStats);
router.get('/users', getAdminUsers);
router.get('/generations', getAdminGenerations);
router.patch('/generations/:id/review', reviewGeneration);
router.get('/reports', getReports);
router.patch('/reports/:id', updateReport);

export default router;

```

---

### Step 8-2. app.js 또는 server.js에 라우트 등록

```js
import adminRoutes from './routes/admin.routes.js';

app.use('/api/admin', adminRoutes);

```

---

## 9. Admin Controller 구현

### Step 9-1. 관리자 본인 확인 API

```js
export function getAdminMe(req, res) {
  return res.json({
    isAdmin: true,
    role: req.admin.role,
  });
}

```

---

### Step 9-2. 관리자 통계 API

통계 항목은 다음 기준으로 구성한다.

```txt
전체 사용자 수
전체 생성 수
숨김 처리된 생성 수
대기 중 신고 수

```

예시 코드:

```js
import { supabaseAdmin } from '../config/supabaseAdmin.js';

export async function getAdminStats(req, res) {
  const { data: usersData, error: usersError } =
    await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });

  if (usersError) {
    return res.status(500).json({
      message: '사용자 통계 조회 실패',
    });
  }

  const { count: totalGenerations } = await supabaseAdmin
    .from('emoticon_generations')
    .select('id', { count: 'exact', head: true });

  const { count: hiddenGenerations } = await supabaseAdmin
    .from('emoticon_generations')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'hidden');

  const { count: pendingReports } = await supabaseAdmin
    .from('generation_reports')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');

  return res.json({
    totalUsers: usersData.total ?? 0,
    totalGenerations: totalGenerations ?? 0,
    hiddenGenerations: hiddenGenerations ?? 0,
    pendingReports: pendingReports ?? 0,
  });
}

```

---

### Step 9-3. 전체 사용자 목록 조회 API

```js
export async function getAdminUsers(req, res) {
  const page = Number(req.query.page ?? 1);
  const perPage = Number(req.query.perPage ?? 20);

  const { data, error } = await supabaseAdmin.auth.admin.listUsers({
    page,
    perPage,
  });

  if (error) {
    return res.status(500).json({
      message: '사용자 목록 조회 실패',
    });
  }

  return res.json({
    users: data.users.map((user) => ({
      id: user.id,
      email: user.email,
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at,
    })),
    total: data.total,
  });
}

```

---

### Step 9-4. 전체 생성 기록 조회 API

```js
export async function getAdminGenerations(req, res) {
  const status = req.query.status;
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabaseAdmin
    .from('emoticon_generations')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;

  if (error) {
    return res.status(500).json({
      message: '생성 기록 조회 실패',
    });
  }

  return res.json({
    items: data,
    total: count,
  });
}

```

---

### Step 9-5. 생성 기록 검수 상태 변경 API

```js
export async function reviewGeneration(req, res) {
  const { id } = req.params;
  const { status, adminNote } = req.body;

  const allowedStatus = ['active', 'hidden', 'deleted_by_admin'];

  if (!allowedStatus.includes(status)) {
    return res.status(400).json({
      message: '올바르지 않은 상태값입니다.',
    });
  }

  const { data, error } = await supabaseAdmin
    .from('emoticon_generations')
    .update({
      status,
      admin_note: adminNote ?? null,
      reviewed_by: req.admin.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({
      message: '검수 상태 변경 실패',
    });
  }

  await supabaseAdmin.from('admin_audit_logs').insert({
    admin_user_id: req.admin.userId,
    action: 'review_generation',
    target_type: 'emoticon_generation',
    target_id: id,
    metadata: {
      status,
      adminNote,
    },
  });

  return res.json(data);
}

```

---

## 10. 일반 사용자 API 수정

관리자가 `hidden` 처리한 생성물은 일반 사용자 갤러리에서 보이지 않아야 한다.

기존 갤러리 조회 API에 다음 조건을 추가한다.

```js
.eq('status', 'active')

```

예시:

```js
const { data, error } = await supabase
  .from('emoticon_generations')
  .select('*')
  .eq('user_id', userId)
  .eq('status', 'active')
  .order('created_at', { ascending: false });

```

---

## 11. Frontend Admin API 파일 추가

### 생성 파일

```txt
frontend/src/services/adminApi.js

```

### 코드

```js
import api from './api';

export async function fetchAdminMe() {
  const { data } = await api.get('/admin/me');
  return data;
}

export async function fetchAdminStats() {
  const { data } = await api.get('/admin/stats');
  return data;
}

export async function fetchAdminUsers(params) {
  const { data } = await api.get('/admin/users', { params });
  return data;
}

export async function fetchAdminGenerations(params) {
  const { data } = await api.get('/admin/generations', { params });
  return data;
}

export async function reviewGeneration(id, payload) {
  const { data } = await api.patch(`/admin/generations/${id}/review`, payload);
  return data;
}

```

---

## 12. Frontend 관리자 페이지 구조 추가

### 생성 파일

```txt
frontend/src/pages/admin/AdminLayout.vue
frontend/src/pages/admin/AdminDashboardPage.vue
frontend/src/pages/admin/AdminUsersPage.vue
frontend/src/pages/admin/AdminGenerationsPage.vue
frontend/src/pages/admin/AdminReportsPage.vue

```

---

## 13. Router에 관리자 라우트 추가

### 작업 파일

```txt
frontend/src/router/index.js

```

### 추가 라우트 예시

```js
{
  path: '/admin',
  component: () => import('@/pages/admin/AdminLayout.vue'),
  meta: {
    requiresAuth: true,
    requiresAdmin: true,
  },
  children: [
    {
      path: '',
      component: () => import('@/pages/admin/AdminDashboardPage.vue'),
    },
    {
      path: 'users',
      component: () => import('@/pages/admin/AdminUsersPage.vue'),
    },
    {
      path: 'generations',
      component: () => import('@/pages/admin/AdminGenerationsPage.vue'),
    },
    {
      path: 'reports',
      component: () => import('@/pages/admin/AdminReportsPage.vue'),
    },
  ],
}

```

주의할 점:

```txt
Frontend router guard는 UX용이다.
실제 관리자 보안은 backend middleware에서 검증해야 한다.

```

---

## 14. AdminLayout.vue 구성

관리자 페이지 공통 레이아웃을 만든다.

구성 요소:

```txt
상단 제목: 관리자 페이지
좌측 또는 상단 메뉴
- 대시보드
- 사용자 관리
- 생성 기록 검수
- 신고 관리
본문 영역

```

디자인은 기존 프로젝트의 보라색, 흰색 톤을 유지한다.

---

## 15. AdminDashboardPage.vue 구현

### 표시 항목

```txt
전체 사용자 수
전체 생성 수
숨김 처리 수
대기 중 신고 수
최근 생성 기록

```

### 동작

페이지 진입 시 다음 API를 호출한다.

```js
fetchAdminStats()

```

---

## 16. AdminUsersPage.vue 구현

### 표시 항목

```txt
이메일
가입일
최근 로그인
User ID

```

### 동작

페이지 진입 시 다음 API를 호출한다.

```js
fetchAdminUsers({
  page: 1,
  perPage: 20,
})

```

처음 구현에서는 사용자 차단 기능은 넣지 않아도 된다.

---

## 17. AdminGenerationsPage.vue 구현

### 표시 항목

```txt
생성 이미지
사용자 ID
감정
동작
입력 텍스트
생성일
상태
관리자 메모
숨김 처리 버튼
정상 처리 버튼
삭제 처리 버튼

```

### 버튼 동작

```txt
정상 처리 버튼 → status = active
숨김 처리 버튼 → status = hidden
삭제 처리 버튼 → status = deleted_by_admin

```

### API 호출 예시

```js
await reviewGeneration(generationId, {
  status: 'hidden',
  adminNote: '부적절한 생성물로 판단되어 숨김 처리',
});

```

---

## 18. AdminReportsPage.vue 구현

신고 기능을 구현한 경우에만 추가한다.

### 표시 항목

```txt
신고된 생성물
신고 사유
신고 상세 내용
신고자
신고일
처리 상태
처리 버튼

```

처음에는 신고 기능이 없으면 빈 페이지 대신 다음 문구를 표시한다.

```txt
아직 신고 기능이 구현되지 않았습니다.

```

---

## 19. 보안 검증

### 일반 사용자 계정 테스트

```txt
/admin 직접 접속 시 접근 불가
/api/admin/me 직접 호출 시 403
/api/admin/stats 직접 호출 시 403
/api/admin/users 직접 호출 시 403
/api/admin/generations 직접 호출 시 403

```

---

### 관리자 계정 테스트

```txt
/admin 접속 가능
/api/admin/me 호출 가능
/api/admin/stats 호출 가능
전체 사용자 목록 조회 가능
전체 생성 기록 조회 가능
생성 기록 hidden 처리 가능

```

---

### Hidden 처리 테스트

```txt
1. 관리자 계정으로 생성 기록 하나를 hidden 처리한다.
2. 일반 사용자 계정으로 갤러리에 접속한다.
3. hidden 처리된 생성물이 보이지 않는지 확인한다.
4. 관리자 페이지에서는 hidden 상태로 보이는지 확인한다.

```

---

### 환경 변수 보안 확인

```txt
frontend/.env에 SUPABASE_SERVICE_ROLE_KEY가 없어야 한다.
frontend 코드에서 service_role key를 사용하면 안 된다.
backend/.env에만 SUPABASE_SERVICE_ROLE_KEY를 둔다.
Git에 backend/.env가 올라가지 않아야 한다.

```

---

## 20. 문서 업데이트

관리자 페이지 구현 후 다음 문서를 추가하거나 수정한다.

```txt
docs/01-prd/04-admin-dashboard.md
docs/02-contracts/admin-api-contract.md
docs/03-guides/admin-dashboard-implementation.md
docs/03-guides/admin-test-checklist.md

```

---

## 21. PRD 문서에 추가할 내용

```md
## 관리자 페이지

관리자 페이지는 MVP 필수 기능은 아니지만, 서비스 운영 확장성을 고려하여 선택 기능으로 구현한다.

관리자는 전체 사용자 목록, 전체 생성 기록, 콘텐츠 검수 상태, 신고 내역, 기본 사용량 통계를 확인할 수 있다.

관리자 권한 검증은 frontend가 아니라 backend middleware에서 수행하며, 관리자 작업에는 서버 전용 Supabase service role key를 사용한다.

일반 사용자는 관리자 API와 관리자 페이지에 접근할 수 없으며, 관리자가 숨김 처리한 생성물은 일반 사용자 갤러리에서 표시되지 않는다.

```

---

## 22. API 계약 문서에 추가할 내용

```md
# Admin API Contract

## GET /api/admin/me

관리자 권한 여부를 확인한다.

### Response

```json
{
  "isAdmin": true,
  "role": "super_admin"
}

```

---

## GET /api/admin/stats

관리자 대시보드 통계를 조회한다.

### Response

```json
{
  "totalUsers": 10,
  "totalGenerations": 120,
  "hiddenGenerations": 3,
  "pendingReports": 1
}

```

---

## GET /api/admin/users

전체 사용자 목록을 조회한다.

### Query

```txt
page=1
perPage=20

```

---

## GET /api/admin/generations

전체 생성 기록을 조회한다.

### Query

```txt
page=1
limit=20
status=active

```

---

## PATCH /api/admin/generations/:id/review

생성 기록의 검수 상태를 변경한다.

### Request Body

```json
{
  "status": "hidden",
  "adminNote": "부적절한 생성물로 판단되어 숨김 처리"
}

```

```

---

## 23. 최종 검증 체크리스트

```txt
[ ] 관리자 테이블 admin_users 생성 완료
[ ] 내 계정이 admin_users에 등록됨
[ ] emoticon_generations에 status 컬럼 추가됨
[ ] backend에서 supabaseAdmin client 생성됨
[ ] service_role key가 backend에서만 사용됨
[ ] requireAdmin middleware 구현됨
[ ] /api/admin/me 정상 작동
[ ] 일반 사용자는 /api/admin/* 접근 시 403 반환
[ ] 관리자는 전체 사용자 목록 조회 가능
[ ] 관리자는 전체 생성 기록 조회 가능
[ ] 관리자는 생성 기록 hidden 처리 가능
[ ] hidden 처리된 생성 기록은 일반 사용자 갤러리에서 보이지 않음
[ ] 관리자 작업 로그가 admin_audit_logs에 저장됨
[ ] frontend에 /admin 페이지 추가됨
[ ] 기존 로그인, 생성, 갤러리 기능이 깨지지 않음

```

---

