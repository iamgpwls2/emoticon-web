import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

/**
 * GET /api/auth/me
 * 인증된 사용자 정보. user_id는 req.user.id 만 사용합니다.
 */
router.get(
  '/me',
  asyncHandler(requireAuth),
  (req, res) => {
    res.json({
      ok: true,
      user: {
        id: req.user.id,
        email: req.user.email,
      },
    });
  }
);

export default router;
