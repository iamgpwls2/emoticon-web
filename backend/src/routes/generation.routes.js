import { Router } from 'express';
import {
  createGeneration as createGenerationController,
  deleteGeneration as deleteGenerationController,
  deleteGenerations as deleteGenerationsController,
  getMyGenerations as getMyGenerationsController,
  patchGenerationCollection as patchGenerationCollectionController,
  patchGenerationGallery as patchGenerationGalleryController,
} from '../controllers/generation.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { optionalGenerationMaskUpload } from '../middlewares/generationMaskUpload.middleware.js';
import {
  validateBulkDeleteGenerations,
  validateCreateGeneration,
  validateGenerationIdParam,
  validateListMyGenerationsQuery,
  validateMoveGenerationCollection,
} from '../validators/generation.validator.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

/**
 * GET /api/generations/me
 * 동적 라우트(/:id 등)보다 먼저 등록합니다.
 */
router.get(
  '/me',
  asyncHandler(requireAuth),
  validateListMyGenerationsQuery,
  asyncHandler(getMyGenerationsController)
);

/**
 * POST /api/generations
 * req.user.id는 requireAuth에서 설정됩니다.
 */
router.post(
  '/',
  asyncHandler(requireAuth),
  optionalGenerationMaskUpload,
  validateCreateGeneration,
  asyncHandler(createGenerationController)
);

/**
 * POST /api/generations/bulk-delete
 * 동적 라우트(/:id 등)보다 먼저 등록합니다.
 */
router.post(
  '/bulk-delete',
  asyncHandler(requireAuth),
  validateBulkDeleteGenerations,
  asyncHandler(deleteGenerationsController)
);

/**
 * PATCH /api/generations/:id/collection
 */
router.patch(
  '/:id/collection',
  asyncHandler(requireAuth),
  validateGenerationIdParam,
  validateMoveGenerationCollection,
  asyncHandler(patchGenerationCollectionController)
);

/**
 * PATCH /api/generations/:id/gallery
 */
router.patch(
  '/:id/gallery',
  asyncHandler(requireAuth),
  validateGenerationIdParam,
  asyncHandler(patchGenerationGalleryController)
);

/**
 * DELETE /api/generations/:id
 * /me 보다 뒤에 등록해 "me"가 id로 해석되지 않게 합니다.
 */
router.delete(
  '/:id',
  asyncHandler(requireAuth),
  validateGenerationIdParam,
  asyncHandler(deleteGenerationController)
);

export default router;
