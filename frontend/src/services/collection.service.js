import { supabase } from '../lib/supabase.js';
import { readApiResponse } from '../utils/apiError.js';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:4000';

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

async function getAccessToken(unauthenticatedMessage) {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  const accessToken = session?.access_token;
  if (!accessToken) {
    throw new Error(unauthenticatedMessage);
  }

  return accessToken;
}

/**
 * @returns {Promise<{
 *   items: Array<object>,
 *   uncategorizedCount: number,
 *   total: number,
 * }>}
 */
export async function fetchMyCollections() {
  const accessToken = await getAccessToken(
    '폴더 목록을 보려면 로그인이 필요합니다.'
  );

  const response = await fetch(`${API_BASE_URL}/api/collections/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const body = await readApiResponse(
    response,
    '폴더 목록을 불러오지 못했습니다. 다시 시도해 주세요.'
  );

  return {
    items: body.items ?? [],
    uncategorizedCount: body.uncategorizedCount ?? 0,
    total: body.total ?? 0,
  };
}

/**
 * @param {string} name
 */
export async function createCollection(name) {
  if (!isNonEmptyString(name)) {
    throw new Error('폴더 이름을 입력해 주세요.');
  }

  const accessToken = await getAccessToken(
    '폴더를 만들려면 로그인이 필요합니다.'
  );

  const response = await fetch(`${API_BASE_URL}/api/collections`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: name.trim() }),
  });

  return readApiResponse(
    response,
    '폴더를 만들지 못했습니다. 다시 시도해 주세요.'
  );
}

/**
 * @param {string} id
 * @param {{ page?: number, limit?: number }} [params]
 */
export async function fetchCollectionDetail(id, { page = 1, limit = 12 } = {}) {
  if (!isNonEmptyString(id)) {
    throw new Error('폴더 id가 필요합니다.');
  }

  const accessToken = await getAccessToken(
    '폴더 내용을 보려면 로그인이 필요합니다.'
  );

  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  const response = await fetch(
    `${API_BASE_URL}/api/collections/${id}?${query.toString()}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const body = await readApiResponse(
    response,
    '폴더 내용을 불러오지 못했습니다. 다시 시도해 주세요.'
  );

  return {
    id: body.id,
    name: body.name,
    createdAt: body.createdAt,
    updatedAt: body.updatedAt,
    items: body.items ?? [],
    page: body.page,
    limit: body.limit,
    total: body.total,
    hasMore: body.hasMore,
  };
}

/**
 * @param {string} id
 * @param {string} name
 */
export async function renameCollection(id, name) {
  if (!isNonEmptyString(id)) {
    throw new Error('폴더 id가 필요합니다.');
  }
  if (!isNonEmptyString(name)) {
    throw new Error('폴더 이름을 입력해 주세요.');
  }

  const accessToken = await getAccessToken(
    '폴더 이름을 변경하려면 로그인이 필요합니다.'
  );

  const response = await fetch(`${API_BASE_URL}/api/collections/${id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: name.trim() }),
  });

  return readApiResponse(
    response,
    '폴더 이름을 변경하지 못했습니다. 다시 시도해 주세요.'
  );
}

/**
 * @param {string} id
 * @param {{ cascade?: boolean }} [options]
 */
export async function deleteCollection(id, { cascade = false } = {}) {
  if (!isNonEmptyString(id)) {
    throw new Error('폴더 id가 필요합니다.');
  }

  const accessToken = await getAccessToken(
    '폴더를 삭제하려면 로그인이 필요합니다.'
  );

  const query = cascade ? '?cascade=true' : '';
  const response = await fetch(
    `${API_BASE_URL}/api/collections/${id}${query}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const body = await readApiResponse(
    response,
    '폴더를 삭제하지 못했습니다. 다시 시도해 주세요.'
  );

  return { success: body.success === true };
}

/**
 * @param {string} generationId
 * @param {string | null} collectionId
 */
export async function moveGenerationToCollection(generationId, collectionId) {
  if (!isNonEmptyString(generationId)) {
    throw new Error('이동할 이모티콘 id가 필요합니다.');
  }

  const accessToken = await getAccessToken(
    '폴더 이동을 하려면 로그인이 필요합니다.'
  );

  const response = await fetch(
    `${API_BASE_URL}/api/generations/${generationId}/collection`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        collectionId: collectionId?.trim() ? collectionId.trim() : null,
      }),
    }
  );

  return readApiResponse(
    response,
    '폴더 이동에 실패했습니다. 다시 시도해 주세요.'
  );
}

/**
 * @param {string[]} generationIds
 * @param {string} collectionId
 */
export async function moveGenerationsToCollection(generationIds, collectionId) {
  if (!Array.isArray(generationIds) || generationIds.length === 0) {
    throw new Error('이동할 이모티콘을 선택해 주세요.');
  }
  if (!isNonEmptyString(collectionId)) {
    throw new Error('대상 폴더가 필요합니다.');
  }

  const results = [];
  for (const generationId of generationIds) {
    const item = await moveGenerationToCollection(generationId, collectionId);
    results.push(item);
  }
  return results;
}
