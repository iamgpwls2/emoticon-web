import { Router } from 'express';
import { refinePrompt as refinePromptController } from '../controllers/prompt.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validatePromptRefine } from '../validators/prompt.validator.js';

const router = Router();

/**
 * POST /api/prompts/refine
 * req.user.id는 requireAuth에서 설정됩니다.
 */
router.post(
  '/refine',
  requireAuth,
  validatePromptRefine,
  refinePromptController
);

export default router;
