import { supabaseAdmin } from '../config/supabase.js';
import { assertCollectionOwnership } from './collection.service.js';
import {
  deleteGeneratedEmoticonByUrl,
  refreshGeneratedEmoticonSignedUrls,
} from './storage.service.js';

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
  'id, collection_id, status, saved_to_gallery, original_image_url, generated_image_url, emotion, motion, input_text, story_prompt, final_prompt, created_at, updated_at';

function mapGenerationListItem(row) {
  return {
    id: row.id,
    collectionId: row.collection_id ?? null,
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
 * @param {{ userId: string, page: number, limit: number, collectionId?: string | null }} params
 * @returns {Promise<{ items: object[], total: number }>}
 */
export async function listMyGenerations({
  userId,
  page,
  limit,
  collectionId,
}) {
  const resolvedUserId = assertNonEmptyString(userId, 'userId');
  const resolvedPage = Number.isInteger(page) && page >= 1 ? page : 1;
  const resolvedLimit = Number.isInteger(limit) && limit >= 1 ? limit : 12;
  const from = (resolvedPage - 1) * resolvedLimit;
  const to = from + resolvedLimit - 1;

  let query = supabaseAdmin
    .from(EMOTICON_GENERATIONS_TABLE)
    .select(MY_GENERATIONS_LIST_COLUMNS, { count: 'exact' })
    .eq('user_id', resolvedUserId)
    .eq('saved_to_gallery', true);

  if (collectionId === 'uncategorized') {
    query = query.is('collection_id', null);
  } else if (typeof collectionId === 'string' && collectionId.trim()) {
    query = query.eq('collection_id', collectionId.trim());
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    handleSupabaseError('list', error);
  }

  const items = (data ?? []).map(mapGenerationListItem);

  // DB에 저장된 signed URL은 발급 후 1시간이 지나면 만료되므로,
  // 조회 시점마다 새 signed URL을 발급해 내려준다. (만료로 갤러리 이미지가 깨지는 문제 방지)
  const refreshedUrls = await refreshGeneratedEmoticonSignedUrls(
    items.map((item) => item.generatedImageUrl)
  );
  refreshedUrls.forEach((url, index) => {
    items[index].generatedImageUrl = url;
  });

  return {
    items,
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
 *   collectionId?: string | null,
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
  collectionId,
}) {
  const resolvedUserId = assertNonEmptyString(userId, 'userId');
  const resolvedCollectionId =
    typeof collectionId === 'string' && collectionId.trim()
      ? collectionId.trim()
      : null;

  if (resolvedCollectionId) {
    await assertCollectionOwnership({
      userId: resolvedUserId,
      collectionId: resolvedCollectionId,
    });
  }

  const { data, error } = await supabaseAdmin
    .from(EMOTICON_GENERATIONS_TABLE)
    .insert({
      user_id: resolvedUserId,
      collection_id: resolvedCollectionId,
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

const BULK_DELETE_MAX = 100;

/**
 * 본인 소유 emoticon_generations 기록을 여러 건 삭제합니다.
 * generated-emoticons Storage 이미지만 삭제하고 original upload image는 유지합니다.
 *
 * @param {{ generationIds: string[], userId: string }} params
 * @returns {Promise<{ deletedCount: number, deletedIds: string[] }>}
 */
export async function deleteMyGenerations({ generationIds, userId }) {
  const resolvedUserId = assertNonEmptyString(userId, 'userId');

  if (!Array.isArray(generationIds) || generationIds.length === 0) {
    throw createServiceError('generationIds is required.');
  }

  const uniqueIds = [
    ...new Set(
      generationIds
        .filter((id) => typeof id === 'string' && id.trim())
        .map((id) => id.trim())
    ),
  ];

  if (uniqueIds.length === 0) {
    throw createServiceError('generationIds is required.');
  }

  if (uniqueIds.length > BULK_DELETE_MAX) {
    throw createServiceError(
      `Cannot delete more than ${BULK_DELETE_MAX} generations at once.`
    );
  }

  const { data, error } = await supabaseAdmin
    .from(EMOTICON_GENERATIONS_TABLE)
    .select('id, generated_image_url')
    .eq('user_id', resolvedUserId)
    .in('id', uniqueIds);

  if (error) {
    handleSupabaseError('fetch for bulk delete', error);
  }

  const rows = data ?? [];

  if (rows.length === 0) {
    throw createNotFoundError('Generation not found.');
  }

  for (const row of rows) {
    await deleteGeneratedEmoticonByUrl(row.generated_image_url);
  }

  const idsToDelete = rows.map((row) => row.id);

  const { error: deleteError } = await supabaseAdmin
    .from(EMOTICON_GENERATIONS_TABLE)
    .delete()
    .eq('user_id', resolvedUserId)
    .in('id', idsToDelete);

  if (deleteError) {
    handleSupabaseError('bulk delete', deleteError);
  }

  return {
    deletedCount: idsToDelete.length,
    deletedIds: idsToDelete,
  };
}

/**
 * 본인 소유 emoticon_generations 기록 1건을 삭제합니다.
 *
 * @param {{ generationId: string, userId: string }} params
 * @returns {Promise<void>}
 */
export async function deleteMyGeneration({ generationId, userId }) {
  const resolvedGenerationId = assertNonEmptyString(generationId, 'generationId');
  const resolvedUserId = assertNonEmptyString(userId, 'userId');

  await deleteMyGenerations({
    generationIds: [resolvedGenerationId],
    userId: resolvedUserId,
  });
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

/**
 * 생성 기록을 다른 폴더로 이동하거나 미분류로 되돌립니다.
 *
 * @param {{ userId: string, generationId: string, collectionId?: string | null }} params
 * @returns {Promise<object>}
 */
export async function moveGenerationToCollection({
  userId,
  generationId,
  collectionId,
}) {
  const resolvedUserId = assertNonEmptyString(userId, 'userId');
  const resolvedGenerationId = assertNonEmptyString(generationId, 'generationId');
  const resolvedCollectionId =
    typeof collectionId === 'string' && collectionId.trim()
      ? collectionId.trim()
      : null;

  if (resolvedCollectionId) {
    await assertCollectionOwnership({
      userId: resolvedUserId,
      collectionId: resolvedCollectionId,
    });
  }

  const { data, error } = await supabaseAdmin
    .from(EMOTICON_GENERATIONS_TABLE)
    .update({
      collection_id: resolvedCollectionId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', resolvedGenerationId)
    .eq('user_id', resolvedUserId)
    .select(MY_GENERATIONS_LIST_COLUMNS)
    .single();

  if (error) {
    handleSupabaseError('move to collection', error);
  }

  if (!data) {
    throw createNotFoundError('Generation not found.');
  }

  const item = mapGenerationListItem(data);
  const [refreshedUrl] = await refreshGeneratedEmoticonSignedUrls([
    item.generatedImageUrl,
  ]);
  item.generatedImageUrl = refreshedUrl;

  return item;
}
