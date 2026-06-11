import { ref } from 'vue'
import {
  fetchMyGenerations,
  patchGenerationFavorite,
} from '../services/generation.service.js'
import { toUserErrorMessage } from '../utils/apiError.js'

/**
 * 갤러리 즐겨찾기 상태를 backend API(DB) 기준으로 관리합니다.
 */
export function useFavorites() {
  const favoriteCount = ref(0)
  const togglingIds = ref([])
  const favoriteError = ref('')

  function isToggling(id) {
    return togglingIds.value.includes(id)
  }

  function setToggling(id, active) {
    if (active) {
      if (!togglingIds.value.includes(id)) {
        togglingIds.value = [...togglingIds.value, id]
      }
      return
    }

    togglingIds.value = togglingIds.value.filter((item) => item !== id)
  }

  async function loadFavoriteCount() {
    try {
      const result = await fetchMyGenerations({
        page: 1,
        limit: 1,
        favorite: true,
      })
      favoriteCount.value = result.total ?? 0
    } catch {
      favoriteCount.value = 0
    }
  }

  function syncFavoriteCountFromTotal(total) {
    if (typeof total === 'number' && total >= 0) {
      favoriteCount.value = total
    }
  }

  /**
   * @param {string} id
   * @param {boolean} currentIsFavorite
   * @returns {Promise<boolean>} 갱신된 isFavorite 값
   */
  async function toggleFavorite(id, currentIsFavorite) {
    if (!id?.trim() || isToggling(id)) {
      return currentIsFavorite
    }

    const nextIsFavorite = !currentIsFavorite
    setToggling(id, true)
    favoriteError.value = ''

    try {
      const result = await patchGenerationFavorite(id, nextIsFavorite)

      if (result.isFavorite) {
        favoriteCount.value += 1
      } else {
        favoriteCount.value = Math.max(0, favoriteCount.value - 1)
      }

      return result.isFavorite
    } catch (error) {
      favoriteError.value = toUserErrorMessage(
        error,
        '즐겨찾기 변경에 실패했습니다. 다시 시도해 주세요.'
      )
      throw error
    } finally {
      setToggling(id, false)
    }
  }

  function clearFavoriteError() {
    favoriteError.value = ''
  }

  return {
    favoriteCount,
    togglingIds,
    favoriteError,
    isToggling,
    loadFavoriteCount,
    syncFavoriteCountFromTotal,
    toggleFavorite,
    clearFavoriteError,
  }
}
