import { supabase } from '../lib/supabase.js';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:3000';

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * backend POST /api/generations 로 이모티콘 이미지 생성을 요청합니다.
 * @param {{
 *   originalImageUrl?: string,
 *   emotion: string,
 *   motion: string,
 *   inputText: string,
 *   storyPrompt: string,
 *   finalPrompt: string,
 * }} payload
 * @returns {Promise<{ id: string, generatedImageUrl: string, status: string }>}
 */
export async function createGeneration({
  originalImageUrl,
  emotion,
  motion,
  inputText,
  storyPrompt,
  finalPrompt,
}) {
  if (!isNonEmptyString(finalPrompt)) {
    throw new Error('finalPrompt는 필수값입니다.');
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
    throw new Error('You must be signed in to create an emoticon.');
  }

  const payload = {
    emotion,
    motion,
    inputText,
    storyPrompt,
    finalPrompt,
  };
  const trimmedOriginalImageUrl = originalImageUrl?.trim();
  if (trimmedOriginalImageUrl) {
    payload.originalImageUrl = trimmedOriginalImageUrl;
  }

  const response = await fetch(`${API_BASE_URL}/api/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error('이모티콘 생성에 실패했습니다. 다시 시도해 주세요.');
  }

  if (!response.ok) {
    const message =
      body?.error?.message ||
      body?.message ||
      '이모티콘 생성에 실패했습니다. 다시 시도해 주세요.';
    throw new Error(message);
  }

  return {
    id: body.id,
    generatedImageUrl: body.generatedImageUrl,
    status: body.status,
  };
}
