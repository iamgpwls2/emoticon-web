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

/**
 * POST /api/prompts/refine 등 LLM 프롬프트 정제 요청 body 검증.
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

  if (
    originalImageUrl !== undefined &&
    originalImageUrl !== null &&
    typeof originalImageUrl !== 'string'
  ) {
    errors.push({
      field: 'originalImageUrl',
      message: 'originalImageUrl은 문자열이어야 합니다.',
    });
  }

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
