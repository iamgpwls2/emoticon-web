import { computed, ref } from 'vue'
import { COLLECTION_PREFIX, FOLDER_ID } from '../constants/gallery.js'

/**
 * 갤러리 정렬·폴더 필터·헤더 표시·뷰 상태 판별 로직을 제공합니다.
 */
export function useGalleryDisplay({
  items,
  selectedFolderId,
  activeCollection,
  allFolderTotal,
  isAuthReady,
  isLoading,
  errorMessage,
}) {
  const viewMode = ref('grid')

  function filterItemsByFolder(list, folderId) {
    if (folderId === FOLDER_ID.ALL) {
      return list
    }

    if (folderId === FOLDER_ID.FAVORITE) {
      return list
    }

    if (folderId === FOLDER_ID.UNCATEGORIZED) {
      return list.filter((item) => !item.collectionId)
    }

    if (folderId.startsWith(COLLECTION_PREFIX)) {
      const collectionId = folderId.slice(COLLECTION_PREFIX.length)
      return list.filter((item) => item.collectionId === collectionId)
    }

    return list
  }

  const displayItems = computed(() =>
    filterItemsByFolder(items.value, selectedFolderId.value)
  )

  /**
   * 현재 화면에 렌더링 중인 이미지 목록.
   * displayItems(정렬·즐겨찾기 필터 반영)와 동일하며,
   * 전체 선택·일괄 다운로드는 DB 전체가 아닌 이 목록 기준으로 동작합니다.
   */
  const visibleGenerations = computed(() => displayItems.value)

  const filterTitle = computed(() => {
    if (selectedFolderId.value === FOLDER_ID.ALL) return '전체 이미지'
    if (selectedFolderId.value === FOLDER_ID.FAVORITE) return '즐겨찾기'
    if (selectedFolderId.value === FOLDER_ID.UNCATEGORIZED) return '미분류'
    if (activeCollection.value) return activeCollection.value.name
    return '갤러리'
  })

  const filterDescription = computed(() => {
    if (activeCollection.value?.description?.trim()) {
      return activeCollection.value.description.trim()
    }
    return '설명 없음'
  })

  const folderItemCount = computed(() => displayItems.value.length)

  const hasAnyImages = computed(() => allFolderTotal.value > 0)

  const isInitialLoading = () =>
    (!isAuthReady.value || isLoading.value) && items.value.length === 0

  const isEmpty = () =>
    !isLoading.value && !errorMessage.value && displayItems.value.length === 0

  const isSuccess = () =>
    !isLoading.value && !errorMessage.value && displayItems.value.length > 0

  return {
    viewMode,
    displayItems,
    visibleGenerations,
    filterTitle,
    filterDescription,
    folderItemCount,
    hasAnyImages,
    filterItemsByFolder,
    isInitialLoading,
    isEmpty,
    isSuccess,
  }
}
