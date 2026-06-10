import { supabaseAdmin } from '../config/supabase.js';
import {
  getUploadBucketName,
  isValidHttpOrHttpsUrl,
  parseSupabaseStorageObjectUrl,
} from '../validators/shared.validation.js';

const UPLOAD_OWNERSHIP_FORBIDDEN_MESSAGE =
  '원본 이미지에 접근할 권한이 없습니다.';
const UPLOAD_OWNERSHIP_VALIDATION_MESSAGE =
  '본인이 업로드한 이미지 URL만 사용할 수 있습니다.';

const GENERATED_EMOTICONS_BUCKET = 'generated-emoticons';
const DEFAULT_GENERATED_MIME_TYPE = 'image/png';
const DEFAULT_SIGNED_URL_EXPIRES_IN_SECONDS = 3600;

function createServiceError(message) {
  const error = new Error(message);
  error.isStorageServiceError = true;
  return error;
}

function createUploadOwnershipValidationError(message, details) {
  const error = new Error(message);
  error.isUploadOwnershipValidationError = true;
  error.details = details;
  return error;
}

function createUploadOwnershipForbiddenError(message) {
  const error = new Error(message);
  error.isUploadOwnershipForbiddenError = true;
  return error;
}

function assertNonEmptyString(value, fieldName) {
  if (typeof value !== 'string' || !value.trim()) {
    throw createServiceError(`${fieldName} is required.`);
  }
  return value.trim();
}

function assertImageBuffer(imageBuffer) {
  if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
    throw createServiceError('imageBuffer is required.');
  }
}

function buildGeneratedEmoticonPath(userId, generationId) {
  return `${userId}/${generationId}.png`;
}

function guessMimeTypeFromPath(path) {
  const lower = path.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return null;
}

/**
 * Supabase Storage object URL에서 지정 bucket의 object path를 추출합니다.
 * @param {string} url
 * @param {string} [bucketName]
 * @returns {string | null}
 */
export function extractStoragePathFromUrl(url, bucketName) {
  const trimmedUrl = typeof url === 'string' ? url.trim() : '';
  if (!trimmedUrl) {
    return null;
  }

  const storageRef = parseSupabaseStorageObjectUrl(trimmedUrl);
  if (!storageRef) {
    return null;
  }

  const bucket = bucketName || getUploadBucketName();
  if (storageRef.bucket !== bucket) {
    return null;
  }

  return storageRef.path;
}

/**
 * originalImageUrl 또는 object path가 현재 사용자의 user-uploads 오브젝트인지 검증합니다.
 * 값이 없으면 통과합니다.
 *
 * @param {{ originalImageUrl?: string, userId: string }} params
 * @throws {Error & { isUploadOwnershipValidationError?: boolean, isUploadOwnershipForbiddenError?: boolean }}
 */
export function validateUserUploadOwnership({ originalImageUrl, userId }) {
  const trimmedValue =
    typeof originalImageUrl === 'string' ? originalImageUrl.trim() : '';
  if (!trimmedValue) {
    return;
  }

  const uploadBucket = getUploadBucketName();
  const normalizedUserId = typeof userId === 'string' ? userId.trim() : '';

  let objectPath = null;

  if (isValidHttpOrHttpsUrl(trimmedValue)) {
    objectPath = extractStoragePathFromUrl(trimmedValue, uploadBucket);
    if (!objectPath) {
      throw createUploadOwnershipValidationError(
        UPLOAD_OWNERSHIP_VALIDATION_MESSAGE,
        {
          errors: [
            {
              field: 'originalImageUrl',
              message: UPLOAD_OWNERSHIP_VALIDATION_MESSAGE,
            },
          ],
        }
      );
    }
  } else if (!trimmedValue.includes('://')) {
    objectPath = trimmedValue;
    if (!objectPath.includes('/')) {
      throw createUploadOwnershipValidationError(
        UPLOAD_OWNERSHIP_VALIDATION_MESSAGE,
        {
          errors: [
            {
              field: 'originalImageUrl',
              message: UPLOAD_OWNERSHIP_VALIDATION_MESSAGE,
            },
          ],
        }
      );
    }
  } else {
    throw createUploadOwnershipValidationError(
      UPLOAD_OWNERSHIP_VALIDATION_MESSAGE,
      {
        errors: [
          {
            field: 'originalImageUrl',
            message: UPLOAD_OWNERSHIP_VALIDATION_MESSAGE,
          },
        ],
      }
    );
  }

  if (!normalizedUserId || !objectPath.startsWith(`${normalizedUserId}/`)) {
    throw createUploadOwnershipForbiddenError(UPLOAD_OWNERSHIP_FORBIDDEN_MESSAGE);
  }
}

function assertUserOwnedUploadPath(userId, bucket, path) {
  const uploadBucket = getUploadBucketName();
  if (bucket !== uploadBucket) {
    return;
  }

  const normalizedUserId = typeof userId === 'string' ? userId.trim() : '';
  if (!normalizedUserId || !path.startsWith(`${normalizedUserId}/`)) {
    throw createServiceError('Reference image is not owned by the user.');
  }
}

async function downloadImageBufferFromHttpUrl(imageUrl, signal) {
  const response = await fetch(imageUrl, { signal });

  if (!response.ok) {
    let safeUrl = imageUrl;
    try {
      const parsed = new URL(imageUrl);
      safeUrl = `${parsed.origin}${parsed.pathname}`;
    } catch {
      safeUrl = '(invalid url)';
    }
    console.error('Reference image download failed:', response.status, safeUrl);
    throw createServiceError('Failed to download reference image.');
  }

  const imageBuffer = Buffer.from(await response.arrayBuffer());
  if (!imageBuffer.length) {
    throw createServiceError('Reference image download returned an empty response.');
  }

  const mimeType =
    response.headers.get('content-type')?.split(';')[0]?.trim() ||
    guessMimeTypeFromPath(imageUrl) ||
    DEFAULT_GENERATED_MIME_TYPE;

  return { imageBuffer, mimeType };
}

/**
 * originalImageUrl로 참조 이미지를 다운로드합니다.
 * Supabase Storage URL이면 service role로 private bucket에서 읽고,
 * 그 외 URL은 HTTP fetch를 시도합니다.
 *
 * @param {string} originalImageUrl
 * @param {AbortSignal} [signal]
 * @param {string} [userId] 전달 시 user-uploads 경로 소유자 검증
 * @returns {Promise<{ imageBuffer: Buffer, mimeType: string }>}
 */
export async function downloadReferenceImageByUrl(
  originalImageUrl,
  signal,
  userId
) {
  const trimmedUrl = assertNonEmptyString(originalImageUrl, 'originalImageUrl');
  const storageRef = parseSupabaseStorageObjectUrl(trimmedUrl);

  if (storageRef) {
    if (userId) {
      assertUserOwnedUploadPath(userId, storageRef.bucket, storageRef.path);
    }

    const { data, error } = await supabaseAdmin.storage
      .from(storageRef.bucket)
      .download(storageRef.path);

    if (error || !data) {
      console.error(
        'Supabase Storage reference download failed:',
        error?.message ?? 'unknown'
      );
      throw createServiceError('Failed to download reference image.');
    }

    const imageBuffer = Buffer.from(await data.arrayBuffer());
    if (!imageBuffer.length) {
      throw createServiceError('Reference image download returned an empty response.');
    }

    return {
      imageBuffer,
      mimeType:
        data.type ||
        guessMimeTypeFromPath(storageRef.path) ||
        DEFAULT_GENERATED_MIME_TYPE,
    };
  }

  if (userId) {
    throw createServiceError('Reference image must be uploaded by the user.');
  }

  return downloadImageBufferFromHttpUrl(trimmedUrl, signal);
}

/**
 * private bucket `generated-emoticons` 오브젝트의 signed URL을 생성합니다.
 * backend controller에서만 호출하세요.
 *
 * @param {string} userId
 * @param {string} generationId
 * @param {number} [expiresInSeconds=3600]
 * @returns {Promise<string>}
 */
export async function createGeneratedEmoticonSignedUrl(
  userId,
  generationId,
  expiresInSeconds = DEFAULT_SIGNED_URL_EXPIRES_IN_SECONDS
) {
  const resolvedUserId = assertNonEmptyString(userId, 'userId');
  const resolvedGenerationId = assertNonEmptyString(generationId, 'generationId');
  const path = buildGeneratedEmoticonPath(resolvedUserId, resolvedGenerationId);

  const { data, error } = await supabaseAdmin.storage
    .from(GENERATED_EMOTICONS_BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data?.signedUrl) {
    console.error(
      'Supabase Storage signed URL failed:',
      error?.message ?? 'unknown'
    );
    throw createServiceError(
      'Failed to create signed URL for generated emoticon.'
    );
  }

  return data.signedUrl;
}

/**
 * DB에 저장된 generated_image_url 목록을 받아, 각 URL에서 object path를 추출한 뒤
 * 새 signed URL을 일괄 발급해 같은 순서의 배열로 반환합니다.
 *
 * - DB에는 생성 시점의 signed URL이 저장되는데 1시간 뒤 만료되므로,
 *   갤러리 조회 등 읽기 시점마다 이 함수로 신선한 URL을 다시 만들어야 합니다.
 * - path 추출 실패(외부 URL 등)·재발급 실패 항목은 저장된 원본 값을 그대로 반환합니다.
 *
 * @param {Array<string | null | undefined>} generatedImageUrls
 * @param {number} [expiresInSeconds=3600]
 * @returns {Promise<Array<string | null>>}
 */
export async function refreshGeneratedEmoticonSignedUrls(
  generatedImageUrls,
  expiresInSeconds = DEFAULT_SIGNED_URL_EXPIRES_IN_SECONDS
) {
  if (!Array.isArray(generatedImageUrls) || generatedImageUrls.length === 0) {
    return [];
  }

  // 각 URL에서 generated-emoticons bucket의 object path를 추출 (실패 시 null)
  const paths = generatedImageUrls.map((url) => {
    const trimmedUrl = typeof url === 'string' ? url.trim() : '';
    if (!trimmedUrl) {
      return null;
    }

    const storageRef = parseSupabaseStorageObjectUrl(trimmedUrl);
    if (!storageRef || storageRef.bucket !== GENERATED_EMOTICONS_BUCKET) {
      return null;
    }

    return storageRef.path;
  });

  const fallbackUrls = generatedImageUrls.map((url) => {
    const trimmedUrl = typeof url === 'string' ? url.trim() : '';
    return trimmedUrl || null;
  });

  const uniquePaths = [...new Set(paths.filter(Boolean))];
  if (uniquePaths.length === 0) {
    return fallbackUrls;
  }

  const { data, error } = await supabaseAdmin.storage
    .from(GENERATED_EMOTICONS_BUCKET)
    .createSignedUrls(uniquePaths, expiresInSeconds);

  if (error || !Array.isArray(data)) {
    // 재발급 실패 시 목록 조회 자체는 살리고 저장된 URL을 그대로 내려준다.
    console.warn(
      'Failed to refresh signed URLs for generated emoticons:',
      error?.message ?? 'unknown'
    );
    return fallbackUrls;
  }

  const signedUrlByPath = new Map();
  for (const entry of data) {
    if (entry?.path && entry?.signedUrl && !entry.error) {
      signedUrlByPath.set(entry.path, entry.signedUrl);
    }
  }

  return paths.map((path, index) => {
    if (path && signedUrlByPath.has(path)) {
      return signedUrlByPath.get(path);
    }
    return fallbackUrls[index];
  });
}

/**
 * 생성된 이모티콘 이미지를 Supabase Storage `generated-emoticons` bucket에 업로드합니다.
 * backend controller에서만 호출하세요.
 *
 * @param {string} userId
 * @param {string} generationId
 * @param {Buffer} imageBuffer
 * @param {string} [mimeType='image/png']
 * @returns {Promise<{ path: string, generatedImageUrl: string }>}
 */
export async function uploadGeneratedEmoticon(
  userId,
  generationId,
  imageBuffer,
  mimeType = DEFAULT_GENERATED_MIME_TYPE
) {
  const resolvedUserId = assertNonEmptyString(userId, 'userId');
  const resolvedGenerationId = assertNonEmptyString(generationId, 'generationId');
  assertImageBuffer(imageBuffer);

  const contentType = mimeType?.trim() || DEFAULT_GENERATED_MIME_TYPE;
  const path = buildGeneratedEmoticonPath(resolvedUserId, resolvedGenerationId);

  const { error } = await supabaseAdmin.storage
    .from(GENERATED_EMOTICONS_BUCKET)
    .upload(path, imageBuffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    console.error('Supabase Storage upload failed:', error.message);
    throw createServiceError('Failed to upload generated emoticon.');
  }

  const generatedImageUrl = await createGeneratedEmoticonSignedUrl(
    resolvedUserId,
    resolvedGenerationId
  );

  return { path, generatedImageUrl };
}

/**
 * generated_image_url에서 generated-emoticons bucket object path를 추출해 삭제합니다.
 * path 추출 실패·Storage 삭제 실패 시 console.warn만 남기고 throw하지 않습니다.
 * original_image_url은 건드리지 않습니다.
 *
 * @param {string | null | undefined} generatedImageUrl
 * @returns {Promise<void>}
 */
export async function deleteGeneratedEmoticonByUrl(generatedImageUrl) {
  const trimmedUrl =
    typeof generatedImageUrl === 'string' ? generatedImageUrl.trim() : '';
  if (!trimmedUrl) {
    return;
  }

  const storageRef = parseSupabaseStorageObjectUrl(trimmedUrl);
  if (!storageRef) {
    console.warn(
      'Could not extract object path from generated image URL:',
      trimmedUrl
    );
    return;
  }

  if (storageRef.bucket !== GENERATED_EMOTICONS_BUCKET) {
    console.warn(
      `Generated image URL bucket is not ${GENERATED_EMOTICONS_BUCKET}:`,
      storageRef.bucket
    );
    return;
  }

  const { error } = await supabaseAdmin.storage
    .from(GENERATED_EMOTICONS_BUCKET)
    .remove([storageRef.path]);

  if (error) {
    console.warn(
      'Failed to delete generated emoticon from storage:',
      error.message
    );
  }
}
