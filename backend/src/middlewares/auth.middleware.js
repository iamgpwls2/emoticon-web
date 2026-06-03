import { supabase } from '../services/supabase.service.js';

function sendUnauthorized(res, message) {
  return res.status(401).json({
    ok: false,
    error: { message },
  });
}

/**
 * Authorization: Bearer {access_token} 만 허용.
 * 클라이언트가 보낸 user_id 등은 신뢰하지 않습니다.
 * 이후 생성 기록 저장 등 DB 작업 시 user_id는 반드시 req.user.id 를 사용하세요.
 */
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header) {
    return sendUnauthorized(res, 'Authorization header is required.');
  }

  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token?.trim()) {
    return sendUnauthorized(
      res,
      'Authorization must be Bearer {access_token}.'
    );
  }

  const accessToken = token.trim();

  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data?.user) {
    return sendUnauthorized(res, 'Invalid or expired access token.');
  }

  req.user = data.user;
  req.accessToken = accessToken;
  next();
}
