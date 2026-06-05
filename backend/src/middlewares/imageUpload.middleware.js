import path from 'path';
import multer from 'multer';

const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const storage = multer.memoryStorage();

function sendUploadError(res, status, message) {
  return res.status(status).json({
    ok: false,
    error: { message },
  });
}

function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeAllowed = ALLOWED_MIME_TYPES.has(file.mimetype);
  const extAllowed = ALLOWED_EXTENSIONS.has(ext);

  if (!mimeAllowed || !extAllowed) {
    const err = new Error(
      'Only PNG, JPG, JPEG, and WEBP images are allowed.'
    );
    err.statusCode = 400;
    return cb(err);
  }

  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
});

function mapMulterError(err) {
  switch (err.code) {
    case 'LIMIT_FILE_SIZE':
      return {
        status: 413,
        message: 'Image must be 5MB or smaller.',
      };
    case 'LIMIT_UNEXPECTED_FILE':
      return {
        status: 400,
        message: 'Upload field name must be "image".',
      };
    case 'LIMIT_FILE_COUNT':
    case 'LIMIT_PART_COUNT':
      return {
        status: 400,
        message: 'Only one image file can be uploaded at a time.',
      };
    default:
      return {
        status: 400,
        message: 'Image upload failed. Please try again.',
      };
  }
}

/**
 * multipart/form-data 단일 이미지 업로드 (field: image).
 * req.file.buffer 로 Supabase Storage에 바로 업로드할 수 있습니다.
 */
export function imageUpload(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (!err) {
      return next();
    }

    if (err instanceof multer.MulterError) {
      const { status, message } = mapMulterError(err);
      return sendUploadError(res, status, message);
    }

    return sendUploadError(
      res,
      err.statusCode || 400,
      err.message || 'Image upload failed.'
    );
  });
}
