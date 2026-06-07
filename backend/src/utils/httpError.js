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
 * @param {unknown} err
 * @returns {HttpError}
 */
export function normalizeError(err) {
  if (err instanceof HttpError) {
    return err;
  }

  if (err?.isGenerationNotFoundError) {
    return HttpError.notFound('이모티콘을 찾을 수 없습니다.');
  }

  if (err?.isStorageServiceError) {
    return HttpError.storage();
  }

  if (err?.isImageGenerationServiceError) {
    return HttpError.externalApi(
      '이모티콘 생성에 실패했습니다. 다시 시도해 주세요.'
    );
  }

  if (err?.isLlmServiceError) {
    return HttpError.externalApi(
      '프롬프트 구체화에 실패했습니다. 다시 시도해 주세요.'
    );
  }

  if (err?.isGenerationServiceError) {
    return HttpError.serverError();
  }

  return HttpError.serverError();
}

export { sanitizeLogMessage };
