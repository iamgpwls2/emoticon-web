import { supabase } from '../lib/supabase.js';
import { readApiResponse } from '../utils/apiError.js';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:4000';

const REFINE_FAILED_MESSAGE =
  '프롬프트 구체화에 실패했습니다. 다시 시도해 주세요.';

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
    throw new Error('프롬프트를 구체화하려면 로그인이 필요합니다.');
  }

  return accessToken;
}

/**
 * 사용자 입력을 backend POST /api/prompts/refine 으로 보내 storyPrompt / finalPrompt를 받습니다.
 * @param {{ emotion: string, motion: string, inputText?: string, originalImageUrl?: string }} payload
 * @returns {Promise<{ storyPrompt: string, finalPrompt: string }>}
 */
export async function refinePrompt({
  emotion,
  motion,
  inputText,
  originalImageUrl,
}) {
  const accessToken = await getAccessToken();

  const payload = {
    emotion,
    motion,
  };
  const trimmedInputText =
    typeof inputText === 'string' ? inputText.trim() : '';
  if (trimmedInputText) {
    payload.inputText = trimmedInputText;
  }
  const trimmedOriginalImageUrl = originalImageUrl?.trim();
  if (trimmedOriginalImageUrl) {
    payload.originalImageUrl = trimmedOriginalImageUrl;
  }

  const response = await fetch(`${API_BASE_URL}/api/prompts/refine`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const body = await readApiResponse(response, REFINE_FAILED_MESSAGE);

  return {
    storyPrompt: body.storyPrompt,
    finalPrompt: body.finalPrompt,
  };
}
