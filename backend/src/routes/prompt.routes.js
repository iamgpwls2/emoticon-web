import { Router } from 'express';
import {
  chatPrompt as chatPromptController,
  refinePrompt as refinePromptController,
} from '../controllers/prompt.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import {
  validatePromptChat,
  validatePromptRefine,
} from '../validators/prompt.validator.js';
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

/**
 * POST /api/prompts/chat
 * req.user.id는 requireAuth에서 설정됩니다.
 */
router.post(
  '/chat',
  asyncHandler(requireAuth),
  validatePromptChat,
  asyncHandler(chatPromptController)
);

export default router;
