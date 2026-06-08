import { HttpError } from '../utils/httpError.js';
import {
  INPUT_TEXT_MAX_LENGTH,
  getUserOwnedUploadUrlValidationError,
  isNonEmptyString,
  pushOptionalStringField,
  trimOptionalOriginalImageUrl,
} from './shared.validation.js';

/**
 * POST /api/prompts/refine 요청 body 검증.
 * emotion, motion, inputText 필수 · originalImageUrl 선택.
 */
export function validatePromptRefine(req, res, next) {
  const { emotion, motion, inputText, originalImageUrl } = req.body ?? {};
  const errors = [];

  if (!isNonEmptyString(emotion)) {
    errors.push({
      field: 'emotion',
      message: 'emotion은 필수값입니다.',
    });
  }

  if (!isNonEmptyString(motion)) {
    errors.push({
      field: 'motion',
      message: 'motion은 필수값입니다.',
    });
  }

  if (!isNonEmptyString(inputText)) {
    errors.push({
      field: 'inputText',
      message: 'inputText는 필수값입니다.',
    });
  } else if (inputText.trim().length > INPUT_TEXT_MAX_LENGTH) {
    errors.push({
      field: 'inputText',
      message: `inputText는 최대 ${INPUT_TEXT_MAX_LENGTH}자까지 입력할 수 있습니다.`,
    });
  }

  pushOptionalStringField(errors, 'originalImageUrl', originalImageUrl);

  if (errors.length > 0) {
    return next(
      HttpError.validation('입력값을 확인해 주세요.', { errors })
    );
  }

  const originalImageUrlError = getUserOwnedUploadUrlValidationError(
    req.user?.id,
    originalImageUrl
  );
  if (originalImageUrlError) {
    return next(
      HttpError.validation('본인이 업로드한 이미지 URL만 사용할 수 있습니다.', {
        errors: [
          {
            field: 'originalImageUrl',
            message: originalImageUrlError,
          },
        ],
      })
    );
  }

  trimOptionalOriginalImageUrl(req);
  next();
}
