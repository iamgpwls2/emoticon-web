import crypto from 'crypto';
import { fileTypeFromBuffer } from 'file-type';
import { supabaseAdmin } from '../config/supabase.js';

const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

function sendError(res, status, message) {
  return res.status(status).json({
    ok: false,
    error: { message },
  });
}

/**
 * POST /api/uploads/image
 * req.user.id 기준 Storage 경로: {user_id}/{timestamp}-{uuid}.{ext}
 */
export async function uploadImage(req, res) {
  if (!req.file) {
    return sendError(res, 400, 'Image file is required.');
  }

  const { buffer, size } = req.file;

  let detected;
  try {
    detected = await fileTypeFromBuffer(buffer);
  } catch {
    return sendError(res, 400, 'Unable to validate image file.');
  }

  if (!detected || !ALLOWED_MIME_TYPES.has(detected.mime)) {
    return sendError(
      res,
      400,
      'Only PNG, JPG, JPEG, and WEBP images are allowed.'
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
    return sendError(res, 500, 'Failed to upload image. Please try again.');
  }

  return res.status(201).json({
    ok: true,
    bucket,
    path: storagePath,
    mimeType,
    size,
  });
}
