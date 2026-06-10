export const DEFAULT_LIST_LIMIT = 12;
export const MAX_LIST_LIMIT = 50;

export function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
}

/**
 * @param {import('express').Request['query']} query
 * @param {{ defaultLimit?: number, maxLimit?: number }} [options]
 */
export function parseListPagination(query, options = {}) {
  const defaultLimit = options.defaultLimit ?? DEFAULT_LIST_LIMIT;
  const maxLimit = options.maxLimit ?? MAX_LIST_LIMIT;
  const page = parsePositiveInt(query.page, 1);
  const limit = Math.min(maxLimit, parsePositiveInt(query.limit, defaultLimit));

  return { page, limit };
}
