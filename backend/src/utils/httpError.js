export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  STORAGE_ERROR: 'STORAGE_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
};

export class HttpError extends Error {
  /**
   * @param {number} statusCode
   * @param {string} message
   * @param {string} code
   * @param {Record<string, unknown> | undefined} [details]
   */
  constructor(statusCode, message, code, details) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isHttpError = true;
  }

  static validation(message, details) {
    return new HttpError(
      400,
      message,
      ErrorCode.VALIDATION_ERROR,
      details
    );
  }

  static unauthorized(message = '로그인이 필요합니다.') {
    return new HttpError(401, message, ErrorCode.UNAUTHORIZED);
  }

  static forbidden(message = '접근 권한이 없습니다.') {
    return new HttpError(403, message, ErrorCode.FORBIDDEN);
  }

  static notFound(message = '요청한 리소스를 찾을 수 없습니다.') {
    return new HttpError(404, message, ErrorCode.NOT_FOUND);
  }

  static storage(message = '저장소 작업에 실패했습니다. 다시 시도해 주세요.') {
    return new HttpError(500, message, ErrorCode.STORAGE_ERROR);
  }

  static externalApi(message = '외부 서비스 요청에 실패했습니다. 다시 시도해 주세요.') {
    return new HttpError(500, message, ErrorCode.EXTERNAL_API_ERROR);
  }

  static serverError(message = '서버 처리 중 오류가 발생했습니다. 다시 시도해 주세요.') {
    return new HttpError(500, message, ErrorCode.SERVER_ERROR);
  }
}

const SENSITIVE_PATTERNS = [
  /api[_-]?key/i,
  /service[_-]?role/i,
  /secret/i,
  /bearer\s+/i,
  /authorization/i,
  /supabase/i,
  /sk-[a-z0-9_-]+/i,
  /sb_[a-z0-9_-]+/i,
];

function sanitizeLogMessage(message) {
  if (typeof message !== 'string') {
    return 'Unknown error';
  }

  let sanitized = message;
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[redacted]');
  }
  return sanitized;
}

/**
 * 알 수 없는 에러를 HttpError로 정규화합니다.
 *
 * @param {unknown} err
 * @param {{
 *   fallbackMessage?: string,
 *   storageMessage?: string,
 *   externalApiMessage?: string,
 *   validationField?: string,
 * }} [options]
 * @returns {HttpError}
 */
export function normalizeError(err, options = {}) {
  const {
    fallbackMessage,
    storageMessage,
    externalApiMessage,
    validationField,
  } = options;

  if (err instanceof HttpError) {
    return err;
  }

  if (err?.isUploadValidationError) {
    return HttpError.validation(err.message);
  }

  if (err?.isUploadOwnershipValidationError) {
    return HttpError.validation(err.message, err.details);
  }

  if (err?.isUploadOwnershipForbiddenError) {
    return HttpError.forbidden(err.message);
  }

  if (err?.isCollectionNotFoundError) {
    return HttpError.notFound('폴더를 찾을 수 없습니다.');
  }

  if (err?.isGenerationNotFoundError) {
    return HttpError.notFound('이모티콘을 찾을 수 없습니다.');
  }

  if (err?.isGenerationNotSavableError) {
    return HttpError.validation(
      '생성이 완료된 이모티콘만 갤러리에 저장할 수 있습니다.'
    );
  }

  if (err?.isGenerationServiceError) {
    if (validationField) {
      return HttpError.validation('입력값을 확인해 주세요.', {
        errors: [{ field: validationField, message: err.message }],
      });
    }

    return HttpError.serverError(fallbackMessage);
  }

  if (err?.isStorageServiceError) {
    return HttpError.storage(storageMessage);
  }

  if (err?.isImageGenerationServiceError) {
    return HttpError.externalApi(
      externalApiMessage ??
        '이모티콘 생성에 실패했습니다. 다시 시도해 주세요.'
    );
  }

  if (err?.isLlmServiceError) {
    return HttpError.externalApi(
      externalApiMessage ??
        '프롬프트 구체화에 실패했습니다. 다시 시도해 주세요.'
    );
  }

  return HttpError.serverError(fallbackMessage);
}

export { sanitizeLogMessage };
