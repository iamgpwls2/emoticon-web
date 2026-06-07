/**
 * Day 11 backend error response { message, code, details? } 및 legacy envelope에서
 * 사용자용 message를 추출합니다.
 * @param {unknown} body
 * @param {string} fallbackMessage
 * @returns {string}
 */
export function parseApiErrorBody(body, fallbackMessage) {
  if (!body || typeof body !== 'object') {
    return fallbackMessage;
  }

  if (typeof body.message === 'string' && body.message.trim()) {
    return body.message.trim();
  }

  if (
    typeof body.error?.message === 'string' &&
    body.error.message.trim()
  ) {
    return body.error.message.trim();
  }

  return fallbackMessage;
}

/**
 * @param {Response} response
 * @returns {Promise<unknown|null>}
 */
export async function parseJsonResponse(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * @param {Response} response
 * @param {string} fallbackMessage
 * @returns {Promise<Record<string, unknown>>}
 */
export async function readApiResponse(response, fallbackMessage) {
  const body = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(parseApiErrorBody(body, fallbackMessage));
  }

  return body ?? {};
}

/**
 * @param {unknown} error
 * @param {string} fallbackMessage
 * @returns {string}
 */
export function toUserErrorMessage(error, fallbackMessage) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return fallbackMessage;
}
