import { HttpError } from '../utils/httpError.js';
import {
  INPUT_TEXT_MAX_LENGTH,
  getUserOwnedUploadUrlValidationError,
  isNonEmptyString,
  pushOptionalStringField,
  trimOptionalOriginalImageUrl,
} from './shared.validation.js';

/**
 * POST /api/prompts/refine 요청 body 검증.
 * emotion, motion 필수 · inputText, originalImageUrl 선택.
 */
export function validatePromptRefine(req, res, next) {
  const { emotion, motion, inputText, originalImageUrl } = req.body ?? {};
  const errors = [];

  if (!isNonEmptyString(emotion)) {
    errors.push({
      field: 'emotion',
      message: 'emotion은 필수값입니다.',
    });
  }

  if (!isNonEmptyString(motion)) {
    errors.push({
      field: 'motion',
      message: 'motion은 필수값입니다.',
    });
  }

  if (
    typeof inputText === 'string' &&
    inputText.trim().length > INPUT_TEXT_MAX_LENGTH
  ) {
    errors.push({
      field: 'inputText',
      message: `inputText는 최대 ${INPUT_TEXT_MAX_LENGTH}자까지 입력할 수 있습니다.`,
    });
  }

  pushOptionalStringField(errors, 'inputText', inputText);
  pushOptionalStringField(errors, 'originalImageUrl', originalImageUrl);

  if (errors.length > 0) {
    return next(
      HttpError.validation('입력값을 확인해 주세요.', { errors })
    );
  }

  const originalImageUrlError = getUserOwnedUploadUrlValidationError(
    req.user?.id,
    originalImageUrl
  );
  if (originalImageUrlError) {
    return next(
      HttpError.validation('본인이 업로드한 이미지 URL만 사용할 수 있습니다.', {
        errors: [
          {
            field: 'originalImageUrl',
            message: originalImageUrlError,
          },
        ],
      })
    );
  }

  trimOptionalOriginalImageUrl(req);
  next();
}

const CHAT_MESSAGE_ROLES = new Set(['user', 'assistant']);

function isValidChatMessage(message) {
  if (!message || typeof message !== 'object') {
    return false;
  }

  return (
    CHAT_MESSAGE_ROLES.has(message.role) &&
    isNonEmptyString(message.content)
  );
}

/**
 * POST /api/prompts/chat 요청 body 검증.
 * messages 배열 · context 객체(emotion, motion, text 선택).
 */
export function validatePromptChat(req, res, next) {
  const { messages, context, finalTurn } = req.body ?? {};
  const errors = [];

  if (!Array.isArray(messages)) {
    errors.push({
      field: 'messages',
      message: 'messages는 배열이어야 합니다.',
    });
  } else {
    messages.forEach((message, index) => {
      if (!isValidChatMessage(message)) {
        errors.push({
          field: `messages[${index}]`,
          message: '각 message는 role(user|assistant)과 content가 필요합니다.',
        });
      }
    });
  }

  if (!context || typeof context !== 'object' || Array.isArray(context)) {
    errors.push({
      field: 'context',
      message: 'context 객체가 필요합니다.',
    });
  } else {
    pushOptionalStringField(errors, 'context.emotion', context.emotion);
    pushOptionalStringField(errors, 'context.motion', context.motion);
    pushOptionalStringField(errors, 'context.text', context.text);

    if (
      typeof context.text === 'string' &&
      context.text.trim().length > INPUT_TEXT_MAX_LENGTH
    ) {
      errors.push({
        field: 'context.text',
        message: `text는 최대 ${INPUT_TEXT_MAX_LENGTH}자까지 입력할 수 있습니다.`,
      });
    }
  }

  if (
    finalTurn !== undefined &&
    finalTurn !== null &&
    typeof finalTurn !== 'boolean'
  ) {
    errors.push({
      field: 'finalTurn',
      message: 'finalTurn은 boolean이어야 합니다.',
    });
  }

  if (errors.length > 0) {
    return next(
      HttpError.validation('입력값을 확인해 주세요.', { errors })
    );
  }

  req.body = {
    messages: messages.map((message) => ({
      role: message.role,
      content: message.content.trim(),
    })),
    context: {
      emotion:
        typeof context.emotion === 'string' ? context.emotion.trim() : '',
      motion: typeof context.motion === 'string' ? context.motion.trim() : '',
      text: typeof context.text === 'string' ? context.text.trim() : '',
    },
    finalTurn: finalTurn === true,
  };

  next();
}
