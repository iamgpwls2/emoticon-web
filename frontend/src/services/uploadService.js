import { supabase } from '../lib/supabase.js';
import API_BASE_URL from '@/lib/apiClient.js';
import { readApiResponse } from '../utils/apiError.js';

const UPLOAD_FAILED_MESSAGE = '이미지 업로드에 실패했습니다. 다시 시도해 주세요.';

async function getAccessToken() {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  const accessToken = session?.access_token;
  if (!accessToken) {
    throw new Error('이미지를 업로드하려면 로그인이 필요합니다.');
  }

  return accessToken;
}

/**
 * 이미지 파일을 backend POST /api/uploads/image 로 업로드합니다.
 * @param {File} file
 * @returns {Promise<{ ok: true, bucket: string, path: string, mimeType: string, size: number }>}
 */
export async function uploadImage(file) {
  if (!file) {
    throw new Error('업로드할 이미지 파일을 선택해 주세요.');
  }

  const accessToken = await getAccessToken();
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
