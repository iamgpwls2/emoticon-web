import { Router } from 'express';
import {
  getCollectionDetail,
  getMyCollections,
  patchCollection,
  postCollection,
  removeCollection,
} from '../controllers/collection.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import {
  validateCollectionIdParam,
  validateCreateCollection,
  validateRenameCollection,
} from '../validators/collection.validator.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get(
  '/me',
  asyncHandler(requireAuth),
  asyncHandler(getMyCollections)
);

router.post(
  '/',
  asyncHandler(requireAuth),
  validateCreateCollection,
  asyncHandler(postCollection)
);

router.get(
  '/:id',
  asyncHandler(requireAuth),
  validateCollectionIdParam,
  asyncHandler(getCollectionDetail)
);

router.patch(
  '/:id',
  asyncHandler(requireAuth),
  validateCollectionIdParam,
  validateRenameCollection,
  asyncHandler(patchCollection)
);

router.delete(
  '/:id',
  asyncHandler(requireAuth),
  validateCollectionIdParam,
  asyncHandler(removeCollection)
);

export default router;
