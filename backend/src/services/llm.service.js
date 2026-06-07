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
    '  "storyPrompt": "string — Korean situational description for the user",',
    '  "finalPrompt": "string — English image-generation prompt for an image API"',
    '}',
    '',
    'Language rules:',
    '- storyPrompt: Write in natural Korean.',
    '- finalPrompt: Write in English only. Ready to send directly to an image generation API.',
    '',
    'Character preservation (critical when a reference image URL is provided):',
    '- The uploaded reference image defines the ONLY allowed character design.',
    '- storyPrompt must state that the same original character from the uploaded image is kept.',
    '- finalPrompt MUST explicitly say the image is based on the provided reference image.',
    '- finalPrompt MUST preserve the original character design, colors, silhouette, shape, and facial features.',
    '- finalPrompt MUST say to only change emotion, pose/action, and on-image text.',
    '- finalPrompt MUST forbid redesigning the character as a human, boy, girl, child, or a different animal/creature.',
    '- Do NOT invent a new mascot. Do NOT replace the character with a person or generic cartoon human.',
    '',
    'When NO reference image URL is provided:',
    '- Do not claim a reference image exists.',
    '- Still keep prompts safe, family-friendly, and suitable for emoticon/sticker use.',
    '',
    'General guidelines:',
    '- Preserve user intent for emotion, motion, and on-image text.',
    '- Describe pose, expression, composition, and text overlay clearly in finalPrompt.',
    '- Keep prompts safe and family-friendly.',
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
    lines.push('');
    lines.push('An uploaded reference image is provided.');
    lines.push(`Reference image URL: ${originalImageUrl.trim()}`);
    lines.push(
      'The user already uploaded the original character. Keep that exact character identity.'
    );
    lines.push(
      'In finalPrompt, you MUST mention the provided reference image and instruct the image generator to preserve the same original character design.'
    );
    lines.push(
      'In finalPrompt, you MUST forbid changing the character into a human, boy, girl, or different animal.'
    );
    lines.push(
      'Only modify emotion, pose/action, and the on-image text while preserving colors, silhouette, shape, and facial features.'
    );
  } else {
    lines.push('');
    lines.push('No reference image URL was provided.');
  }

  return lines.join('\n');
}

function extractJsonContent(raw) {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

function includesAny(text, phrases) {
  const lower = text.toLowerCase();
  return phrases.some((phrase) => lower.includes(phrase.toLowerCase()));
}

export function applyCharacterPreservationGuards(
  { storyPrompt, finalPrompt },
  { hasReferenceImage, inputText }
) {
  if (!hasReferenceImage) {
    return { storyPrompt, finalPrompt };
  }

  let nextStoryPrompt = storyPrompt;
  let nextFinalPrompt = finalPrompt;

  if (
    !includesAny(nextStoryPrompt, [
      '원본',
      '업로드',
      '참조',
      '같은 캐릭터',
      '동일한 캐릭터',
    ])
  ) {
    nextStoryPrompt = `${nextStoryPrompt} 업로드한 원본 캐릭터의 외형과 정체성을 그대로 유지합니다.`.trim();
  }

  const finalAdditions = [];

  if (
    !includesAny(nextFinalPrompt, [
      'provided reference image',
      'reference image',
    ])
  ) {
    finalAdditions.push(
      'Create an emoticon based on the provided reference image.'
    );
  }

  if (
    !includesAny(nextFinalPrompt, [
      'preserve the same',
      'preserve the original',
      'same character',
      'original character',
    ])
  ) {
    finalAdditions.push(
      'Preserve the same original character design, colors, silhouette, shape, and facial features.'
    );
  }

  if (
    !includesAny(nextFinalPrompt, [
      'do not change',
      "don't change",
      'must not change',
      'do not turn',
    ])
  ) {
    finalAdditions.push(
      'Do not change the character into a human, boy, girl, child, or different animal.'
    );
  }

  if (
    !includesAny(nextFinalPrompt, [
      'only modify',
      'only change',
      'only adjust',
    ])
  ) {
    finalAdditions.push(
      'Only modify the pose, emotion, expression, and on-image text.'
    );
  }

  if (inputText?.trim() && !nextFinalPrompt.includes(inputText.trim())) {
    finalAdditions.push(
      `Add the Korean text "${inputText.trim()}" in a cute playful emoticon style.`
    );
  }

  if (finalAdditions.length > 0) {
    nextFinalPrompt = `${finalAdditions.join(' ')} ${nextFinalPrompt}`.trim();
  }

  return {
    storyPrompt: nextStoryPrompt,
    finalPrompt: nextFinalPrompt,
  };
}

function parseLlmResponse(content, options = {}) {
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

  return applyCharacterPreservationGuards(
    {
      storyPrompt: storyPrompt.trim(),
      finalPrompt: finalPrompt.trim(),
    },
    options
  );
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
  const trimmedOriginalImageUrl = originalImageUrl?.trim() || undefined;

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
              originalImageUrl: trimmedOriginalImageUrl,
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

    return parseLlmResponse(content, {
      hasReferenceImage: Boolean(trimmedOriginalImageUrl),
      inputText,
    });
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
