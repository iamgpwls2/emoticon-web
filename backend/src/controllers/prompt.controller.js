import { refinePromptWithLLM } from '../services/llm.service.js';
import { chatPromptWithLLM } from '../services/prompt.service.js';
import { rethrowControllerError } from '../utils/controllerError.js';

/**
 * POST /api/prompts/refine
 * req.body는 validatePromptRefine 미들웨어에서 검증된 값을 사용합니다.
 */
export async function refinePrompt(req, res) {
  const { emotion, motion, inputText, originalImageUrl } = req.body;
  const userId = req.user.id;
  const trimmedOriginalImageUrl = originalImageUrl?.trim() || undefined;

  try {
    const { storyPrompt, finalPrompt } = await refinePromptWithLLM({
      emotion,
      motion,
      inputText,
      originalImageUrl: trimmedOriginalImageUrl,
    });

    return res.status(200).json({
      storyPrompt,
      finalPrompt,
    });
  } catch (error) {
    rethrowControllerError(error, {
      logPrefix: `refinePrompt failed (user=${userId}):`,
      fallbackMessage: '프롬프트 구체화에 실패했습니다. 다시 시도해 주세요.',
      externalApiMessage: '프롬프트 구체화에 실패했습니다. 다시 시도해 주세요.',
    });
  }
}

/**
 * POST /api/prompts/chat
 * req.body는 validatePromptChat 미들웨어에서 검증된 값을 사용합니다.
 */
export async function chatPrompt(req, res) {
  const { messages, context, finalTurn } = req.body;
  const userId = req.user.id;

  try {
    const result = await chatPromptWithLLM({ messages, context, finalTurn });

    if (result.type === 'question') {
      return res.status(200).json({
        type: 'question',
        message: result.message,
        choices: result.choices,
      });
    }

    return res.status(200).json({
      type: 'complete',
      message: result.message,
      finalPrompt: result.finalPrompt,
    });
  } catch (error) {
    rethrowControllerError(error, {
      logPrefix: `chatPrompt failed (user=${userId}):`,
      fallbackMessage: '프롬프트 대화에 실패했습니다. 다시 시도해 주세요.',
      externalApiMessage: '프롬프트 대화에 실패했습니다. 다시 시도해 주세요.',
    });
  }
}
