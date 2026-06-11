import {
  createGeneratingRecord,
  markGenerationCompleted,
  markGenerationFailed,
} from './generation.service.js';
import { generateImageFromPrompt } from './imageGeneration.service.js';
import { applyCharacterPreservationGuards } from './llm.service.js';
import {
  uploadGeneratedEmoticon,
  validateUserUploadOwnership,
} from './storage.service.js';

function toSafeErrorMessage(error) {
  if (error.isImageGenerationServiceError) {
    return 'Image generation request failed.';
  }
  if (error.isStorageServiceError) {
    return 'Storage operation failed.';
  }
  return 'Generation pipeline failed.';
}

/**
 * 이모티콘 생성 파이프라인: 레코드 생성 → 이미지 생성 → Storage 업로드 → 완료 처리.
 * 실패 시 generation 상태를 failed로 기록한 뒤 원본 에러를 다시 throw합니다.
 *
 * @param {{
 *   userId: string,
 *   originalImageUrl?: string,
 *   emotion: string,
 *   motion: string,
 *   inputText?: string,
 *   storyPrompt?: string,
 *   finalPrompt: string,
 *   collectionId?: string | null,
 *   maskImageBuffer?: Buffer,
 *   maskMimeType?: string,
 * }} params
 * @returns {Promise<{ id: string, generatedImageUrl: string, status: string }>}
 */
export async function runGenerationPipeline({
  userId,
  originalImageUrl,
  emotion,
  motion,
  inputText,
  storyPrompt,
  finalPrompt,
  collectionId,
  maskImageBuffer,
  maskMimeType,
}) {
  const trimmedOriginalImageUrl = originalImageUrl?.trim() || undefined;

  validateUserUploadOwnership({
    originalImageUrl: trimmedOriginalImageUrl,
    userId,
  });

  const hasReferenceImage = Boolean(trimmedOriginalImageUrl);
  const trimmedInputText =
    typeof inputText === 'string' ? inputText.trim() : '';
  const trimmedFinalPrompt = finalPrompt?.trim();
  const { finalPrompt: imageGenerationPrompt } = applyCharacterPreservationGuards(
    {
      storyPrompt: typeof storyPrompt === 'string' ? storyPrompt.trim() : '',
      finalPrompt: trimmedFinalPrompt,
    },
    {
      hasReferenceImage,
      inputText: trimmedInputText,
    }
  );

  const hasMaskImage =
    Buffer.isBuffer(maskImageBuffer) && maskImageBuffer.length > 0;

  console.info('runGenerationPipeline', {
    userId,
    hasReferenceImage,
    hasInputText: Boolean(trimmedInputText),
    hasMaskImage,
  });

  const record = await createGeneratingRecord({
    userId,
    originalImageUrl: trimmedOriginalImageUrl,
    emotion,
    motion,
    inputText,
    storyPrompt,
    finalPrompt: imageGenerationPrompt,
    collectionId,
  });

  try {
    const { imageBuffer, mimeType } = await generateImageFromPrompt({
      finalPrompt: imageGenerationPrompt,
      originalImageUrl: trimmedOriginalImageUrl,
      userId,
      maskImageBuffer: hasMaskImage ? maskImageBuffer : undefined,
      maskMimeType: hasMaskImage ? maskMimeType : undefined,
    });
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

    return {
      id: updated.id,
      generatedImageUrl: updated.generated_image_url,
      status: updated.status,
    };
  } catch (error) {
    console.error(
      `runGenerationPipeline failed (user=${userId}, generation=${record.id}):`,
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

    throw error;
  }
}
