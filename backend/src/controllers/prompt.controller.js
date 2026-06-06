import { refinePromptWithLLM } from '../services/llm.service.js';

/**
 * POST /api/prompts/refine
 * req.body는 validatePromptRefine 미들웨어에서 검증된 값을 사용합니다.
 */
export async function refinePrompt(req, res) {
  const { emotion, motion, inputText, originalImageUrl } = req.body;
  const userId = req.user?.id;
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
    const logPrefix = userId
      ? `refinePrompt failed (user=${userId})`
      : 'refinePrompt failed';
    console.error(`${logPrefix}:`, error.message);

    return res.status(500).json({
      message: '프롬프트 구체화에 실패했습니다. 다시 시도해 주세요.',
    });
  }
}
