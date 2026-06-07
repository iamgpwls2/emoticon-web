import { Router } from 'express';
import { refinePrompt as refinePromptController } from '../controllers/prompt.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validatePromptRefine } from '../validators/prompt.validator.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

/**
 * POST /api/prompts/refine
 * req.user.id는 requireAuth에서 설정됩니다.
 */
router.post(
  '/refine',
  asyncHandler(requireAuth),
  validatePromptRefine,
  asyncHandler(refinePromptController)
);

export default router;
