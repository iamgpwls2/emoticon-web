import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import { env } from './env.js';

const clientOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  realtime: {
    transport: ws,
  },
};

/**
 * 서버 전용 Supabase admin client (service role).
 * frontend에서 import하지 마세요.
 */
export const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  clientOptions
);
