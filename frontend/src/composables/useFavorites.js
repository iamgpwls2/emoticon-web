import { computed, ref, watch } from 'vue'

const STORAGE_KEY = 'emoticon-web:favorite-ids'

function readFavoriteIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter((id) => typeof id === 'string' && id.trim())
      : []
  } catch {
    return []
  }
}

function writeFavoriteIds(ids) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
}

/**
 * 즐겨찾기는 프론트 localStorage 기반입니다.
 * TODO: 백엔드 즐겨찾기 API 연동 (PATCH /api/generations/:id/favorite 등)
 */
export function useFavorites() {
  const favoriteIds = ref(readFavoriteIds())

  watch(
    favoriteIds,
    (ids) => {
      writeFavoriteIds(ids)
    },
    { deep: true }
  )

  const favoriteCount = computed(() => favoriteIds.value.length)

  function isFavorite(id) {
    return favoriteIds.value.includes(id)
  }

  function toggleFavorite(id) {
    if (!id?.trim()) return

    if (favoriteIds.value.includes(id)) {
      favoriteIds.value = favoriteIds.value.filter((item) => item !== id)
      return false
    }

    favoriteIds.value = [...favoriteIds.value, id]
    return true
  }

  function filterFavoriteItems(items) {
    const idSet = new Set(favoriteIds.value)
    return items.filter((item) => idSet.has(item.id))
  }

  return {
    favoriteIds,
    favoriteCount,
    isFavorite,
    toggleFavorite,
    filterFavoriteItems,
  }
}
