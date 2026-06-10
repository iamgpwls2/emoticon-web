import { computed, ref } from 'vue'
import { deleteGenerations } from '../services/generation.service.js'
import { toUserErrorMessage } from '../utils/apiError.js'
import { downloadImage } from '../utils/downloadImage.js'

export const DRAG_MIME_TYPE = 'application/x-emoticon-ids'

/**
 * 갤러리 선택 모드·일괄 작업 상태와 핸들러를 제공합니다.
 */
export function useGallerySelection({
  items,
  total,
  visibleGenerations,
  deleteErrorMessage,
  loadCollections,
  showToast,
  moveSelectedGenerations,
  movingIds,
  dragOverFolderId,
}) {
  const selectionMode = ref(false)
  const selectedIds = ref([])
  const draggedImageId = ref('')
  const isDragging = ref(false)
  const showFolderMoveModal = ref(false)
  const isBulkDownloading = ref(false)
  const isBulkDeleting = ref(false)

  const selectedCount = computed(() => selectedIds.value.length)

  const visibleGenerationIds = computed(() =>
    visibleGenerations.value.map((item) => item.id)
  )

  /**
   * 화면에 보이는 모든 이미지가 선택됐는지 여부.
   * 폴더·정렬·즐겨찾기 필터로 숨겨진 항목은 전체 선택 대상에서 제외됩니다.
   */
  const isAllVisibleSelected = computed(() => {
    const visibleIds = visibleGenerationIds.value
    return (
      visibleIds.length > 0 &&
      visibleIds.every((id) => selectedIds.value.includes(id))
    )
  })

  const dropEnabled = computed(() => isDragging.value)

  function clearSelection() {
    selectedIds.value = []
    dragOverFolderId.value = ''
  }

  function toggleSelectionMode() {
    selectionMode.value = !selectionMode.value
    if (!selectionMode.value) {
      clearSelection()
    }
  }

  function selectAllVisibleImages() {
    selectedIds.value = [...visibleGenerationIds.value]
  }

  function toggleSelectAllVisible() {
    if (isAllVisibleSelected.value) {
      clearSelection()
    } else {
      selectAllVisibleImages()
    }
  }

  function toggleSelect(generationId) {
    if (!selectionMode.value) return

    if (selectedIds.value.includes(generationId)) {
      selectedIds.value = selectedIds.value.filter((id) => id !== generationId)
    } else {
      selectedIds.value = [...selectedIds.value, generationId]
    }
  }

  function handleCardDragStart({ id, event }) {
    draggedImageId.value = id
    isDragging.value = true

    const dragIds = selectedIds.value.includes(id) ? [...selectedIds.value] : [id]

    event.dataTransfer?.setData(DRAG_MIME_TYPE, JSON.stringify(dragIds))
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
    }
  }

  function handleCardDragEnd() {
    draggedImageId.value = ''
    isDragging.value = false
    dragOverFolderId.value = ''
  }

  function openFolderMoveModal() {
    if (selectedIds.value.length === 0) return
    showFolderMoveModal.value = true
  }

  function closeFolderMoveModal() {
    if (movingIds.value.length > 0) return
    showFolderMoveModal.value = false
  }

  async function handleFolderMoveSelect(collectionId) {
    if (selectedIds.value.length === 0) return

    const generationIds = [...selectedIds.value]
    showFolderMoveModal.value = false
    await moveSelectedGenerations(generationIds, collectionId)
  }

  /**
   * 선택된 이미지를 일괄 삭제하고 UI를 갱신합니다.
   * API 응답의 deletedIds만 items에서 제거하며(부분 삭제 대응),
   * total·폴더 개수를 갱신한 뒤 선택 모드를 초기화합니다.
   */
  async function handleBulkDelete() {
    if (selectedIds.value.length === 0 || isBulkDeleting.value) return

    const confirmed = window.confirm(
      `선택한 ${selectedIds.value.length}개 이미지를 삭제할까요?\n삭제하면 복구할 수 없습니다.`
    )
    if (!confirmed) return

    isBulkDeleting.value = true
    deleteErrorMessage.value = ''

    try {
      const generationIds = [...selectedIds.value]
      const result = await deleteGenerations(generationIds)
      const deletedSet = new Set(result.deletedIds)

      items.value = items.value.filter((item) => !deletedSet.has(item.id))
      total.value = Math.max(0, total.value - result.deletedCount)
      clearSelection()
      await loadCollections()
      showToast(`${result.deletedCount}개 이미지를 삭제했어요.`)
    } catch (err) {
      deleteErrorMessage.value = toUserErrorMessage(
        err,
        '이모티콘 삭제에 실패했습니다. 다시 시도해 주세요.'
      )
    } finally {
      isBulkDeleting.value = false
    }
  }

  async function handleBulkDownload() {
    if (selectedIds.value.length === 0 || isBulkDownloading.value) return

    const selectedItems = visibleGenerations.value.filter((item) =>
      selectedIds.value.includes(item.id)
    )

    isBulkDownloading.value = true

    let successCount = 0
    let failCount = 0

    for (const item of selectedItems) {
      const imageUrl = item.generatedImageUrl?.trim()
      if (!imageUrl) {
        failCount += 1
        continue
      }

      try {
        await downloadImage(imageUrl, `emoticon-${item.id}.png`)
        successCount += 1
      } catch {
        failCount += 1
      }
    }

    isBulkDownloading.value = false

    if (successCount > 0 && failCount === 0) {
      showToast(`${successCount}개 이미지를 다운로드했어요.`)
    } else if (successCount > 0) {
      showToast(`${successCount}개 다운로드 완료, ${failCount}개는 실패했어요.`)
    } else {
      showToast('다운로드할 수 있는 이미지가 없습니다.')
    }
  }

  function removeFromSelection(generationId) {
    selectedIds.value = selectedIds.value.filter((id) => id !== generationId)
  }

  return {
    selectionMode,
    selectedIds,
    draggedImageId,
    isDragging,
    showFolderMoveModal,
    isBulkDownloading,
    isBulkDeleting,
    selectedCount,
    visibleGenerationIds,
    isAllVisibleSelected,
    dropEnabled,
    clearSelection,
    toggleSelectionMode,
    toggleSelectAllVisible,
    toggleSelect,
    handleCardDragStart,
    handleCardDragEnd,
    openFolderMoveModal,
    closeFolderMoveModal,
    handleFolderMoveSelect,
    handleBulkDelete,
    handleBulkDownload,
    removeFromSelection,
  }
}
