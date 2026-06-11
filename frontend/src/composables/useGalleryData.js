import { ref } from 'vue'
import { fetchMyGenerations } from '../services/generation.service.js'
import { toUserErrorMessage } from '../utils/apiError.js'
import { COLLECTION_PREFIX, FOLDER_ID } from '../constants/gallery.js'

const PAGE_LIMIT = 12

/**
 * 갤러리 이미지 목록 fetch·페이지네이션·카운트 동기화 상태를 제공합니다.
 */
export function useGalleryData({
  selectedFolderId,
  collections,
  uncategorizedCount,
  loadCollections,
  onResetStart,
  onResetExternal,
  onFavoriteTotalLoaded,
}) {
  const items = ref([])
  const page = ref(1)
  const hasMore = ref(false)
  const total = ref(0)
  const allFolderTotal = ref(0)
  const isLoading = ref(false)
  const isLoadingMore = ref(false)
  const errorMessage = ref('')

  const lastLoadedUserId = ref(null)

  function isFavoriteFolderSelected() {
    return selectedFolderId.value === FOLDER_ID.FAVORITE
  }

  /**
   * selectedFolderId를 GET /api/generations/me 의 collectionId 쿼리값으로 변환합니다.
   * - 'uncategorized' → 'uncategorized'
   * - 'collection:{uuid}' → uuid
   * - 'all' / 'favorite' → undefined
   */
  function resolveCollectionIdForFetch() {
    if (isFavoriteFolderSelected()) {
      return undefined
    }
    if (selectedFolderId.value === FOLDER_ID.UNCATEGORIZED) {
      return FOLDER_ID.UNCATEGORIZED
    }
    if (selectedFolderId.value.startsWith(COLLECTION_PREFIX)) {
      return selectedFolderId.value.slice(COLLECTION_PREFIX.length)
    }
    return undefined
  }

  function syncFolderListCount(fetchedTotal) {
    const folderId = selectedFolderId.value

    if (folderId === FOLDER_ID.ALL) {
      allFolderTotal.value = fetchedTotal
      return
    }

    if (folderId === FOLDER_ID.UNCATEGORIZED) {
      uncategorizedCount.value = fetchedTotal
      return
    }

    if (folderId.startsWith(COLLECTION_PREFIX)) {
      const collectionId = folderId.slice(COLLECTION_PREFIX.length)
      collections.value = collections.value.map((collection) =>
        collection.id === collectionId
          ? { ...collection, itemCount: fetchedTotal }
          : collection
      )
    }
  }

  function adjustCountsAfterDelete(deletedCount = 1) {
    allFolderTotal.value = Math.max(0, allFolderTotal.value - deletedCount)
    total.value = Math.max(0, total.value - deletedCount)

    if (selectedFolderId.value === FOLDER_ID.UNCATEGORIZED) {
      uncategorizedCount.value = Math.max(
        0,
        uncategorizedCount.value - deletedCount
      )
      return
    }

    if (selectedFolderId.value.startsWith(COLLECTION_PREFIX)) {
      const collectionId = selectedFolderId.value.slice(COLLECTION_PREFIX.length)
      collections.value = collections.value.map((collection) =>
        collection.id === collectionId
          ? {
              ...collection,
              itemCount: Math.max(0, (collection.itemCount ?? 0) - deletedCount),
            }
          : collection
      )
    }
  }

  async function loadImages({ nextPage = 1, append = false } = {}) {
    if (append) {
      if (isLoadingMore.value || isLoading.value || !hasMore.value) return
      isLoadingMore.value = true
    } else {
      if (isLoading.value) return
      isLoading.value = true
      errorMessage.value = ''
    }

    try {
      const result = await fetchMyGenerations({
        page: nextPage,
        limit: PAGE_LIMIT,
        collectionId: resolveCollectionIdForFetch(),
        favorite: isFavoriteFolderSelected() ? true : undefined,
      })

      items.value = append ? [...items.value, ...result.items] : result.items
      page.value = result.page
      hasMore.value = Boolean(result.hasMore)

      const fetchedTotal = result.total ?? items.value.length
      total.value = fetchedTotal
      if (!append) {
        syncFolderListCount(fetchedTotal)
        if (isFavoriteFolderSelected()) {
          onFavoriteTotalLoaded?.(fetchedTotal)
        }
      }
    } catch (err) {
      if (!append) {
        items.value = []
        hasMore.value = false
        total.value = 0
        syncFolderListCount(0)
      }

      errorMessage.value = toUserErrorMessage(
        err,
        '이모티콘 목록을 불러오지 못했습니다. 다시 시도해 주세요.'
      )
    } finally {
      isLoading.value = false
      isLoadingMore.value = false
    }
  }

  async function refreshGallery({ resetPage = true } = {}) {
    await loadCollections()
    if (resetPage) {
      page.value = 1
    }
    await loadImages({ nextPage: page.value, append: false })
  }

  function resetGalleryState() {
    onResetStart?.()
    allFolderTotal.value = 0
    items.value = []
    page.value = 1
    hasMore.value = false
    total.value = 0
    isLoading.value = false
    isLoadingMore.value = false
    errorMessage.value = ''
    onResetExternal?.()
  }

  return {
    items,
    page,
    hasMore,
    total,
    allFolderTotal,
    isLoading,
    isLoadingMore,
    errorMessage,
    lastLoadedUserId,
    resolveCollectionIdForFetch,
    syncFolderListCount,
    adjustCountsAfterDelete,
    loadImages,
    refreshGallery,
    resetGalleryState,
  }
}
