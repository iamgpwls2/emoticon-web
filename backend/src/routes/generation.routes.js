import { Router } from 'express';
import {
  createGeneration as createGenerationController,
  getMyGenerations as getMyGenerationsController,
} from '../controllers/generation.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validateCreateGeneration } from '../validators/generation.validator.js';

const router = Router();

/**
 * GET /api/generations/me
 * 동적 라우트(/:id 등)보다 먼저 등록합니다.
 */
router.get('/me', requireAuth, getMyGenerationsController);

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
