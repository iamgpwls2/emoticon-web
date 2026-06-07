import { supabaseAdmin } from '../config/supabase.js';

const GENERATED_EMOTICONS_BUCKET = 'generated-emoticons';
const DEFAULT_GENERATED_MIME_TYPE = 'image/png';
const DEFAULT_SIGNED_URL_EXPIRES_IN_SECONDS = 3600;

function createServiceError(message) {
  const error = new Error(message);
  error.isStorageServiceError = true;
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

function parseSupabaseStorageObjectUrl(urlString) {
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
 * @returns {Promise<{ imageBuffer: Buffer, mimeType: string }>}
 */
export async function downloadReferenceImageByUrl(originalImageUrl, signal) {
  const trimmedUrl = assertNonEmptyString(originalImageUrl, 'originalImageUrl');
  const storageRef = parseSupabaseStorageObjectUrl(trimmedUrl);

  if (storageRef) {
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
