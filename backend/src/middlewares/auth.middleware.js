import { HttpError } from '../utils/httpError.js';
import { supabase } from '../services/supabase.service.js';

/**
 * Authorization: Bearer {access_token} 만 허용.
 * 클라이언트가 보낸 user_id 등은 신뢰하지 않습니다.
 * 이후 생성 기록 저장 등 DB 작업 시 user_id는 반드시 req.user.id 를 사용하세요.
 */
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header) {
      throw HttpError.unauthorized('로그인이 필요합니다.');
    }

    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token?.trim()) {
      throw HttpError.unauthorized(
        'Authorization must be Bearer {access_token}.'
      );
    }

    const accessToken = token.trim();
    const { data, error } = await supabase.auth.getUser(accessToken);

    if (error || !data?.user) {
      throw HttpError.unauthorized('Invalid or expired access token.');
    }

    req.user = data.user;
    req.accessToken = accessToken;
    next();
  } catch (err) {
    next(err);
  }
}
