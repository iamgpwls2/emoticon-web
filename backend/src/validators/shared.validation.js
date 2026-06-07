export const INPUT_TEXT_MAX_LENGTH = 500;

export function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * http: 또는 https: 프로토콜의 유효한 URL인지 검사합니다.
 * @param {string} value
 * @returns {boolean}
 */
export function isValidHttpOrHttpsUrl(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return false;
  }

  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * @param {Array<{ field: string, message: string }>} errors
 * @param {string} field
 * @param {unknown} value
 */
export function pushOptionalStringField(errors, field, value) {
  if (value !== undefined && value !== null && typeof value !== 'string') {
    errors.push({
      field,
      message: `${field}은 문자열이어야 합니다.`,
    });
  }
}

/**
 * @param {import('express').Request} req
 * @param {string} field
 */
export function trimOptionalOriginalImageUrl(req, field = 'originalImageUrl') {
  const value = req.body?.[field];
  if (typeof value !== 'string') {
    return;
  }

  const trimmed = value.trim();
  if (trimmed) {
    req.body[field] = trimmed;
  } else {
    delete req.body[field];
  }
}
