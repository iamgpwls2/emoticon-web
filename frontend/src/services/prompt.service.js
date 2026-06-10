import API_BASE_URL from '@/lib/apiClient.js';
import { resolveAccessToken } from '../lib/authSession.js';
import { readApiResponse } from '../utils/apiError.js';

const REFINE_FAILED_MESSAGE =
  '프롬프트 구체화에 실패했습니다. 다시 시도해 주세요.';
const CHAT_FAILED_MESSAGE =
  '프롬프트 대화에 실패했습니다. 다시 시도해 주세요.';
const AUTH_REQUIRED_MESSAGE = '프롬프트를 구체화하려면 로그인이 필요합니다.';

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
  const accessToken = await resolveAccessToken(AUTH_REQUIRED_MESSAGE);

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

/**
 * 대화형 프롬프트 구체화 — backend POST /api/prompts/chat
 * @param {{
 *   messages: Array<{ role: 'user' | 'assistant', content: string }>,
 *   context: { emotion?: string, motion?: string, text?: string },
 *   finalTurn?: boolean
 * }} payload
 * @returns {Promise<
 *   | { type: 'question', message: string, choices: string[] }
 *   | { type: 'complete', message: string, finalPrompt: string }
 * >}
 */
export async function chatPrompt({ messages, context, finalTurn = false }) {
  const accessToken = await resolveAccessToken(AUTH_REQUIRED_MESSAGE);

  const response = await fetch(`${API_BASE_URL}/api/prompts/chat`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: Array.isArray(messages) ? messages : [],
      context: {
        emotion: context?.emotion?.trim() || '',
        motion: context?.motion?.trim() || '',
        text: context?.text?.trim() || '',
      },
      finalTurn: finalTurn === true,
    }),
  });

  const body = await readApiResponse(response, CHAT_FAILED_MESSAGE);

  if (body.type === 'complete') {
    return {
      type: 'complete',
      message: body.message,
      finalPrompt: body.finalPrompt,
    };
  }

  return {
    type: 'question',
    message: body.message,
    choices: body.choices,
  };
}
