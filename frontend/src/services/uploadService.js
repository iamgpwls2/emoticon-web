import { supabase } from '../lib/supabase.js';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:3000';

/**
 * 이미지 파일을 backend POST /api/uploads/image 로 업로드합니다.
 * @param {File} file
 * @returns {Promise<{ ok: true, bucket: string, path: string, mimeType: string, size: number }>}
 */
export async function uploadImage(file) {
  if (!file) {
    throw new Error('Image file is required.');
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  const accessToken = session?.access_token;
  if (!accessToken) {
    throw new Error('You must be signed in to upload an image.');
  }

  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`${API_BASE_URL}/api/uploads/image`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error('Upload failed. Please try again.');
  }

  if (!response.ok) {
    const message =
      body?.error?.message || 'Upload failed. Please try again.';
    throw new Error(message);
  }

  return body;
}
