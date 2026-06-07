import crypto from 'crypto';
import { fileTypeFromBuffer } from 'file-type';
import { supabaseAdmin } from '../config/supabase.js';
import { HttpError } from '../utils/httpError.js';

const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

/**
 * POST /api/uploads/image
 * req.user.id 기준 Storage 경로: {user_id}/{timestamp}-{uuid}.{ext}
 */
export async function uploadImage(req, res) {
  if (!req.file) {
    throw HttpError.validation('업로드할 이미지 파일을 선택해 주세요.');
  }

  const { buffer, size } = req.file;

  let detected;
  try {
    detected = await fileTypeFromBuffer(buffer);
  } catch {
    throw HttpError.validation('실제 이미지 형식이 올바르지 않습니다. PNG, JPG, WEBP 파일만 업로드할 수 있습니다.');
  }

  if (!detected || !ALLOWED_MIME_TYPES.has(detected.mime)) {
    throw HttpError.validation(
      '실제 이미지 형식이 올바르지 않습니다. PNG, JPG, WEBP 파일만 업로드할 수 있습니다.'
    );
  }

  const ext = detected.ext === 'jpeg' ? 'jpg' : detected.ext;
  const filename = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const storagePath = `${req.user.id}/${filename}`;
  const bucket =
    process.env.SUPABASE_UPLOAD_BUCKET?.trim() || 'user-uploads';
  const mimeType = detected.mime;

  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    console.error('Supabase Storage upload failed:', error.message);
    throw HttpError.storage('이미지 저장 중 오류가 발생했습니다.');
  }

  return res.status(201).json({
    ok: true,
    bucket,
    path: storagePath,
    mimeType,
    size,
  });
}
