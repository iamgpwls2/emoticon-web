import { supabase } from '../lib/supabase.js';
import { readApiResponse } from '../utils/apiError.js';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:3000';

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
 * backend POST /api/generations 로 이모티콘 이미지 생성을 요청합니다.
 * @param {{
 *   originalImageUrl?: string,
 *   emotion: string,
 *   motion: string,
 *   inputText: string,
 *   storyPrompt: string,
 *   finalPrompt: string,
 * }} payload
 * @returns {Promise<{ id: string, generatedImageUrl: string, status: string }>}
 */
export async function createGeneration({
  originalImageUrl,
  emotion,
  motion,
  inputText,
  storyPrompt,
  finalPrompt,
  collectionId,
}) {
  if (!isNonEmptyString(finalPrompt)) {
    throw new Error('finalPrompt는 필수값입니다.');
  }

  const accessToken = await getAccessToken(
    '이모티콘을 생성하려면 로그인이 필요합니다.'
  );

  const payload = {
    emotion,
    motion,
    inputText,
    storyPrompt,
    finalPrompt,
  };
  const trimmedOriginalImageUrl = originalImageUrl?.trim();
  if (trimmedOriginalImageUrl) {
    payload.originalImageUrl = trimmedOriginalImageUrl;
  }
  const trimmedCollectionId = collectionId?.trim();
  if (trimmedCollectionId) {
    payload.collectionId = trimmedCollectionId;
  }

  const response = await fetch(`${API_BASE_URL}/api/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const body = await readApiResponse(
    response,
    '이모티콘 생성에 실패했습니다. 다시 시도해 주세요.'
  );

  return {
    id: body.id,
    generatedImageUrl: body.generatedImageUrl,
    status: body.status,
  };
}

/**
 * backend GET /api/generations/me 로 로그인 사용자의 생성 목록을 조회합니다.
 * @param {{ page?: number, limit?: number }} [params]
 * @returns {Promise<{
 *   items: Array<object>,
 *   page: number,
 *   limit: number,
 *   total: number,
 *   hasMore: boolean,
 * }>}
 */
export async function fetchMyGenerations({
  page = 1,
  limit = 12,
  collectionId,
} = {}) {
  const accessToken = await getAccessToken(
    '이모티콘 목록을 보려면 로그인이 필요합니다.'
  );

  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (typeof collectionId === 'string' && collectionId.trim()) {
    query.set('collectionId', collectionId.trim());
  }

  const response = await fetch(
    `${API_BASE_URL}/api/generations/me?${query.toString()}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const body = await readApiResponse(
    response,
    '이모티콘 목록을 불러오지 못했습니다. 다시 시도해 주세요.'
  );

  return {
    items: body.items ?? [],
    page: body.page,
    limit: body.limit,
    total: body.total,
    hasMore: body.hasMore,
  };
}

/**
 * backend DELETE /api/generations/:id 로 로그인 사용자의 생성 기록을 삭제합니다.
 * @param {string} id
 * @returns {Promise<{ success: boolean }>}
 */
export async function deleteGeneration(id) {
  if (!isNonEmptyString(id)) {
    throw new Error('삭제할 이모티콘 id가 필요합니다.');
  }

  const accessToken = await getAccessToken(
    '이모티콘을 삭제하려면 로그인이 필요합니다.'
  );

  const response = await fetch(`${API_BASE_URL}/api/generations/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const body = await readApiResponse(
    response,
    '이모티콘 삭제에 실패했습니다. 다시 시도해 주세요.'
  );

  return { success: body.success === true };
}

/**
 * backend POST /api/generations/bulk-delete 로 로그인 사용자의 생성 기록을 여러 건 삭제합니다.
 * @param {string[]} ids
 * @returns {Promise<{ success: boolean, deletedCount: number, deletedIds: string[] }>}
 */
export async function deleteGenerations(ids) {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('삭제할 이모티콘 id 목록이 필요합니다.');
  }

  const accessToken = await getAccessToken(
    '이모티콘을 삭제하려면 로그인이 필요합니다.'
  );

  const response = await fetch(`${API_BASE_URL}/api/generations/bulk-delete`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ids }),
  });

  const body = await readApiResponse(
    response,
    '이모티콘 삭제에 실패했습니다. 다시 시도해 주세요.'
  );

  return {
    success: body.success === true,
    deletedCount: body.deletedCount ?? 0,
    deletedIds: Array.isArray(body.deletedIds) ? body.deletedIds : [],
  };
}

/**
 * backend PATCH /api/generations/:id/gallery 로 갤러리 저장을 확정합니다.
 * @param {string} id
 * @returns {Promise<{ id: string, savedToGallery: boolean }>}
 */
export async function saveGenerationToGallery(id) {
  if (!isNonEmptyString(id)) {
    throw new Error('저장할 이모티콘 id가 필요합니다.');
  }

  const accessToken = await getAccessToken(
    '갤러리에 저장하려면 로그인이 필요합니다.'
  );

  const response = await fetch(`${API_BASE_URL}/api/generations/${id}/gallery`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  const body = await readApiResponse(
    response,
    '갤러리 저장에 실패했습니다. 다시 시도해 주세요.'
  );

  return {
    id: body.id,
    savedToGallery: body.savedToGallery === true,
  };
}
