import { Router } from 'express';
import { createGeneration as createGenerationController } from '../controllers/generation.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validateCreateGeneration } from '../validators/generation.validator.js';

const router = Router();

/**
 * POST /api/generations
 * req.user.id는 requireAuth에서 설정됩니다.
 */
router.post(
  '/',
  requireAuth,
  validateCreateGeneration,
  createGenerationController
);

export default router;
