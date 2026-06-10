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
    '  "finalPrompt": "string — Korean image-generation prompt for an image API"',
    '}',
    '',
    'Language rules:',
    '- storyPrompt: Write in natural Korean. Focus on the situation, mood, and user-facing context.',
    '- finalPrompt: Write in natural Korean only. Ready to send directly to an image generation API.',
    '- finalPrompt should describe visual details: pose, facial expression, composition, style, and background.',
    '',
    'Character preservation (critical when a reference image URL is provided):',
    '- The uploaded reference image defines the ONLY allowed character design.',
    '- storyPrompt must state that the same original character from the uploaded image is kept.',
    '- finalPrompt MUST explicitly say the image is based on the provided reference image.',
    '- finalPrompt MUST preserve the original character design, colors, silhouette, shape, and facial features.',
    '- finalPrompt MUST say to only change emotion and pose/action. Add on-image text only when the user provided text.',
    '- finalPrompt MUST forbid redesigning the character as a human, boy, girl, child, or a different animal/creature.',
    '- Do NOT invent a new mascot. Do NOT replace the character with a person or generic cartoon human.',
    '',
    'When NO reference image URL is provided:',
    '- Do not claim a reference image exists.',
    '- Still keep prompts safe, family-friendly, and suitable for emoticon/sticker use.',
    '',
    'General guidelines:',
    '- Preserve user intent for emotion and motion. Include on-image text only when the user provided it.',
    '- Describe pose, expression, and composition clearly in finalPrompt. Describe text overlay only when text was provided.',
    '- Keep prompts safe and family-friendly.',
  ].join('\n');
}

function buildUserPrompt({ emotion, motion, inputText, originalImageUrl }) {
  const trimmedInputText =
    typeof inputText === 'string' ? inputText.trim() : '';
  const lines = [
    'Refine the following emoticon input into storyPrompt and finalPrompt.',
    '',
    `Emotion: ${emotion}`,
    `Motion: ${motion}`,
  ];

  if (trimmedInputText) {
    lines.push(`Text on emoticon: ${trimmedInputText}`);
  } else {
    lines.push(
      'Text on emoticon: (none — create an emoticon without on-image text overlays)'
    );
  }

  if (originalImageUrl?.trim()) {
    lines.push('');
    lines.push('An uploaded reference image is provided.');
    lines.push(`Reference image URL: ${originalImageUrl.trim()}`);
    lines.push(
      'The user already uploaded the original character. Keep that exact character identity.'
    );
    lines.push(
      'In finalPrompt (written in Korean), you MUST mention the provided reference image and instruct the image generator to preserve the same original character design.'
    );
    lines.push(
      'In finalPrompt (written in Korean), you MUST forbid changing the character into a human, boy, girl, or different animal.'
    );
    if (trimmedInputText) {
      lines.push(
        'Only modify emotion, pose/action, and the on-image text while preserving colors, silhouette, shape, and facial features.'
      );
    } else {
      lines.push(
        'Only modify emotion and pose/action while preserving colors, silhouette, shape, and facial features. Do not add on-image text overlays.'
      );
    }
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
      '제공된 참조',
      '참조 이미지',
      '업로드한',
      '원본 이미지',
    ])
  ) {
    finalAdditions.push(
      '제공된 참조 이미지를 기반으로 이모티콘을 생성합니다.'
    );
  }

  if (
    !includesAny(nextFinalPrompt, [
      '동일한 캐릭터',
      '원본 캐릭터',
      '같은 캐릭터',
      '캐릭터 디자인',
      '외형을 유지',
    ])
  ) {
    finalAdditions.push(
      '원본 캐릭터의 디자인, 색상, 실루엣, 형태, 얼굴 특징을 그대로 유지합니다.'
    );
  }

  if (
    !includesAny(nextFinalPrompt, [
      '바꾸지',
      '변경하지',
      '바꾸면 안',
      '금지',
    ])
  ) {
    finalAdditions.push(
      '캐릭터를 사람, 소년, 소녀, 아이, 다른 동물로 바꾸지 마세요.'
    );
  }

  if (
    !includesAny(nextFinalPrompt, [
      '만 수정',
      '만 변경',
      '만 조정',
    ])
  ) {
    finalAdditions.push(
      inputText?.trim()
        ? '포즈, 감정, 표정, 이미지 위 텍스트만 수정하세요.'
        : '포즈, 감정, 표정만 수정하세요. 이미지 위 텍스트 오버레이는 추가하지 마세요.'
    );
  }

  if (inputText?.trim() && !nextFinalPrompt.includes(inputText.trim())) {
    finalAdditions.push(
      `귀엽고 발랄한 이모티콘 스타일로 한국어 텍스트 "${inputText.trim()}"를 추가하세요.`
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
 * @param {{ emotion: string, motion: string, inputText?: string, originalImageUrl?: string }} params
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
