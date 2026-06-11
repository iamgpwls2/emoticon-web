import API_BASE_URL from '@/lib/apiClient.js';
import { resolveAccessToken } from '../lib/authSession.js';
import { readApiResponse } from '../utils/apiError.js';

const UPLOAD_FAILED_MESSAGE = '이미지 업로드에 실패했습니다. 다시 시도해 주세요.';

/**
 * 이미지 파일을 backend POST /api/uploads/image 로 업로드합니다.
 * @param {File} file
 * @returns {Promise<{ ok: true, bucket: string, path: string, mimeType: string, size: number }>}
 */
export async function uploadImage(file) {
  if (!file) {
    throw new Error('업로드할 이미지 파일을 선택해 주세요.');
  }

  const accessToken = await resolveAccessToken(
    '이미지를 업로드하려면 로그인이 필요합니다.'
  );
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`${API_BASE_URL}/api/uploads/image`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  return readApiResponse(response, UPLOAD_FAILED_MESSAGE);
}

const SIGNED_URL_FAILED_MESSAGE =
  '이미지 미리보기 URL을 생성하지 못했습니다. 다시 시도해 주세요.';

/**
 * 본인 user-uploads 오브젝트의 미리보기용 signed URL을 발급받습니다.
 * @param {string} path Storage object path (예: `{userId}/{timestamp}-{uuid}.png`)
 * @returns {Promise<{ ok: true, path: string, signedUrl: string }>}
 */
export async function getUploadSignedUrl(path) {
  const trimmedPath = path?.trim();
  if (!trimmedPath) {
    throw new Error('미리보기할 이미지 경로가 없습니다.');
  }

  const accessToken = await resolveAccessToken(
    '이미지 미리보기를 보려면 로그인이 필요합니다.'
  );

  const query = new URLSearchParams({ path: trimmedPath });
  const response = await fetch(
    `${API_BASE_URL}/api/uploads/signed-url?${query.toString()}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  return readApiResponse(response, SIGNED_URL_FAILED_MESSAGE);
}
