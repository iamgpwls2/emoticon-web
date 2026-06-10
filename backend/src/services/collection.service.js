import { supabaseAdmin } from '../config/supabase.js';
import { deleteGeneratedEmoticonByUrl } from './storage.service.js';

const COLLECTIONS_TABLE = 'emoticon_collections';
const GENERATIONS_TABLE = 'emoticon_generations';

const COLLECTION_LIST_COLUMNS = 'id, name, created_at, updated_at';

function createServiceError(message) {
  const error = new Error(message);
  error.isCollectionServiceError = true;
  return error;
}

function createNotFoundError(message) {
  const error = new Error(message);
  error.isCollectionNotFoundError = true;
  return error;
}

function assertNonEmptyString(value, fieldName) {
  if (typeof value !== 'string' || !value.trim()) {
    throw createServiceError(`${fieldName} is required.`);
  }
  return value.trim();
}

function handleSupabaseError(action, error) {
  console.error(`emoticon_collections ${action} failed:`, error.message);
  throw createServiceError(`Failed to ${action} collection.`);
}

function mapCollectionRow(row, stats = {}) {
  return {
    id: row.id,
    name: row.name,
    itemCount: stats.itemCount ?? 0,
    coverImageUrl: stats.coverImageUrl ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function buildCollectionStats(userId, collectionIds) {
  if (collectionIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabaseAdmin
    .from(GENERATIONS_TABLE)
    .select('collection_id, generated_image_url, created_at')
    .eq('user_id', userId)
    .in('collection_id', collectionIds)
    .order('created_at', { ascending: false });

  if (error) {
    handleSupabaseError('aggregate stats', error);
  }

  const statsByCollectionId = new Map();

  for (const row of data ?? []) {
    const collectionId = row.collection_id;
    if (!collectionId) continue;

    const current = statsByCollectionId.get(collectionId) ?? {
      itemCount: 0,
      coverImageUrl: null,
    };

    current.itemCount += 1;
    if (!current.coverImageUrl && row.generated_image_url?.trim()) {
      current.coverImageUrl = row.generated_image_url.trim();
    }

    statsByCollectionId.set(collectionId, current);
  }

  return statsByCollectionId;
}

/**
 * @param {string} userId
 * @returns {Promise<number>}
 */
async function countUncategorizedGenerations(userId) {
  const { count, error } = await supabaseAdmin
    .from(GENERATIONS_TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('collection_id', null);

  if (error) {
    handleSupabaseError('count uncategorized', error);
  }

  return count ?? 0;
}

/**
 * @param {{ userId: string, collectionId: string }} params
 * @returns {Promise<object>}
 */
export async function getOwnedCollection({ userId, collectionId }) {
  const resolvedUserId = assertNonEmptyString(userId, 'userId');
  const resolvedCollectionId = assertNonEmptyString(collectionId, 'collectionId');

  const { data, error } = await supabaseAdmin
    .from(COLLECTIONS_TABLE)
    .select(COLLECTION_LIST_COLUMNS)
    .eq('id', resolvedCollectionId)
    .eq('user_id', resolvedUserId)
    .maybeSingle();

  if (error) {
    handleSupabaseError('fetch', error);
  }

  if (!data) {
    throw createNotFoundError('Collection not found.');
  }

  return data;
}

/**
 * @param {{ userId: string, collectionId?: string | null }} params
 * @returns {Promise<void>}
 */
export async function assertCollectionOwnership({ userId, collectionId }) {
  if (!collectionId?.trim()) {
    return;
  }

  await getOwnedCollection({ userId, collectionId: collectionId.trim() });
}

/**
 * @param {{ userId: string }} params
 * @returns {Promise<{ items: object[], uncategorizedCount: number, total: number }>}
 */
export async function listMyCollections({ userId }) {
  const resolvedUserId = assertNonEmptyString(userId, 'userId');

  const { data, error } = await supabaseAdmin
    .from(COLLECTIONS_TABLE)
    .select(COLLECTION_LIST_COLUMNS)
    .eq('user_id', resolvedUserId)
    .order('created_at', { ascending: false });

  if (error) {
    handleSupabaseError('list', error);
  }

  const rows = data ?? [];
  const collectionIds = rows.map((row) => row.id);
  const statsByCollectionId = await buildCollectionStats(
    resolvedUserId,
    collectionIds
  );
  const uncategorizedCount = await countUncategorizedGenerations(resolvedUserId);

  return {
    items: rows.map((row) =>
      mapCollectionRow(row, statsByCollectionId.get(row.id))
    ),
    uncategorizedCount,
    total: rows.length,
  };
}

/**
 * @param {{ userId: string, name: string }} params
 * @returns {Promise<object>}
 */
export async function createCollection({ userId, name }) {
  const resolvedUserId = assertNonEmptyString(userId, 'userId');
  const resolvedName = assertNonEmptyString(name, 'name');

  const { data, error } = await supabaseAdmin
    .from(COLLECTIONS_TABLE)
    .insert({
      user_id: resolvedUserId,
      name: resolvedName,
    })
    .select(COLLECTION_LIST_COLUMNS)
    .single();

  if (error) {
    handleSupabaseError('create', error);
  }

  if (!data) {
    throw createServiceError('Failed to create collection.');
  }

  return mapCollectionRow(data, { itemCount: 0, coverImageUrl: null });
}

/**
 * @param {{ userId: string, collectionId: string, name: string }} params
 * @returns {Promise<object>}
 */
export async function renameCollection({ userId, collectionId, name }) {
  const resolvedUserId = assertNonEmptyString(userId, 'userId');
  const resolvedCollectionId = assertNonEmptyString(collectionId, 'collectionId');
  const resolvedName = assertNonEmptyString(name, 'name');

  const { data, error } = await supabaseAdmin
    .from(COLLECTIONS_TABLE)
    .update({
      name: resolvedName,
      updated_at: new Date().toISOString(),
    })
    .eq('id', resolvedCollectionId)
    .eq('user_id', resolvedUserId)
    .select(COLLECTION_LIST_COLUMNS)
    .single();

  if (error) {
    handleSupabaseError('rename', error);
  }

  if (!data) {
    throw createNotFoundError('Collection not found.');
  }

  const statsByCollectionId = await buildCollectionStats(resolvedUserId, [
    resolvedCollectionId,
  ]);

  return mapCollectionRow(data, statsByCollectionId.get(resolvedCollectionId));
}

/**
 * @param {{ userId: string, collectionId: string, cascade?: boolean }} params
 * @returns {Promise<void>}
 */
export async function deleteCollection({
  userId,
  collectionId,
  cascade = false,
}) {
  const resolvedUserId = assertNonEmptyString(userId, 'userId');
  const resolvedCollectionId = assertNonEmptyString(collectionId, 'collectionId');

  await getOwnedCollection({
    userId: resolvedUserId,
    collectionId: resolvedCollectionId,
  });

  if (cascade) {
    const { data, error } = await supabaseAdmin
      .from(GENERATIONS_TABLE)
      .select('id')
      .eq('user_id', resolvedUserId)
      .eq('collection_id', resolvedCollectionId);

    if (error) {
      handleSupabaseError('list for cascade delete', error);
    }

    const generationRows = data ?? [];

    for (const row of generationRows) {
      const { data: generation, error: fetchError } = await supabaseAdmin
        .from(GENERATIONS_TABLE)
        .select('id, generated_image_url')
        .eq('id', row.id)
        .eq('user_id', resolvedUserId)
        .maybeSingle();

      if (fetchError) {
        handleSupabaseError('fetch for cascade delete', fetchError);
      }

      if (!generation) continue;

      await deleteGeneratedEmoticonByUrl(generation.generated_image_url);

      const { error: generationDeleteError } = await supabaseAdmin
        .from(GENERATIONS_TABLE)
        .delete()
        .eq('id', generation.id)
        .eq('user_id', resolvedUserId);

      if (generationDeleteError) {
        handleSupabaseError('cascade delete generation', generationDeleteError);
      }
    }
  }

  const { error: deleteError } = await supabaseAdmin
    .from(COLLECTIONS_TABLE)
    .delete()
    .eq('id', resolvedCollectionId)
    .eq('user_id', resolvedUserId);

  if (deleteError) {
    handleSupabaseError('delete', deleteError);
  }
}
