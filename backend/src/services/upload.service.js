import crypto from 'crypto';
import { fileTypeFromBuffer } from 'file-type';
import { supabaseAdmin } from '../config/supabase.js';
import { getUploadBucketName } from '../validators/shared.validation.js';

const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

const INVALID_IMAGE_FORMAT_MESSAGE =
  '실제 이미지 형식이 올바르지 않습니다. PNG, JPG, WEBP 파일만 업로드할 수 있습니다.';

function createUploadValidationError(message) {
  const error = new Error(message);
  error.isUploadValidationError = true;
  return error;
}

function createStorageError(message) {
  const error = new Error(message);
  error.isStorageServiceError = true;
  return error;
}

/**
 * 사용자 업로드 이미지를 Supabase Storage에 저장합니다.
 *
 * @param {{ userId: string, buffer: Buffer, size: number }} params
 * @returns {Promise<{ ok: true, bucket: string, path: string, mimeType: string, size: number }>}
 */
export async function uploadUserImage({ userId, buffer, size }) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw createUploadValidationError('업로드할 이미지 파일을 선택해 주세요.');
  }

  const normalizedUserId = typeof userId === 'string' ? userId.trim() : '';
  if (!normalizedUserId) {
    throw createUploadValidationError('userId is required.');
  }

  let detected;
  try {
    detected = await fileTypeFromBuffer(buffer);
  } catch {
    throw createUploadValidationError(INVALID_IMAGE_FORMAT_MESSAGE);
  }

  if (!detected || !ALLOWED_MIME_TYPES.has(detected.mime)) {
    throw createUploadValidationError(INVALID_IMAGE_FORMAT_MESSAGE);
  }

  const ext = detected.ext === 'jpeg' ? 'jpg' : detected.ext;
  const filename = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const storagePath = `${normalizedUserId}/${filename}`;
  const bucket = getUploadBucketName();
  const mimeType = detected.mime;

  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    console.error('Supabase Storage upload failed:', error.message);
    throw createStorageError('Failed to upload user image.');
  }

  return {
    ok: true,
    bucket,
    path: storagePath,
    mimeType,
    size,
  };
}
