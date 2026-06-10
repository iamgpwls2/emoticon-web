import { HttpError } from '../utils/httpError.js';
import {
  INPUT_TEXT_MAX_LENGTH,
  isNonEmptyString,
  isValidHttpOrHttpsUrl,
  pushOptionalStringField,
  trimOptionalOriginalImageUrl,
} from './shared.validation.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(value) {
  return typeof value === 'string' && UUID_PATTERN.test(value.trim());
}

/**
 * POST /api/generations 요청 body 검증.
 * finalPrompt 필수 · 나머지 필드는 선택.
 */
export function validateCreateGeneration(req, res, next) {
  const {
    originalImageUrl,
    emotion,
    motion,
    inputText,
    storyPrompt,
    finalPrompt,
    collectionId,
  } = req.body ?? {};
  const errors = [];

  if (!isNonEmptyString(finalPrompt)) {
    errors.push({
      field: 'finalPrompt',
      message: 'finalPrompt는 필수값입니다.',
    });
  }

  if (
    typeof inputText === 'string' &&
    inputText.trim().length > INPUT_TEXT_MAX_LENGTH
  ) {
    errors.push({
      field: 'inputText',
      message: `inputText는 최대 ${INPUT_TEXT_MAX_LENGTH}자까지 입력할 수 있습니다.`,
    });
  }

  pushOptionalStringField(errors, 'originalImageUrl', originalImageUrl);
  pushOptionalStringField(errors, 'emotion', emotion);
  pushOptionalStringField(errors, 'motion', motion);
  pushOptionalStringField(errors, 'inputText', inputText);
  pushOptionalStringField(errors, 'storyPrompt', storyPrompt);

  if (
    collectionId !== undefined &&
    collectionId !== null &&
    collectionId !== '' &&
    !isValidUuid(collectionId)
  ) {
    errors.push({
      field: 'collectionId',
      message: 'collectionId 형식이 올바르지 않습니다.',
    });
  }

  if (errors.length > 0) {
    return next(
      HttpError.validation('입력값을 확인해 주세요.', { errors })
    );
  }

  if (
    typeof originalImageUrl === 'string' &&
    originalImageUrl.trim() &&
    !isValidHttpOrHttpsUrl(originalImageUrl) &&
    originalImageUrl.includes('://')
  ) {
    return next(
      HttpError.validation('원본 이미지 URL 형식이 올바르지 않습니다.', {
        errors: [
          {
            field: 'originalImageUrl',
            message: 'http 또는 https 형식의 URL을 입력해주세요.',
          },
        ],
      })
    );
  }

  trimOptionalOriginalImageUrl(req);

  if (typeof collectionId === 'string' && collectionId.trim()) {
    req.body.collectionId = collectionId.trim();
  } else {
    delete req.body.collectionId;
  }

  next();
}

/**
 * PATCH /api/generations/:id/collection body 검증.
 */
export function validateMoveGenerationCollection(req, res, next) {
  const { collectionId } = req.body ?? {};
  const errors = [];

  if (
    collectionId !== undefined &&
    collectionId !== null &&
    collectionId !== '' &&
    !isValidUuid(collectionId)
  ) {
    errors.push({
      field: 'collectionId',
      message: 'collectionId 형식이 올바르지 않습니다.',
    });
  }

  if (errors.length > 0) {
    return next(
      HttpError.validation('입력값을 확인해 주세요.', { errors })
    );
  }

  if (typeof collectionId === 'string' && collectionId.trim()) {
    req.body.collectionId = collectionId.trim();
  } else {
    req.body.collectionId = null;
  }

  next();
}

/**
 * GET /api/generations/me query 검증.
 */
export function validateListMyGenerationsQuery(req, res, next) {
  const { collectionId } = req.query ?? {};

  if (
    typeof collectionId === 'string' &&
    collectionId.trim() &&
    collectionId.trim() !== 'uncategorized' &&
    !isValidUuid(collectionId)
  ) {
    return next(
      HttpError.validation('입력값을 확인해 주세요.', {
        errors: [
          {
            field: 'collectionId',
            message: 'collectionId 형식이 올바르지 않습니다.',
          },
        ],
      })
    );
  }

  next();
}

const BULK_DELETE_MAX = 100;

/**
 * POST /api/generations/bulk-delete body 검증.
 */
export function validateBulkDeleteGenerations(req, res, next) {
  const { ids } = req.body ?? {};
  const errors = [];

  if (!Array.isArray(ids) || ids.length === 0) {
    errors.push({
      field: 'ids',
      message: 'ids는 1개 이상 필요합니다.',
    });
  } else {
    if (ids.length > BULK_DELETE_MAX) {
      errors.push({
        field: 'ids',
        message: `한 번에 최대 ${BULK_DELETE_MAX}개까지 삭제할 수 있습니다.`,
      });
    }

    for (let index = 0; index < ids.length; index += 1) {
      const id = ids[index];
      if (typeof id !== 'string' || !UUID_PATTERN.test(id.trim())) {
        errors.push({
          field: 'ids',
          message: `ids[${index}] 형식이 올바르지 않습니다.`,
        });
        break;
      }
    }
  }

  if (errors.length > 0) {
    return next(
      HttpError.validation('입력값을 확인해 주세요.', { errors })
    );
  }

  req.body.ids = [
    ...new Set(
      ids.filter((id) => typeof id === 'string' && id.trim()).map((id) => id.trim())
    ),
  ];

  next();
}

/**
 * DELETE /api/generations/:id path param 검증.
 */
export function validateGenerationIdParam(req, res, next) {
  const { id } = req.params ?? {};

  if (typeof id !== 'string' || !id.trim()) {
    return next(
      HttpError.validation('입력값을 확인해 주세요.', {
        errors: [{ field: 'id', message: 'id는 필수값입니다.' }],
      })
    );
  }

  if (!UUID_PATTERN.test(id.trim())) {
    return next(HttpError.notFound('이모티콘을 찾을 수 없습니다.'));
  }

  next();
}
