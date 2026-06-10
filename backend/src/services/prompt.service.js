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

function extractJsonContent(raw) {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

const FINAL_TURN_INSTRUCTION =
  '이것이 마지막 턴입니다. 지금까지의 대화와 배경/추가요청 답변을 모두 반영해서 최종 이미지 생성 프롬프트를 완성해줘.';

function buildChatSystemPrompt({ finalTurn = false } = {}) {
  const lines = [
    '당신은 이모티콘 프롬프트 작성 전문가입니다. ' +
      '최종 프롬프트 작성 시 원본 이미지의 스타일 유지를 최우선으로 합니다. ' +
      '사용자 요청(배경, 효과, 동작 등)은 원본 캐릭터 스타일을 ' +
      '해치지 않는 범위에서만 반영합니다. ' +
      '원본의 선화 스타일, 채색 방식, 캐릭터 비율, 얼굴 특징, ' +
      '색상 팔레트는 절대 변경하지 않습니다. ',
    'You are an expert at writing emoticon (sticker) prompts for image generation.',
    'Respond with valid JSON only. Do not include markdown code fences or extra keys.',
    'Language rules:',
    '- message and finalPrompt: natural Korean.',
    '- finalPrompt: describe pose, facial expression, composition, style, and background for an emoticon.',
    '- Include on-image text in finalPrompt only when the user provided text in context or answers.',
    '- Keep prompts safe and family-friendly.',
  ];

  if (finalTurn) {
    lines.push(
      '',
      FINAL_TURN_INSTRUCTION,
      'You MUST respond with type "complete" and a finalPrompt.',
      'Required JSON shape for completion:',
      '{',
      '  "type": "complete",',
      '  "message": "Korean completion message for the user",',
      '  "finalPrompt": "Korean image-generation prompt ready for an image API"',
      '}'
    );
    return lines.join('\n');
  }

  lines.push(
    'Your goal is to ask clarifying questions through short dynamic turns.',
    'Use the initial context (emotion, motion, text) to shape the first question when conversation history is empty.',
    'If motion is "기타" or missing/empty, ask about motion first.',
    'Each question MUST include 3–4 objective choices plus "직접 입력" in the choices array.',
    'You MUST respond with type "question" only. NEVER respond with type "complete".',
    'Required JSON shape for questions:',
    '{',
    '  "type": "question",',
    '  "message": "Korean question for the user",',
    '  "choices": ["choice1", "choice2", "choice3", "직접 입력"]',
    '}'
  );

  return lines.join('\n');
}

function buildInitialContextMessage(context) {
  const emotion = typeof context?.emotion === 'string' ? context.emotion.trim() : '';
  const motion = typeof context?.motion === 'string' ? context.motion.trim() : '';
  const text = typeof context?.text === 'string' ? context.text.trim() : '';

  const lines = [
    'Initial emoticon context from the user form:',
    `Emotion: ${emotion || '(not selected)'}`,
    `Motion: ${motion || '(not selected)'}`,
  ];

  if (text) {
    lines.push(`Text on emoticon: ${text}`);
  } else {
    lines.push('Text on emoticon: (none)');
  }

  lines.push('');
  lines.push(
    'Start the conversation. Ask the first clarifying question as JSON with type "question".'
  );

  return lines.join('\n');
}

function normalizeChatMessages(messages) {
  return messages.map((message) => ({
    role: message.role,
    content: message.content.trim(),
  }));
}

function parseChatLlmResponse(content) {
  let parsed;
  try {
    parsed = JSON.parse(extractJsonContent(content));
  } catch {
    throw createServiceError('Failed to parse LLM response.');
  }

  const { type, message, choices, finalPrompt } = parsed ?? {};

  if (type !== 'question' && type !== 'complete') {
    throw createServiceError('Failed to parse LLM response.');
  }

  if (typeof message !== 'string' || !message.trim()) {
    throw createServiceError('Failed to parse LLM response.');
  }

  if (type === 'question') {
    if (!Array.isArray(choices) || choices.length < 2) {
      throw createServiceError('Failed to parse LLM response.');
    }

    const normalizedChoices = choices
      .filter((choice) => typeof choice === 'string' && choice.trim())
      .map((choice) => choice.trim());

    if (normalizedChoices.length < 2) {
      throw createServiceError('Failed to parse LLM response.');
    }

    if (!normalizedChoices.includes('직접 입력')) {
      normalizedChoices.push('직접 입력');
    }

    return {
      type: 'question',
      message: message.trim(),
      choices: normalizedChoices,
    };
  }

  if (typeof finalPrompt !== 'string' || !finalPrompt.trim()) {
    throw createServiceError('Failed to parse LLM response.');
  }

  return {
    type: 'complete',
    message: message.trim(),
    finalPrompt: finalPrompt.trim(),
  };
}

/**
 * 대화형 프롬프트 구체화 LLM 호출.
 *
 * @param {{
 *   messages: Array<{ role: 'user' | 'assistant', content: string }>,
 *   context: { emotion?: string, motion?: string, text?: string },
 *   finalTurn?: boolean
 * }} params
 * @returns {Promise<
 *   | { type: 'question', message: string, choices: string[] }
 *   | { type: 'complete', message: string, finalPrompt: string }
 * >}
 */
export async function chatPromptWithLLM({ messages, context, finalTurn = false }) {
  const apiKey = getLlmApiKey();
  const model = getLlmModel();
  const normalizedMessages = normalizeChatMessages(messages);

  const llmMessages = [
    { role: 'system', content: buildChatSystemPrompt({ finalTurn }) },
  ];

  if (normalizedMessages.length === 0) {
    llmMessages.push({
      role: 'user',
      content: buildInitialContextMessage(context),
    });
  } else {
    llmMessages.push(...normalizedMessages);
  }

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
        messages: llmMessages,
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

    return parseChatLlmResponse(content);
  } catch (error) {
    if (error.name === 'AbortError') {
      throw createServiceError('LLM request timed out.');
    }
    if (error.isLlmServiceError) {
      throw error;
    }
    console.error('LLM chat service error:', error.message);
    throw createServiceError('LLM request failed.');
  } finally {
    clearTimeout(timeoutId);
  }
}
