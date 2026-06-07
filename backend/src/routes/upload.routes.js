import { Router } from 'express';
import { uploadImage as uploadImageController } from '../controllers/upload.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { imageUpload as uploadSingleImage } from '../middlewares/imageUpload.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

/**
 * POST /api/uploads/image
 * multipart/form-data field: image
 * req.user.id는 requireAuth에서 설정됩니다.
 */
router.post(
  '/image',
  asyncHandler(requireAuth),
  uploadSingleImage,
  asyncHandler(uploadImageController)
);

export default router;
