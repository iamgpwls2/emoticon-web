import {
  createGeneratingRecord,
  markGenerationCompleted,
  markGenerationFailed,
} from '../services/generation.service.js';
import { generateImageFromPrompt } from '../services/imageGeneration.service.js';
import { uploadGeneratedEmoticon } from '../services/storage.service.js';

function toSafeErrorMessage(error) {
  if (error.isImageGenerationServiceError) {
    return 'Image generation request failed.';
  }
  if (error.isStorageServiceError) {
    return 'Failed to upload generated emoticon.';
  }
  return 'Generation pipeline failed.';
}

/**
 * POST /api/generations
 * req.body는 validateCreateGeneration 미들웨어에서 검증된 값을 사용합니다.
 */
export async function createGeneration(req, res) {
  const userId = req.user.id;
  const {
    originalImageUrl,
    emotion,
    motion,
    inputText,
    storyPrompt,
    finalPrompt,
  } = req.body;

  let record;

  try {
    record = await createGeneratingRecord({
      userId,
      originalImageUrl,
      emotion,
      motion,
      inputText,
      storyPrompt,
      finalPrompt,
    });
  } catch (error) {
    console.error(`createGeneration failed (user=${userId}):`, error.message);
    return res.status(500).json({
      message: '이모티콘 생성에 실패했습니다. 다시 시도해 주세요.',
    });
  }

  try {
    const { imageBuffer, mimeType } = await generateImageFromPrompt(finalPrompt);
    const { generatedImageUrl } = await uploadGeneratedEmoticon(
      userId,
      record.id,
      imageBuffer,
      mimeType
    );
    const updated = await markGenerationCompleted({
      generationId: record.id,
      userId,
      generatedImageUrl,
    });

    return res.status(201).json({
      id: updated.id,
      generatedImageUrl: updated.generated_image_url,
      status: updated.status,
    });
  } catch (error) {
    console.error(
      `createGeneration failed (user=${userId}, generation=${record.id}):`,
      error.message
    );

    try {
      await markGenerationFailed({
        generationId: record.id,
        userId,
        errorMessage: toSafeErrorMessage(error),
      });
    } catch (markError) {
      console.error(
        `markGenerationFailed failed (user=${userId}, generation=${record.id}):`,
        markError.message
      );
    }

    return res.status(500).json({
      message: '이모티콘 생성에 실패했습니다. 다시 시도해 주세요.',
    });
  }
}
