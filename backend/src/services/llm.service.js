const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_LLM_MODEL = 'gpt-4o-mini';
const LLM_TIMEOUT_MS = 30_000;

function createServiceError(message) {
  const error = new Error(message);
  error.isLlmServiceError = true;
  return error;
}

function getLlmApiKey() {
  const apiKey = process.env.LLM_API_KEY?.trim();
  if (!apiKey) {
    throw createServiceError('LLM_API_KEY is not configured.');
  }
  return apiKey;
}

function getLlmModel() {
  return process.env.LLM_MODEL?.trim() || DEFAULT_LLM_MODEL;
}

function buildSystemPrompt() {
  return [
    'You refine user input into emoticon (sticker) prompts for image generation.',
    'Respond with valid JSON only. Do not include markdown or extra keys.',
    'Required JSON shape:',
    '{',
    '  "storyPrompt": "string — situational context describing the emoticon scene based on emotion, motion, and text",',
    '  "finalPrompt": "string — a detailed, concrete image-generation prompt suitable for an image API"',
    '}',
    '',
    'Guidelines:',
    '- storyPrompt: Explain the situation and mood in natural language (who/what, emotion, action, optional on-image text).',
    '- finalPrompt: Describe visual style, character pose, expression, composition, and any text overlay for image generation.',
    '- Preserve the user intent. Keep prompts safe and family-friendly.',
    '- Write storyPrompt and finalPrompt in the same language as the user input when possible.',
  ].join('\n');
}

function buildUserPrompt({ emotion, motion, inputText, originalImageUrl }) {
  const lines = [
    'Refine the following emoticon input into storyPrompt and finalPrompt.',
    '',
    `Emotion: ${emotion}`,
    `Motion: ${motion}`,
    `Text on emoticon: ${inputText}`,
  ];

  if (originalImageUrl?.trim()) {
    lines.push(`Reference image URL: ${originalImageUrl.trim()}`);
    lines.push(
      'The reference image defines the character appearance; keep it consistent in finalPrompt.'
    );
  }

  return lines.join('\n');
}

function extractJsonContent(raw) {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

function parseLlmResponse(content) {
  let parsed;
  try {
    parsed = JSON.parse(extractJsonContent(content));
  } catch {
    throw createServiceError('Failed to parse LLM response.');
  }

  const { storyPrompt, finalPrompt } = parsed ?? {};

  if (
    typeof storyPrompt !== 'string' ||
    !storyPrompt.trim() ||
    typeof finalPrompt !== 'string' ||
    !finalPrompt.trim()
  ) {
    throw createServiceError('Failed to parse LLM response.');
  }

  return {
    storyPrompt: storyPrompt.trim(),
    finalPrompt: finalPrompt.trim(),
  };
}

/**
 * 사용자 입력을 LLM으로 정제해 storyPrompt / finalPrompt를 반환합니다.
 * OpenAI 호출은 backend에서만 수행합니다.
 *
 * @param {{ emotion: string, motion: string, inputText: string, originalImageUrl?: string }} params
 * @returns {Promise<{ storyPrompt: string, finalPrompt: string }>}
 */
export async function refinePromptWithLLM({
  emotion,
  motion,
  inputText,
  originalImageUrl,
}) {
  const apiKey = getLlmApiKey();
  const model = getLlmModel();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  try {
    const response = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          {
            role: 'user',
            content: buildUserPrompt({
              emotion,
              motion,
              inputText,
              originalImageUrl,
            }),
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      console.error(
        'OpenAI API request failed:',
        response.status,
        errorBody?.error?.type ?? 'unknown'
      );
      throw createServiceError('LLM request failed.');
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content?.trim()) {
      throw createServiceError('LLM returned an empty response.');
    }

    return parseLlmResponse(content);
  } catch (error) {
    if (error.name === 'AbortError') {
      throw createServiceError('LLM request timed out.');
    }
    if (error.isLlmServiceError) {
      throw error;
    }
    console.error('LLM service error:', error.message);
    throw createServiceError('LLM request failed.');
  } finally {
    clearTimeout(timeoutId);
  }
}
