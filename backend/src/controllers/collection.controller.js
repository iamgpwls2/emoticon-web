import {
  createCollection,
  deleteCollection,
  getOwnedCollection,
  listMyCollections,
  renameCollection,
} from '../services/collection.service.js';
import { listMyGenerations } from '../services/generation.service.js';
import { rethrowControllerError } from '../utils/controllerError.js';
import { parseListPagination } from '../utils/pagination.js';

function parseCascadeFlag(value) {
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return false;
}

/**
 * GET /api/collections/me
 */
export async function getMyCollections(req, res) {
  const userId = req.user.id;

  try {
    const result = await listMyCollections({ userId });
    return res.status(200).json(result);
  } catch (error) {
    rethrowControllerError(error, {
      logPrefix: `getMyCollections failed (user=${userId}):`,
      fallbackMessage: '폴더 목록을 불러오지 못했습니다. 다시 시도해 주세요.',
    });
  }
}

/**
 * POST /api/collections
 */
export async function postCollection(req, res) {
  const userId = req.user.id;
  const { name } = req.body;

  try {
    const collection = await createCollection({ userId, name });
    return res.status(201).json(collection);
  } catch (error) {
    rethrowControllerError(error, {
      logPrefix: `postCollection failed (user=${userId}):`,
      fallbackMessage: '폴더를 만들지 못했습니다. 다시 시도해 주세요.',
    });
  }
}

/**
 * GET /api/collections/:id
 */
export async function getCollectionDetail(req, res) {
  const userId = req.user.id;
  const { id } = req.params;
  const { page, limit } = parseListPagination(req.query);

  try {
    const collection = await getOwnedCollection({ userId, collectionId: id });
    const { items, total } = await listMyGenerations({
      userId,
      page,
      limit,
      collectionId: id,
    });

    return res.status(200).json({
      id: collection.id,
      name: collection.name,
      createdAt: collection.created_at,
      updatedAt: collection.updated_at,
      items,
      page,
      limit,
      total,
      hasMore: page * limit < total,
    });
  } catch (error) {
    rethrowControllerError(error, {
      logPrefix: `getCollectionDetail failed (user=${userId}, collection=${id}):`,
      fallbackMessage: '폴더 내용을 불러오지 못했습니다. 다시 시도해 주세요.',
    });
  }
}

/**
 * PATCH /api/collections/:id
 */
export async function patchCollection(req, res) {
  const userId = req.user.id;
  const { id } = req.params;
  const { name } = req.body;

  try {
    const collection = await renameCollection({
      userId,
      collectionId: id,
      name,
    });
    return res.status(200).json(collection);
  } catch (error) {
    rethrowControllerError(error, {
      logPrefix: `patchCollection failed (user=${userId}, collection=${id}):`,
      fallbackMessage: '폴더 이름을 변경하지 못했습니다. 다시 시도해 주세요.',
    });
  }
}

/**
 * DELETE /api/collections/:id
 */
export async function removeCollection(req, res) {
  const userId = req.user.id;
  const { id } = req.params;
  const cascade = parseCascadeFlag(req.query.cascade);

  try {
    await deleteCollection({ userId, collectionId: id, cascade });
    return res.status(200).json({ success: true });
  } catch (error) {
    rethrowControllerError(error, {
      logPrefix: `removeCollection failed (user=${userId}, collection=${id}):`,
      fallbackMessage: '폴더를 삭제하지 못했습니다. 다시 시도해 주세요.',
    });
  }
}
