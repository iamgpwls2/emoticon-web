import { supabaseAdmin } from '../config/supabase.js';

const EMOTICON_GENERATIONS_TABLE = 'emoticon_generations';
const STATUS_GENERATING =
  process.env.GENERATION_INSERT_STATUS?.trim() || 'generating';
const STATUS_COMPLETED = 'completed';
const STATUS_FAILED = 'failed';

function createServiceError(message) {
  const error = new Error(message);
  error.isGenerationServiceError = true;
  return error;
}

function assertNonEmptyString(value, fieldName) {
  if (typeof value !== 'string' || !value.trim()) {
    throw createServiceError(`${fieldName} is required.`);
  }
  return value.trim();
}

function optionalText(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed || null;
}

function handleSupabaseError(action, error) {
  console.error(`emoticon_generations ${action} failed:`, error.message);
  throw createServiceError(`Failed to ${action} generation record.`);
}

/**
 * emoticon_generations 테이블에 생성 중 상태의 기록을 insert합니다.
 * backend controller에서만 호출하세요.
 *
 * @param {{
 *   userId: string,
 *   originalImageUrl?: string | null,
 *   emotion?: string | null,
 *   motion?: string | null,
 *   inputText?: string | null,
 *   storyPrompt?: string | null,
 *   finalPrompt: string,
 * }} params
 * @returns {Promise<object>}
 */
export async function createGeneratingRecord({
  userId,
  originalImageUrl,
  emotion,
  motion,
  inputText,
  storyPrompt,
  finalPrompt,
}) {
  const resolvedUserId = assertNonEmptyString(userId, 'userId');

  const { data, error } = await supabaseAdmin
    .from(EMOTICON_GENERATIONS_TABLE)
    .insert({
      user_id: resolvedUserId,
      original_image_url: optionalText(originalImageUrl),
      emotion: optionalText(emotion),
      motion: optionalText(motion),
      input_text: optionalText(inputText),
      story_prompt: optionalText(storyPrompt),
      final_prompt: assertNonEmptyString(finalPrompt, 'finalPrompt'),
      status: STATUS_GENERATING,
    })
    .select()
    .single();

  if (error) {
    handleSupabaseError('create', error);
  }

  if (!data) {
    throw createServiceError('Failed to create generation record.');
  }

  return data;
}

/**
 * 생성 완료 상태로 emoticon_generations 기록을 갱신합니다.
 *
 * @param {{ generationId: string, userId: string, generatedImageUrl: string }} params
 * @returns {Promise<object>}
 */
export async function markGenerationCompleted({
  generationId,
  userId,
  generatedImageUrl,
}) {
  const resolvedGenerationId = assertNonEmptyString(generationId, 'generationId');
  const resolvedUserId = assertNonEmptyString(userId, 'userId');
  const resolvedGeneratedImageUrl = assertNonEmptyString(
    generatedImageUrl,
    'generatedImageUrl'
  );

  const { data, error } = await supabaseAdmin
    .from(EMOTICON_GENERATIONS_TABLE)
    .update({
      status: STATUS_COMPLETED,
      generated_image_url: resolvedGeneratedImageUrl,
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', resolvedGenerationId)
    .eq('user_id', resolvedUserId)
    .select()
    .single();

  if (error) {
    handleSupabaseError('complete', error);
  }

  if (!data) {
    throw createServiceError('Generation record not found.');
  }

  return data;
}

/**
 * 생성 실패 상태로 emoticon_generations 기록을 갱신합니다.
 *
 * @param {{ generationId: string, userId: string, errorMessage: string }} params
 * @returns {Promise<object>}
 */
export async function markGenerationFailed({
  generationId,
  userId,
  errorMessage,
}) {
  const resolvedGenerationId = assertNonEmptyString(generationId, 'generationId');
  const resolvedUserId = assertNonEmptyString(userId, 'userId');
  const resolvedErrorMessage = assertNonEmptyString(errorMessage, 'errorMessage');

  const { data, error } = await supabaseAdmin
    .from(EMOTICON_GENERATIONS_TABLE)
    .update({
      status: STATUS_FAILED,
      error_message: resolvedErrorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq('id', resolvedGenerationId)
    .eq('user_id', resolvedUserId)
    .select()
    .single();

  if (error) {
    handleSupabaseError('fail', error);
  }

  if (!data) {
    throw createServiceError('Generation record not found.');
  }

  return data;
}
