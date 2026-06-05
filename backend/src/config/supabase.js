import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

/**
 * 서버 전용 Supabase admin client (service role).
 * frontend에서 import하지 마세요.
 */
export const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);
