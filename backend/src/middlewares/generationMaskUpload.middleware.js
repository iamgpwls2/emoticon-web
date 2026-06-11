import multer from 'multer';
import { HttpError } from '../utils/httpError.js';

const ALLOWED_MIME_TYPES = new Set(['image/png']);
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const storage = multer.memoryStorage();

function fileFilter(_req, file, cb) {
  if (file.fieldname !== 'maskImage') {
    const err = HttpError.validation('업로드 필드 이름은 maskImage여야 합니다.');
    return cb(err);
  }

  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    const err = HttpError.validation('마스크 이미지는 PNG 형식이어야 합니다.');
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
        '마스크 이미지는 최대 5MB까지 업로드할 수 있습니다.',
        'VALIDATION_ERROR'
      );
    case 'LIMIT_UNEXPECTED_FILE':
      return HttpError.validation('업로드 필드 이름은 maskImage여야 합니다.');
    case 'LIMIT_FILE_COUNT':
    case 'LIMIT_PART_COUNT':
      return HttpError.validation('한 번에 하나의 마스크 이미지만 업로드할 수 있습니다.');
    default:
      return HttpError.validation('마스크 이미지 업로드에 실패했습니다. 다시 시도해 주세요.');
  }
}

/**
 * POST /api/generations — multipart/form-data 요청 시 maskImage 파일을 파싱합니다.
 * JSON 요청은 그대로 통과합니다.
 */
export function optionalGenerationMaskUpload(req, res, next) {
  const contentType = req.headers['content-type'] ?? '';
  if (!contentType.includes('multipart/form-data')) {
    return next();
  }

  upload.single('maskImage')(req, res, (err) => {
    if (!err) {
      return next();
    }

    if (err instanceof multer.MulterError) {
      return next(mapMulterError(err));
    }

    next(err);
  });
}
