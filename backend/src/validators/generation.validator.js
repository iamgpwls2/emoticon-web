const INPUT_TEXT_MAX_LENGTH = 500;

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function sendValidationError(res, errors) {
  return res.status(400).json({
    message: '입력값을 확인해 주세요.',
    errors,
  });
}

function validateOptionalStringField(errors, field, value) {
  if (value !== undefined && value !== null && typeof value !== 'string') {
    errors.push({
      field,
      message: `${field}은 문자열이어야 합니다.`,
    });
  }
}

/**
 * POST /api/generations 요청 body 검증.
 * finalPrompt만 필수 · 나머지 필드는 선택.
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

  validateOptionalStringField(errors, 'originalImageUrl', originalImageUrl);
  validateOptionalStringField(errors, 'emotion', emotion);
  validateOptionalStringField(errors, 'motion', motion);
  validateOptionalStringField(errors, 'inputText', inputText);
  validateOptionalStringField(errors, 'storyPrompt', storyPrompt);

  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  if (typeof originalImageUrl === 'string') {
    const trimmedOriginalImageUrl = originalImageUrl.trim();
    if (trimmedOriginalImageUrl) {
      req.body.originalImageUrl = trimmedOriginalImageUrl;
    } else {
      delete req.body.originalImageUrl;
    }
  }

  next();
}
