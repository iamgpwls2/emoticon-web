import { computed, ref } from 'vue'
import {
  createCollection,
  deleteCollection,
  fetchMyCollections,
  moveGenerationToCollection,
  moveGenerationsToCollection,
  renameCollection,
} from '../services/collection.service.js'
import { COLLECTION_PREFIX, FOLDER_ID } from '../constants/gallery.js'
import { toUserErrorMessage } from '../utils/apiError.js'
import { DRAG_MIME_TYPE } from './useGallerySelection.js'

export const COLLECTION_NAME_MAX_LENGTH = 50

/**
 * 갤러리 폴더·드래그 앤 드롭 이동 상태와 핸들러를 제공합니다.
 */
export function useGalleryFolders({
  items,
  total,
  page,
  selectedFolderId,
  deleteErrorMessage,
  folderActionErrorMessage,
  showToast,
  refreshGallery,
  loadImages,
  clearSelection,
  collections: collectionsRef,
  uncategorizedCount: uncategorizedCountRef,
}) {
  const movingIds = ref([])
  const dragOverFolderId = ref('')

  const showCreateFolderModal = ref(false)
  const isCreatingFolder = ref(false)
  const isRenamingFolder = ref(false)
  const isEditingFolderName = ref(false)
  const editFolderName = ref('')

  const collections = collectionsRef
  const uncategorizedCount = uncategorizedCountRef

  const totalImageCount = computed(
    () =>
      uncategorizedCount.value +
      collections.value.reduce(
        (sum, collection) => sum + (collection.itemCount ?? 0),
        0
      )
  )

  const activeCollection = computed(() =>
    selectedFolderId.value.startsWith(COLLECTION_PREFIX)
      ? collections.value.find(
          (collection) =>
            collection.id ===
            selectedFolderId.value.slice(COLLECTION_PREFIX.length)
        ) ?? null
      : null
  )

  const activeCollectionId = computed(() => activeCollection.value?.id ?? '')

  const customFolders = computed(() =>
    collections.value.map((collection) => ({
      id: collection.id,
      name: collection.name,
      itemCount: collection.itemCount ?? 0,
    }))
  )

  const collectionNameById = computed(() =>
    Object.fromEntries(
      collections.value.map((collection) => [collection.id, collection.name])
    )
  )

  const existingFolderNames = computed(() => [
    '전체 이미지',
    '즐겨찾기',
    '미분류',
    ...collections.value.map((collection) => collection.name),
  ])

  async function loadCollections() {
    try {
      const result = await fetchMyCollections()
      collections.value = result.items ?? []
      uncategorizedCount.value = result.uncategorizedCount ?? 0
    } catch (err) {
      folderActionErrorMessage.value = toUserErrorMessage(
        err,
        '폴더 목록을 불러오지 못했습니다.'
      )
    }
  }

  function selectFolder(folderId) {
    if (
      folderId.startsWith(COLLECTION_PREFIX) ||
      folderId === FOLDER_ID.UNCATEGORIZED
    ) {
      selectedFolderId.value = folderId
    } else if (folderId === FOLDER_ID.ALL || folderId === FOLDER_ID.FAVORITE) {
      selectedFolderId.value = folderId
    } else {
      selectedFolderId.value = `${COLLECTION_PREFIX}${folderId}`
    }

    page.value = 1
    deleteErrorMessage.value = ''
    folderActionErrorMessage.value = ''
    clearSelection()
    isEditingFolderName.value = false

    if (selectedFolderId.value.startsWith(COLLECTION_PREFIX)) {
      const collection = collections.value.find(
        (item) =>
          item.id === selectedFolderId.value.slice(COLLECTION_PREFIX.length)
      )
      editFolderName.value = collection?.name ?? ''
    }

    loadImages({ nextPage: 1, append: false })
  }

  /**
   * 드래그 종료(drop) 시 dataTransfer에서 이동할 generation id 목록을 추출합니다.
   * dragstart에서 DRAG_MIME_TYPE('application/x-emoticon-ids')으로 JSON 배열을 저장합니다.
   */
  function parseDraggedIds(event) {
    const raw = event.dataTransfer?.getData(DRAG_MIME_TYPE)
    if (!raw) return []

    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed)
        ? parsed.filter((id) => typeof id === 'string' && id.trim())
        : []
    } catch {
      return []
    }
  }

  function resolveDropFolderId(folderId) {
    if (folderId === FOLDER_ID.UNCATEGORIZED) return null
    if (folderId.startsWith(COLLECTION_PREFIX)) {
      return folderId.slice(COLLECTION_PREFIX.length)
    }
    return folderId
  }

  function getFolderDisplayName(folderId) {
    if (folderId === FOLDER_ID.UNCATEGORIZED) return '미분류'
    if (folderId.startsWith(COLLECTION_PREFIX)) {
      const id = folderId.slice(COLLECTION_PREFIX.length)
      return collections.value.find((item) => item.id === id)?.name ?? '폴더'
    }
    const folder = collections.value.find((item) => item.id === folderId)
    return folder?.name ?? '폴더'
  }

  function handleFolderDragEnter(folderId, isDragging) {
    if (!isDragging) return
    dragOverFolderId.value = folderId
  }

  function handleFolderDragLeave(folderId) {
    if (dragOverFolderId.value === folderId) {
      dragOverFolderId.value = ''
    }
  }

  /**
   * 선택된 generation들을 대상 폴더로 이동하고 로컬 state를 갱신합니다.
   * API 성공 후 items에서 이동된 id를 제거하고(현재 폴더 뷰 기준),
   * total·폴더 개수(loadCollections)를 맞춘 뒤 선택을 초기화합니다.
   */
  async function moveSelectedGenerations(generationIds, collectionId) {
    folderActionErrorMessage.value = ''
    movingIds.value = generationIds

    try {
      if (collectionId) {
        await moveGenerationsToCollection(generationIds, collectionId)
      } else {
        for (const generationId of generationIds) {
          await moveGenerationToCollection(generationId, null)
        }
      }

      items.value = items.value.filter((item) => !generationIds.includes(item.id))
      total.value = Math.max(0, total.value - generationIds.length)
      clearSelection()
      await loadCollections()

      const folderLabel = collectionId
        ? getFolderDisplayName(`${COLLECTION_PREFIX}${collectionId}`)
        : '미분류'
      showToast(`이미지를 ${folderLabel} 폴더로 이동했어요.`)
    } catch (err) {
      folderActionErrorMessage.value = toUserErrorMessage(
        err,
        '폴더 이동에 실패했습니다. 다시 시도해 주세요.'
      )
    } finally {
      movingIds.value = []
    }
  }

  async function handleFolderDrop({ folderId, event }, isDragging) {
    dragOverFolderId.value = ''

    if (!isDragging) return

    const generationIds = parseDraggedIds(event)
    if (generationIds.length === 0) return

    const collectionId = resolveDropFolderId(folderId)
    await moveSelectedGenerations(generationIds, collectionId)
  }

  function openCreateFolderModal() {
    showCreateFolderModal.value = true
    folderActionErrorMessage.value = ''
  }

  function closeCreateFolderModal() {
    if (isCreatingFolder.value) return
    showCreateFolderModal.value = false
  }

  async function handleCreateFolder(name) {
    const trimmedName = name.trim()
    if (!trimmedName || isCreatingFolder.value) return

    if (trimmedName.length > COLLECTION_NAME_MAX_LENGTH) {
      folderActionErrorMessage.value = `폴더 이름은 최대 ${COLLECTION_NAME_MAX_LENGTH}자까지 입력할 수 있습니다.`
      return
    }

    isCreatingFolder.value = true
    folderActionErrorMessage.value = ''

    try {
      const created = await createCollection(trimmedName)
      collections.value = [created, ...collections.value]
      showCreateFolderModal.value = false
      selectFolder(created.id)
      showToast(`「${created.name}」 폴더가 생성되었습니다.`)
    } catch (err) {
      folderActionErrorMessage.value = toUserErrorMessage(
        err,
        '폴더를 만들지 못했습니다. 다시 시도해 주세요.'
      )
    } finally {
      isCreatingFolder.value = false
    }
  }

  function startRenameFolder() {
    if (!activeCollection.value) return
    editFolderName.value = activeCollection.value.name
    isEditingFolderName.value = true
  }

  function cancelRenameFolder() {
    isEditingFolderName.value = false
    editFolderName.value = activeCollection.value?.name ?? ''
  }

  async function handleRenameFolder() {
    if (!activeCollectionId.value || isRenamingFolder.value) return

    const trimmedName = editFolderName.value.trim()
    if (!trimmedName) return

    if (trimmedName.length > COLLECTION_NAME_MAX_LENGTH) {
      folderActionErrorMessage.value = `폴더 이름은 최대 ${COLLECTION_NAME_MAX_LENGTH}자까지 입력할 수 있습니다.`
      return
    }

    isRenamingFolder.value = true
    folderActionErrorMessage.value = ''

    try {
      const updated = await renameCollection(activeCollectionId.value, trimmedName)
      collections.value = collections.value.map((collection) =>
        collection.id === updated.id ? { ...collection, ...updated } : collection
      )
      editFolderName.value = updated.name
      isEditingFolderName.value = false
      showToast('폴더 이름이 변경되었습니다.')
    } catch (err) {
      folderActionErrorMessage.value = toUserErrorMessage(
        err,
        '폴더 이름을 변경하지 못했습니다. 다시 시도해 주세요.'
      )
    } finally {
      isRenamingFolder.value = false
    }
  }

  async function handleSidebarRename({ folderId, name }) {
    editFolderName.value = name
    selectedFolderId.value = `${COLLECTION_PREFIX}${folderId}`
    await handleRenameFolder()
  }

  async function handleDeleteFolder(folderId) {
    const collection =
      collections.value.find((item) => item.id === folderId) ??
      activeCollection.value
    if (!collection) return

    const itemCount = collection.itemCount ?? 0
    const message =
      itemCount > 0
        ? `「${collection.name}」 폴더를 삭제할까요?\n\n이미지 ${itemCount}개는 미분류로 이동합니다.`
        : `「${collection.name}」 폴더를 삭제할까요?`

    if (!window.confirm(message)) return

    const deleteImagesToo = window.confirm(
      '폴더 안 이미지도 함께 삭제할까요?\n취소를 누르면 이미지는 미분류로만 이동합니다.'
    )

    folderActionErrorMessage.value = ''

    try {
      await deleteCollection(collection.id, { cascade: deleteImagesToo })
      selectedFolderId.value = FOLDER_ID.UNCATEGORIZED
      await refreshGallery()
      showToast('폴더가 삭제되었습니다.')
    } catch (err) {
      folderActionErrorMessage.value = toUserErrorMessage(
        err,
        '폴더를 삭제하지 못했습니다. 다시 시도해 주세요.'
      )
    }
  }

  return {
    movingIds,
    dragOverFolderId,
    showCreateFolderModal,
    isCreatingFolder,
    isRenamingFolder,
    isEditingFolderName,
    editFolderName,
    totalImageCount,
    activeCollection,
    activeCollectionId,
    customFolders,
    collectionNameById,
    existingFolderNames,
    loadCollections,
    selectFolder,
    parseDraggedIds,
    moveSelectedGenerations,
    handleFolderDrop,
    handleFolderDragEnter,
    handleFolderDragLeave,
    openCreateFolderModal,
    closeCreateFolderModal,
    handleCreateFolder,
    startRenameFolder,
    cancelRenameFolder,
    handleRenameFolder,
    handleSidebarRename,
    handleDeleteFolder,
  }
}
