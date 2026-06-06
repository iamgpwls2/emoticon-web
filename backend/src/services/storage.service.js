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
