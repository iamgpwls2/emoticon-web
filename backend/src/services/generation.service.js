import { supabaseAdmin } from '../config/supabase.js';
import { deleteGeneratedEmoticonByUrl } from './storage.service.js';

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

function createNotFoundError(message) {
  const error = new Error(message);
  error.isGenerationNotFoundError = true;
  return error;
}

function createNotSavableError(message) {
  const error = new Error(message);
  error.isGenerationNotSavableError = true;
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

const MY_GENERATIONS_LIST_COLUMNS =
  'id, status, saved_to_gallery, original_image_url, generated_image_url, emotion, motion, input_text, story_prompt, final_prompt, created_at, updated_at';

function mapGenerationListItem(row) {
  return {
    id: row.id,
    status: row.status,
    savedToGallery: row.saved_to_gallery === true,
    originalImageUrl: row.original_image_url,
    generatedImageUrl: row.generated_image_url,
    emotion: row.emotion,
    motion: row.motion,
    inputText: row.input_text,
    storyPrompt: row.story_prompt,
    finalPrompt: row.final_prompt,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 로그인 사용자의 emoticon_generations 목록을 created_at 최신순으로 조회합니다.
 *
 * @param {{ userId: string, page: number, limit: number }} params
 * @returns {Promise<{ items: object[], total: number }>}
 */
export async function listMyGenerations({ userId, page, limit }) {
  const resolvedUserId = assertNonEmptyString(userId, 'userId');
  const resolvedPage = Number.isInteger(page) && page >= 1 ? page : 1;
  const resolvedLimit = Number.isInteger(limit) && limit >= 1 ? limit : 12;
  const from = (resolvedPage - 1) * resolvedLimit;
  const to = from + resolvedLimit - 1;

  const { data, error, count } = await supabaseAdmin
    .from(EMOTICON_GENERATIONS_TABLE)
    .select(MY_GENERATIONS_LIST_COLUMNS, { count: 'exact' })
    .eq('user_id', resolvedUserId)
    .eq('saved_to_gallery', true)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    handleSupabaseError('list', error);
  }

  return {
    items: (data ?? []).map(mapGenerationListItem),
    total: count ?? 0,
  };
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

/**
 * 본인 소유 emoticon_generations 기록을 삭제합니다.
 * generated-emoticons Storage 이미지만 삭제하고 original upload image는 유지합니다.
 *
 * @param {{ generationId: string, userId: string }} params
 * @returns {Promise<void>}
 */
export async function deleteMyGeneration({ generationId, userId }) {
  const resolvedGenerationId = assertNonEmptyString(generationId, 'generationId');
  const resolvedUserId = assertNonEmptyString(userId, 'userId');

  const { data, error } = await supabaseAdmin
    .from(EMOTICON_GENERATIONS_TABLE)
    .select('id, generated_image_url')
    .eq('id', resolvedGenerationId)
    .eq('user_id', resolvedUserId)
    .maybeSingle();

  if (error) {
    handleSupabaseError('fetch for delete', error);
  }

  if (!data) {
    throw createNotFoundError('Generation not found.');
  }

  await deleteGeneratedEmoticonByUrl(data.generated_image_url);

  const { error: deleteError } = await supabaseAdmin
    .from(EMOTICON_GENERATIONS_TABLE)
    .delete()
    .eq('id', resolvedGenerationId)
    .eq('user_id', resolvedUserId);

  if (deleteError) {
    handleSupabaseError('delete', deleteError);
  }
}

/**
 * 생성 완료된 이모티콘을 갤러리에 저장합니다.
 *
 * @param {{ generationId: string, userId: string }} params
 * @returns {Promise<{ id: string, savedToGallery: boolean }>}
 */
export async function saveGenerationToGallery({ generationId, userId }) {
  const resolvedGenerationId = assertNonEmptyString(generationId, 'generationId');
  const resolvedUserId = assertNonEmptyString(userId, 'userId');

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from(EMOTICON_GENERATIONS_TABLE)
    .select('id, status, saved_to_gallery')
    .eq('id', resolvedGenerationId)
    .eq('user_id', resolvedUserId)
    .maybeSingle();

  if (fetchError) {
    handleSupabaseError('fetch for gallery save', fetchError);
  }

  if (!existing) {
    throw createNotFoundError('Generation not found.');
  }

  if (existing.status !== STATUS_COMPLETED) {
    throw createNotSavableError(
      'Only completed generations can be saved to gallery.'
    );
  }

  if (existing.saved_to_gallery === true) {
    return {
      id: existing.id,
      savedToGallery: true,
    };
  }

  const { data, error } = await supabaseAdmin
    .from(EMOTICON_GENERATIONS_TABLE)
    .update({
      saved_to_gallery: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', resolvedGenerationId)
    .eq('user_id', resolvedUserId)
    .select('id, saved_to_gallery')
    .single();

  if (error) {
    handleSupabaseError('save to gallery', error);
  }

  return {
    id: data.id,
    savedToGallery: data.saved_to_gallery === true,
  };
}
