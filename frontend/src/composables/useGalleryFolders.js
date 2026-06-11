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
  exitSelectionMode,
  collections: collectionsRef,
  uncategorizedCount: uncategorizedCountRef,
  allFolderTotal: allFolderTotalRef,
}) {
  const movingIds = ref([])
  const dragOverFolderId = ref('')

  const showCreateFolderModal = ref(false)
  const isCreatingFolder = ref(false)
  const isRenamingFolder = ref(false)

  const collections = collectionsRef
  const uncategorizedCount = uncategorizedCountRef

  const totalImageCount = computed(() => allFolderTotalRef.value)

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
    exitSelectionMode()
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

  function isFolderDropTarget(folderId) {
    return folderId !== FOLDER_ID.ALL && folderId !== FOLDER_ID.FAVORITE
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
   * 폴더 이동 API 성공 후, 현재 선택된 폴더 뷰에 맞게 로컬 items를 갱신합니다.
   * - 전체/즐겨찾기: 목록 유지, collectionId만 갱신
   * - 미분류/컬렉션: 현재 폴더에서 벗어난 항목만 제거
   */
  function applyMoveToLocalItems(generationIds, targetCollectionId) {
    const folderId = selectedFolderId.value
    const movedCount = generationIds.length

    if (folderId === FOLDER_ID.ALL || folderId === FOLDER_ID.FAVORITE) {
      items.value = items.value.map((item) =>
        generationIds.includes(item.id)
          ? { ...item, collectionId: targetCollectionId ?? null }
          : item
      )
      return
    }

    if (folderId === FOLDER_ID.UNCATEGORIZED) {
      if (targetCollectionId) {
        items.value = items.value.filter((item) => !generationIds.includes(item.id))
        total.value = Math.max(0, total.value - movedCount)
      }
      return
    }

    if (folderId.startsWith(COLLECTION_PREFIX)) {
      const currentCollectionId = folderId.slice(COLLECTION_PREFIX.length)
      if (targetCollectionId !== currentCollectionId) {
        items.value = items.value.filter((item) => !generationIds.includes(item.id))
        total.value = Math.max(0, total.value - movedCount)
      }
    }
  }

  /**
   * 선택된 generation들을 대상 폴더로 이동하고 로컬 state를 갱신합니다.
   * API 성공 후 현재 폴더 뷰 기준으로 items·total을 맞추고,
   * loadCollections(폴더 메타) + loadImages(목록·카운트)로 사이드바·그리드를 동일 기준으로 갱신합니다.
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

      applyMoveToLocalItems(generationIds, collectionId)
      exitSelectionMode()
      page.value = 1
      await loadCollections()
      await loadImages({ nextPage: 1, append: false })

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

    if (!isFolderDropTarget(folderId)) {
      showToast('이 폴더로는 이동할 수 없습니다.')
      return false
    }

    const generationIds = parseDraggedIds(event)
    if (generationIds.length === 0) return false

    const collectionId = resolveDropFolderId(folderId)
    await moveSelectedGenerations(generationIds, collectionId)
    return true
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

  function isDuplicateFolderName(folderId, name) {
    const normalized = name.trim().toLowerCase()
    const reservedNames = ['전체 이미지', '즐겨찾기', '미분류']
    if (reservedNames.some((reserved) => reserved.toLowerCase() === normalized)) {
      return true
    }

    return collections.value.some(
      (collection) =>
        collection.id !== folderId &&
        collection.name.trim().toLowerCase() === normalized
    )
  }

  async function renameFolderById(folderId, name) {
    if (!folderId || isRenamingFolder.value) {
      return { success: false }
    }

    const trimmedName = name.trim()
    if (!trimmedName) {
      return { success: false, error: '폴더 이름을 입력해 주세요.' }
    }

    if (trimmedName.length > COLLECTION_NAME_MAX_LENGTH) {
      return {
        success: false,
        error: `폴더 이름은 최대 ${COLLECTION_NAME_MAX_LENGTH}자까지 입력할 수 있습니다.`,
      }
    }

    const collection = collections.value.find((item) => item.id === folderId)
    if (!collection) {
      return { success: false }
    }

    if (trimmedName === collection.name) {
      return { success: true }
    }

    if (isDuplicateFolderName(folderId, trimmedName)) {
      return { success: false, error: '이미 같은 이름의 폴더가 있습니다.' }
    }

    isRenamingFolder.value = true
    folderActionErrorMessage.value = ''

    try {
      const updated = await renameCollection(folderId, trimmedName)
      collections.value = collections.value.map((item) =>
        item.id === updated.id ? { ...item, ...updated } : item
      )
      showToast('폴더 이름이 변경되었습니다.')
      return { success: true }
    } catch (err) {
      return {
        success: false,
        error: toUserErrorMessage(
          err,
          '폴더 이름을 변경하지 못했습니다. 다시 시도해 주세요.'
        ),
      }
    } finally {
      isRenamingFolder.value = false
    }
  }

  function getFolderDeleteInfo(folderId) {
    const collection =
      collections.value.find((item) => item.id === folderId) ??
      activeCollection.value
    if (!collection) return null

    const itemCount = collection.itemCount ?? 0
    const title = `「${collection.name}」 폴더를 삭제할까요?`
    const description =
      itemCount > 0
        ? `이미지 ${itemCount}개는 미분류로 이동합니다.\n폴더 안 이미지도 함께 삭제할 수 있습니다.`
        : '삭제한 폴더는 복구할 수 없습니다.'

    return {
      folderId: collection.id,
      title,
      description,
      showCascadeOption: itemCount > 0,
    }
  }

  async function executeDeleteFolder(folderId, { cascade = false } = {}) {
    const collection =
      collections.value.find((item) => item.id === folderId) ??
      activeCollection.value
    if (!collection) return false

    folderActionErrorMessage.value = ''

    try {
      await deleteCollection(collection.id, { cascade })
      selectedFolderId.value = FOLDER_ID.UNCATEGORIZED
      await refreshGallery()
      showToast('폴더가 삭제되었습니다.')
      return true
    } catch (err) {
      folderActionErrorMessage.value = toUserErrorMessage(
        err,
        '폴더를 삭제하지 못했습니다. 다시 시도해 주세요.'
      )
      return false
    }
  }

  function resetFolderUiState() {
    movingIds.value = []
    dragOverFolderId.value = ''
    showCreateFolderModal.value = false
    isCreatingFolder.value = false
    isRenamingFolder.value = false
  }

  return {
    movingIds,
    dragOverFolderId,
    showCreateFolderModal,
    isCreatingFolder,
    isRenamingFolder,
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
    renameFolderById,
    getFolderDeleteInfo,
    executeDeleteFolder,
    resetFolderUiState,
  }
}
