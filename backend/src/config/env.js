import dotenv from 'dotenv';

dotenv.config();

function requireEnv(name, value) {
  if (!value?.trim()) {
    console.error(
      `Missing required environment variable: ${name}. Copy backend/.env.example to backend/.env and set Supabase values.`
    );
    process.exit(1);
  }
  return value.trim();
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

export const env = {
  PORT: Number(process.env.PORT) || 4000,
  FRONTEND_ORIGIN:
    process.env.FRONTEND_ORIGIN ||
    process.env.CLIENT_URL ||
    'http://localhost:5173',
  SUPABASE_URL: requireEnv('SUPABASE_URL', supabaseUrl),
  SUPABASE_ANON_KEY: requireEnv('SUPABASE_ANON_KEY', supabaseAnonKey),
  SUPABASE_SERVICE_ROLE_KEY: requireEnv(
    'SUPABASE_SERVICE_ROLE_KEY',
    supabaseServiceRoleKey
  ),
  SUPABASE_UPLOAD_BUCKET: requireEnv(
    'SUPABASE_UPLOAD_BUCKET',
    process.env.SUPABASE_UPLOAD_BUCKET
  ),
};
