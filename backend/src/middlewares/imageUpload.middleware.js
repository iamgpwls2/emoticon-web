import path from 'path';
import multer from 'multer';
import { HttpError } from '../utils/httpError.js';

const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const storage = multer.memoryStorage();

function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeAllowed = ALLOWED_MIME_TYPES.has(file.mimetype);
  const extAllowed = ALLOWED_EXTENSIONS.has(ext);

  if (!mimeAllowed || !extAllowed) {
    const err = HttpError.validation(
      'PNG, JPG, JPEG, WEBP 이미지 파일만 업로드할 수 있습니다.'
    );
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
      return new HttpError(
        413,
        '이미지는 최대 5MB까지 업로드할 수 있습니다.',
        'VALIDATION_ERROR'
      );
    case 'LIMIT_UNEXPECTED_FILE':
      return HttpError.validation('업로드 필드 이름은 image여야 합니다.');
    case 'LIMIT_FILE_COUNT':
    case 'LIMIT_PART_COUNT':
      return HttpError.validation('한 번에 하나의 이미지 파일만 업로드할 수 있습니다.');
    default:
      return HttpError.validation('이미지 업로드에 실패했습니다. 다시 시도해 주세요.');
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
      return next(mapMulterError(err));
    }

    next(err);
  });
}
