import {
  deleteMyGeneration,
  deleteMyGenerations,
  listMyGenerations,
  moveGenerationToCollection,
  saveGenerationToGallery,
  updateGenerationFavorite,
} from '../services/generation.service.js';
import { runGenerationPipeline } from '../services/generationOrchestration.service.js';
import { HttpError } from '../utils/httpError.js';
import { rethrowControllerError } from '../utils/controllerError.js';
import { parseListPagination } from '../utils/pagination.js';

const GENERATION_FAILURE_MESSAGE =
  '이모티콘 생성에 실패했습니다. 다시 시도해 주세요.';

/**
 * GET /api/generations/me
 * req.user.id 기준으로 본인 생성 기록을 페이지네이션 조회합니다.
 */
export async function getMyGenerations(req, res) {
  const userId = req.user.id;
  const { page, limit } = parseListPagination(req.query);
  const collectionId =
    typeof req.query.collectionId === 'string' && req.query.collectionId.trim()
      ? req.query.collectionId.trim()
      : undefined;
  const favorite =
    req.query.favorite === 'true' || req.query.favorite === true;

  try {
    const { items, total } = await listMyGenerations({
      userId,
      page,
      limit,
      collectionId,
      favorite: favorite || undefined,
    });

    return res.status(200).json({
      items,
      page,
      limit,
      total,
      hasMore: page * limit < total,
    });
  } catch (error) {
    rethrowControllerError(error, {
      logPrefix: `getMyGenerations failed (user=${userId}):`,
      fallbackMessage: '이모티콘 목록을 불러오지 못했습니다. 다시 시도해 주세요.',
    });
  }
}

/**
 * POST /api/generations
 * req.body는 validateCreateGeneration 미들웨어에서 검증된 값을 사용합니다.
 */
export async function createGeneration(req, res) {
  const userId = req.user.id;

  try {
    const maskFile = req.file;
    const result = await runGenerationPipeline({
      userId,
      ...req.body,
      maskImageBuffer: maskFile?.buffer,
      maskMimeType: maskFile?.mimetype,
    });

    return res.status(201).json(result);
  } catch (error) {
    rethrowControllerError(error, {
      logPrefix: `createGeneration failed (user=${userId}):`,
      fallbackMessage: GENERATION_FAILURE_MESSAGE,
      storageMessage: GENERATION_FAILURE_MESSAGE,
      externalApiMessage: GENERATION_FAILURE_MESSAGE,
    });
  }
}

/**
 * PATCH /api/generations/:id/collection
 */
export async function patchGenerationCollection(req, res) {
  const userId = req.user.id;
  const { id } = req.params;
  const { collectionId } = req.body;

  try {
    const item = await moveGenerationToCollection({
      userId,
      generationId: id,
      collectionId,
    });

    return res.status(200).json(item);
  } catch (error) {
    rethrowControllerError(error, {
      logPrefix: `patchGenerationCollection failed (user=${userId}, generation=${id}):`,
      fallbackMessage: '폴더 이동에 실패했습니다. 다시 시도해 주세요.',
    });
  }
}

/**
 * PATCH /api/generations/:id/favorite
 * 본인 생성 기록의 즐겨찾기 상태를 갱신합니다.
 */
export async function patchGenerationFavorite(req, res) {
  const userId = req.user.id;
  const { id } = req.params;
  const { isFavorite } = req.body;

  try {
    const result = await updateGenerationFavorite({
      userId,
      generationId: id,
      isFavorite,
    });

    return res.status(200).json(result);
  } catch (error) {
    rethrowControllerError(error, {
      logPrefix: `patchGenerationFavorite failed (user=${userId}, generation=${id}):`,
      fallbackMessage: '즐겨찾기 변경에 실패했습니다. 다시 시도해 주세요.',
    });
  }
}

/**
 * PATCH /api/generations/:id/gallery
 * 생성 완료된 이모티콘을 갤러리에 저장합니다.
 */
export async function patchGenerationGallery(req, res) {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const result = await saveGenerationToGallery({ generationId: id, userId });
    return res.status(200).json(result);
  } catch (error) {
    rethrowControllerError(error, {
      logPrefix: `patchGenerationGallery failed (user=${userId}, generation=${id}):`,
      fallbackMessage: '갤러리 저장에 실패했습니다. 다시 시도해 주세요.',
    });
  }
}

/**
 * POST /api/generations/bulk-delete
 * req.user.id와 일치하는 generation만 여러 건 삭제합니다.
 */
export async function deleteGenerations(req, res) {
  const userId = req.user.id;
  const { ids } = req.body ?? {};

  try {
    const { deletedCount, deletedIds } = await deleteMyGenerations({
      generationIds: ids,
      userId,
    });

    return res.status(200).json({
      success: true,
      deletedCount,
      deletedIds,
    });
  } catch (error) {
    rethrowControllerError(error, {
      logPrefix: `deleteGenerations failed (user=${userId}, count=${ids?.length ?? 0}):`,
      fallbackMessage: '이모티콘 삭제에 실패했습니다. 다시 시도해 주세요.',
      validationField: 'ids',
    });
  }
}

/**
 * DELETE /api/generations/:id
 * req.user.id와 일치하는 generation만 삭제합니다.
 */
export async function deleteGeneration(req, res) {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    await deleteMyGeneration({ generationId: id, userId });
    return res.status(200).json({ success: true });
  } catch (error) {
    rethrowControllerError(error, {
      logPrefix: `deleteGeneration failed (user=${userId}, generation=${id}):`,
      fallbackMessage: '이모티콘 삭제에 실패했습니다. 다시 시도해 주세요.',
    });
  }
}
