import {
  createGeneratingRecord,
  deleteMyGeneration,
  listMyGenerations,
  markGenerationCompleted,
  markGenerationFailed,
} from '../services/generation.service.js';
import { generateImageFromPrompt } from '../services/imageGeneration.service.js';
import { applyCharacterPreservationGuards } from '../services/llm.service.js';
import {
  uploadGeneratedEmoticon,
  validateUserUploadOwnership,
} from '../services/storage.service.js';
import { HttpError } from '../utils/httpError.js';

const DEFAULT_LIST_LIMIT = 12;
const MAX_LIST_LIMIT = 50;

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
}

function toSafeErrorMessage(error) {
  if (error.isImageGenerationServiceError) {
    return 'Image generation request failed.';
  }
  if (error.isStorageServiceError) {
    return 'Storage operation failed.';
  }
  return 'Generation pipeline failed.';
}

/**
 * GET /api/generations/me
 * req.user.id 기준으로 본인 생성 기록을 페이지네이션 조회합니다.
 */
export async function getMyGenerations(req, res) {
  const userId = req.user.id;
  const page = parsePositiveInt(req.query.page, 1);
  const limit = Math.min(
    MAX_LIST_LIMIT,
    parsePositiveInt(req.query.limit, DEFAULT_LIST_LIMIT)
  );

  try {
    const { items, total } = await listMyGenerations({ userId, page, limit });

    return res.status(200).json({
      items,
      page,
      limit,
      total,
      hasMore: page * limit < total,
    });
  } catch (error) {
    console.error(`getMyGenerations failed (user=${userId}):`, error.message);
    throw HttpError.serverError(
      '이모티콘 목록을 불러오지 못했습니다. 다시 시도해 주세요.'
    );
  }
}

/**
 * POST /api/generations
 * req.body는 validateCreateGeneration 미들웨어에서 검증된 값을 사용합니다.
 */
export async function createGeneration(req, res) {
  const userId = req.user.id;
  const {
    originalImageUrl,
    emotion,
    motion,
    inputText,
    storyPrompt,
    finalPrompt,
  } = req.body;

  const trimmedOriginalImageUrl = originalImageUrl?.trim() || undefined;

  validateUserUploadOwnership({
    originalImageUrl: trimmedOriginalImageUrl,
    userId,
  });

  const hasReferenceImage = Boolean(trimmedOriginalImageUrl);
  const trimmedInputText =
    typeof inputText === 'string' ? inputText.trim() : '';
  const trimmedFinalPrompt = finalPrompt?.trim();
  const { finalPrompt: imageGenerationPrompt } = applyCharacterPreservationGuards(
    {
      storyPrompt: typeof storyPrompt === 'string' ? storyPrompt.trim() : '',
      finalPrompt: trimmedFinalPrompt,
    },
    {
      hasReferenceImage,
      inputText: trimmedInputText,
    }
  );

  console.info('createGeneration request', {
    userId,
    hasReferenceImage,
    hasInputText: Boolean(trimmedInputText),
  });

  let record;

  try {
    record = await createGeneratingRecord({
      userId,
      originalImageUrl: trimmedOriginalImageUrl,
      emotion,
      motion,
      inputText,
      storyPrompt,
      finalPrompt: imageGenerationPrompt,
    });
  } catch (error) {
    console.error(`createGeneration failed (user=${userId}):`, error.message);
    throw HttpError.serverError(
      '이모티콘 생성에 실패했습니다. 다시 시도해 주세요.'
    );
  }

  try {
    const { imageBuffer, mimeType } = await generateImageFromPrompt({
      finalPrompt: imageGenerationPrompt,
      originalImageUrl: trimmedOriginalImageUrl,
      userId,
    });
    const { generatedImageUrl } = await uploadGeneratedEmoticon(
      userId,
      record.id,
      imageBuffer,
      mimeType
    );
    const updated = await markGenerationCompleted({
      generationId: record.id,
      userId,
      generatedImageUrl,
    });

    return res.status(201).json({
      id: updated.id,
      generatedImageUrl: updated.generated_image_url,
      status: updated.status,
    });
  } catch (error) {
    console.error(
      `createGeneration failed (user=${userId}, generation=${record.id}):`,
      error.message
    );

    try {
      await markGenerationFailed({
        generationId: record.id,
        userId,
        errorMessage: toSafeErrorMessage(error),
      });
    } catch (markError) {
      console.error(
        `markGenerationFailed failed (user=${userId}, generation=${record.id}):`,
        markError.message
      );
    }

    if (error.isImageGenerationServiceError) {
      throw HttpError.externalApi(
        '이모티콘 생성에 실패했습니다. 다시 시도해 주세요.'
      );
    }

    if (error.isStorageServiceError) {
      throw HttpError.storage('이모티콘 생성에 실패했습니다. 다시 시도해 주세요.');
    }

    throw HttpError.serverError(
      '이모티콘 생성에 실패했습니다. 다시 시도해 주세요.'
    );
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
    console.error(
      `deleteGeneration failed (user=${userId}, generation=${id}):`,
      error.message
    );

    if (error.isGenerationNotFoundError) {
      throw HttpError.notFound('이모티콘을 찾을 수 없습니다.');
    }

    throw HttpError.serverError(
      '이모티콘 삭제에 실패했습니다. 다시 시도해 주세요.'
    );
  }
}
