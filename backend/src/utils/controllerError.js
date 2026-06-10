import { normalizeError } from './httpError.js';

/**
 * 컨트롤러 catch 블록에서 도메인 에러를 HttpError로 변환해 다시 throw합니다.
 *
 * @param {unknown} error
 * @param {{
 *   logPrefix: string,
 *   fallbackMessage?: string,
 *   storageMessage?: string,
 *   externalApiMessage?: string,
 *   validationField?: string,
 * }} options
 * @returns {never}
 */
export function rethrowControllerError(error, options) {
  const { logPrefix, ...normalizeOptions } = options;
  console.error(logPrefix, error?.message ?? error);
  throw normalizeError(error, normalizeOptions);
}
