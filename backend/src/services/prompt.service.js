const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_LLM_MODEL = 'gpt-4o-mini';
const LLM_TIMEOUT_MS = 30_000;
const MAX_DYNAMIC_TURNS = 4;

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
    '[동적 질문 4턴 규칙] ' +
      '총 4번의 질문을 순서대로 진행할 것. ' +
      '반드시 4번의 질문 중 정확히 1번은 ' +
      '배경에 관한 질문을 포함할 것. ' +
      '(배경색, 배경 스타일, 배경 분위기 등) ' +
      '배경 질문의 위치는 2번째 또는 3번째 턴에 할 것. ' +
      '나머지 3번의 질문은 캐릭터 표정, 동작, ' +
      '감정 표현, 특수 효과 등 다양한 주제로 질문할 것. ' +
      '[중복 질문 금지] ' +
      '각 질문은 반드시 이전 질문들과 완전히 다른 주제여야 함. ' +
      '이전 답변에서 다룬 주제의 세부 항목도 중복으로 간주. ' +
      '질문 전 체크: 이 주제를 이미 다뤘는가? Yes면 다른 주제로.',
    '배경 질문 시 선택지는 3~4개로 제시할 것. ' +
      '선택지는 감정과 모션에 어울리는 배경으로 구성. ' +
      '예시 (기쁨/활동적): 화사한 파스텔, 반짝이는 별, 흰 배경 ' +
      '예시 (슬픔/화남): 어두운 톤, 비/번개, 흰 배경 ' +
      '마지막 선택지는 항상 직접 입력 포함.',
    '[질문 주제 다양성 규칙] ' +
      '4번의 동적 질문은 반드시 서로 다른 대분류 주제여야 함. ' +
      '대분류 주제 예시: ' +
      '동작/모션, 표정/감정표현, 배경, 효과/장식, 텍스트/말풍선. ' +
      '동작과 표정은 같은 대분류(신체 표현)이므로 ' +
      '둘 중 하나만 질문할 것. ' +
      '4번 질문의 주제가 겹치지 않도록 ' +
      '사전에 계획하고 질문할 것.',
    '[응답 형식 엄수] ' +
      '선택지는 반드시 JSON의 choices 배열에만 넣을 것. ' +
      'message 텍스트 안에 선택지 번호나 목록을 ' +
      '절대 포함하지 말 것. ' +
      '올바른 예시: ' +
      '{ "type": "question", ' +
      '"message": "어떤 배경을 원하시나요?", ' +
      '"choices": ["어두운 톤", "흰 배경", "직접 입력"] } ' +
      '잘못된 예시: ' +
      '{ "type": "question", ' +
      '"message": "배경을 선택해주세요. 1.어두운 톤 2.흰 배경", ' +
      '"choices": [] } ' +
      'message는 질문 문장만 포함하고 ' +
      '선택지 내용은 절대 넣지 말 것.',
    '[질문 형태 규칙] ' +
      '질문은 반드시 아래 구조를 따를 것: ' +
      '1) 질문 문장 (무엇을 선택해야 하는지 명확하게) ' +
      '2) "예를 들어," 로 시작하는 2~3개의 구체적 예시 문장 ' +
      '3) "선택해 주세요." 로 마무리 ' +
      '예시: ' +
      '"캐릭터가 어떤 동작을 하고 있으면 좋을까요? ' +
      '예를 들어, 눈을 감고 턱을 괴고 있는 모습, ' +
      '팔짱을 끼고 서 있는 모습 등. 선택해 주세요." ' +
      '' +
      '[선택지 규칙] ' +
      'choices 배열의 선택지는 반드시 ' +
      'message의 예시에서 언급한 내용과 ' +
      '완전히 다른 새로운 옵션으로 구성할 것. ' +
      'message 예시: "눈을 감고 턱을 괴고 있는 모습, 팔짱을 끼고 서 있는 모습" ' +
      'choices 예시: ["두 손을 번쩍 들고 있는 모습", ' +
      '"바닥에 앉아 무릎을 감싸고 있는 모습", ' +
      '"뒤돌아서 있는 모습", "직접 입력"] ' +
      '즉, message에 나온 예시는 choices에 절대 포함하지 말 것. ' +
      'choices는 항상 3개 + "직접 입력" 으로 구성. ' +
      '선택지는 구체적이고 시각적으로 상상 가능한 표현으로 작성.',
    `You may ask up to ${MAX_DYNAMIC_TURNS} dynamic clarifying questions only.`,
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
