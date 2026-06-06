import { supabase } from '../lib/supabase.js';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:3000';

/**
 * 사용자 입력을 backend POST /api/prompts/refine 으로 보내 storyPrompt / finalPrompt를 받습니다.
 * @param {{ emotion: string, motion: string, inputText: string, originalImageUrl?: string }} payload
 * @returns {Promise<{ storyPrompt: string, finalPrompt: string }>}
 */
export async function refinePrompt({ emotion, motion, inputText, originalImageUrl }) {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  const accessToken = session?.access_token;
  if (!accessToken) {
    throw new Error('You must be signed in to refine a prompt.');
  }

  const response = await fetch(`${API_BASE_URL}/api/prompts/refine`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      emotion,
      motion,
      inputText,
      originalImageUrl,
    }),
  });

  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error('프롬프트 구체화에 실패했습니다. 다시 시도해 주세요.');
  }

  if (!response.ok) {
    const message =
      body?.error?.message ||
      body?.message ||
      '프롬프트 구체화에 실패했습니다. 다시 시도해 주세요.';
    throw new Error(message);
  }

  return {
    storyPrompt: body.storyPrompt,
    finalPrompt: body.finalPrompt,
  };
}
