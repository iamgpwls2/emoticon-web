import { uploadUserImage } from '../services/upload.service.js';
import { createUserUploadSignedUrl } from '../services/storage.service.js';
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

/**
 * GET /api/uploads/signed-url?path={user_id}/{filename}
 * 본인 user-uploads 오브젝트의 미리보기용 signed URL을 발급합니다.
 */
export async function getUploadSignedUrl(req, res) {
  const path = typeof req.query.path === 'string' ? req.query.path.trim() : '';

  if (!path || !path.includes('/')) {
    throw HttpError.validation('업로드 이미지 경로가 올바르지 않습니다.', {
      errors: [{ field: 'path', message: 'path는 필수값입니다.' }],
    });
  }

  try {
    const signedUrl = await createUserUploadSignedUrl(req.user.id, path);

    return res.json({
      ok: true,
      path,
      signedUrl,
    });
  } catch (error) {
    rethrowControllerError(error, {
      logPrefix: `getUploadSignedUrl failed (user=${req.user.id}):`,
      fallbackMessage: '이미지 미리보기 URL을 생성하지 못했습니다.',
      storageMessage: '이미지 미리보기 URL 생성 중 오류가 발생했습니다.',
    });
  }
}
