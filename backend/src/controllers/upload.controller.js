import { uploadUserImage } from '../services/upload.service.js';
import { HttpError } from '../utils/httpError.js';
import { rethrowControllerError } from '../utils/controllerError.js';

/**
 * POST /api/uploads/image
 * req.user.id 기준 Storage 경로: {user_id}/{timestamp}-{uuid}.{ext}
 */
export async function uploadImage(req, res) {
  if (!req.file) {
    throw HttpError.validation('업로드할 이미지 파일을 선택해 주세요.');
  }

  const { buffer, size } = req.file;

  try {
    const result = await uploadUserImage({
      userId: req.user.id,
      buffer,
      size,
    });

    return res.status(201).json(result);
  } catch (error) {
    rethrowControllerError(error, {
      logPrefix: `uploadImage failed (user=${req.user.id}):`,
      fallbackMessage: '이미지 업로드에 실패했습니다. 다시 시도해 주세요.',
      storageMessage: '이미지 저장 중 오류가 발생했습니다.',
    });
  }
}
