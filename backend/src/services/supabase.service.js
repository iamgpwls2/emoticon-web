import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import { env } from '../config/env.js';

const clientOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  realtime: {
    transport: ws,
  },
};

/** 일반 API·JWT 검증용 (anon / publishable key) */
export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY,
  clientOptions
);

/**
 * 관리자용 (service role) — backend 내부 전용.
 * frontend, VITE_*, 응답 JSON, 로그에 노출하지 마세요.
 */
export const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  clientOptions
);
