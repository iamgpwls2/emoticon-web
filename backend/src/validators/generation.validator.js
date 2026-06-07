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

  if (errors.length > 0) {
    return next(
      HttpError.validation('입력값을 확인해 주세요.', { errors })
    );
  }

  if (
    typeof originalImageUrl === 'string' &&
    originalImageUrl.trim() &&
    !isValidHttpOrHttpsUrl(originalImageUrl)
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
