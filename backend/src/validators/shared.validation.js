export const INPUT_TEXT_MAX_LENGTH = 500;
const DEFAULT_UPLOAD_BUCKET = 'user-uploads';

export function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function getUploadBucketName() {
  return process.env.SUPABASE_UPLOAD_BUCKET?.trim() || DEFAULT_UPLOAD_BUCKET;
}

/**
 * Supabase Storage object URL에서 bucket·path를 추출합니다.
 * @param {string} urlString
 * @returns {{ bucket: string, path: string } | null}
 */
export function parseSupabaseStorageObjectUrl(urlString) {
  try {
    const url = new URL(urlString);
    const match = url.pathname.match(
      /^\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/
    );

    if (!match) {
      return null;
    }

    return {
      bucket: decodeURIComponent(match[1]),
      path: decodeURIComponent(match[2]),
    };
  } catch {
    return null;
  }
}

/**
 * originalImageUrl이 현재 사용자의 user-uploads 오브젝트인지 검사합니다.
 * @param {string | undefined} userId
 * @param {unknown} originalImageUrl
 * @returns {string | null} 오류 메시지. 유효하면 null
 */
export function getUserOwnedUploadUrlValidationError(userId, originalImageUrl) {
  const trimmedUrl =
    typeof originalImageUrl === 'string' ? originalImageUrl.trim() : '';
  if (!trimmedUrl) {
    return null;
  }

  if (!isValidHttpOrHttpsUrl(trimmedUrl)) {
    return 'http 또는 https 형식의 URL을 입력해주세요.';
  }

  const storageRef = parseSupabaseStorageObjectUrl(trimmedUrl);
  if (!storageRef) {
    return '본인이 업로드한 이미지 URL만 사용할 수 있습니다.';
  }

  if (storageRef.bucket !== getUploadBucketName()) {
    return '본인이 업로드한 이미지 URL만 사용할 수 있습니다.';
  }

  const normalizedUserId = typeof userId === 'string' ? userId.trim() : '';
  if (!normalizedUserId || !storageRef.path.startsWith(`${normalizedUserId}/`)) {
    return '본인이 업로드한 이미지 URL만 사용할 수 있습니다.';
  }

  return null;
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
