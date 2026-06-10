<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import ErrorMessage from '../components/ErrorMessage.vue'
import FolderCreateModal from '../components/FolderCreateModal.vue'
import GalleryActionBar from '../components/GalleryActionBar.vue'
import GalleryFolderMoveModal from '../components/GalleryFolderMoveModal.vue'
import GalleryGrid from '../components/GalleryGrid.vue'
import GallerySidebar from '../components/GallerySidebar.vue'
import GalleryToast from '../components/GalleryToast.vue'
import { useFavorites } from '../composables/useFavorites.js'
import {
  createCollection,
  deleteCollection,
  fetchMyCollections,
  moveGenerationToCollection,
  moveGenerationsToCollection,
  renameCollection,
} from '../services/collection.service.js'
import {
  deleteGeneration,
  deleteGenerations,
  fetchMyGenerations,
} from '../services/generation.service.js'
import { toUserErrorMessage } from '../utils/apiError.js'
import { downloadImage } from '../utils/downloadImage.js'
import { COLLECTION_PREFIX, FOLDER_ID } from '../constants/gallery.js'

const DRAG_MIME_TYPE = 'application/x-emoticon-ids'
const PAGE_LIMIT = 12
const COLLECTION_NAME_MAX_LENGTH = 50
const TOAST_DURATION_MS = 3000

const collections = ref([])
const uncategorizedCount = ref(0)

const selectedFolderId = ref(FOLDER_ID.ALL)
const items = ref([])
const page = ref(1)
const hasMore = ref(false)
const total = ref(0)

const isLoading = ref(false)
const isLoadingMore = ref(false)
const errorMessage = ref('')
const deleteErrorMessage = ref('')
const folderActionErrorMessage = ref('')

const deletingId = ref('')
const movingIds = ref([])

const selectionMode = ref(false)
const selectedIds = ref([])
const draggedImageId = ref('')
const isDragging = ref(false)
const dragOverFolderId = ref('')

const showCreateFolderModal = ref(false)
const isCreatingFolder = ref(false)
const isRenamingFolder = ref(false)
const isEditingFolderName = ref(false)
const editFolderName = ref('')

const sortOrder = ref('newest')
const viewMode = ref('grid')

const toastMessage = ref('')
const toastVisible = ref(false)
let toastTimerId = null

const showFolderMoveModal = ref(false)
const isBulkDownloading = ref(false)
const isBulkDeleting = ref(false)

const { favoriteIds, favoriteCount, toggleFavorite, filterFavoriteItems } =
  useFavorites()

const totalImageCount = computed(
  () =>
    uncategorizedCount.value +
    collections.value.reduce(
      (sum, collection) => sum + (collection.itemCount ?? 0),
      0
    )
)

const selectedCount = computed(() => selectedIds.value.length)

const activeCollection = computed(() =>
  selectedFolderId.value.startsWith(COLLECTION_PREFIX)
    ? collections.value.find(
        (collection) =>
          collection.id === selectedFolderId.value.slice(COLLECTION_PREFIX.length)
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

const folderItemCount = computed(() => {
  if (selectedFolderId.value === FOLDER_ID.ALL) return totalImageCount.value
  if (selectedFolderId.value === FOLDER_ID.FAVORITE) return favoriteCount.value
  if (selectedFolderId.value === FOLDER_ID.UNCATEGORIZED) return uncategorizedCount.value
  if (activeCollection.value) return activeCollection.value.itemCount ?? 0
  return total.value
})

const sortedItems = computed(() => {
  const list = [...items.value]

  if (sortOrder.value === 'oldest') {
    return list.reverse()
  }

  if (sortOrder.value === 'name') {
    return list.sort((a, b) => {
      const nameA = [a.emotion, a.motion, a.inputText]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      const nameB = [b.emotion, b.motion, b.inputText]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return nameA.localeCompare(nameB, 'ko')
    })
  }

  return list
})

const displayItems = computed(() => {
  if (selectedFolderId.value !== FOLDER_ID.FAVORITE) {
    return sortedItems.value
  }
  return filterFavoriteItems(sortedItems.value)
})

/**
 * 현재 화면에 렌더링 중인 이미지 목록.
 * displayItems(정렬·즐겨찾기 필터 반영)와 동일하며,
 * 전체 선택·일괄 다운로드는 DB 전체가 아닌 이 목록 기준으로 동작합니다.
 */
const visibleGenerations = computed(() => displayItems.value)

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

const hasAnyImages = computed(
  () => totalImageCount.value > 0 || items.value.length > 0
)

const isInitialLoading = () => isLoading.value && items.value.length === 0
const isEmpty = () =>
  !isLoading.value && !errorMessage.value && displayItems.value.length === 0
const isSuccess = () =>
  !isLoading.value && !errorMessage.value && displayItems.value.length > 0

const dropEnabled = computed(() => isDragging.value)

/**
 * selectedFolderId를 GET /api/generations/me 의 collectionId 쿼리값으로 변환합니다.
 * - 'uncategorized' → 'uncategorized'
 * - 'collection:{uuid}' → uuid
 * - 'all' / 'favorite' → undefined (서버가 전체 목록 반환)
 */
function resolveCollectionIdForFetch() {
  if (selectedFolderId.value === FOLDER_ID.UNCATEGORIZED) return FOLDER_ID.UNCATEGORIZED
  if (selectedFolderId.value.startsWith(COLLECTION_PREFIX)) {
    return selectedFolderId.value.slice(COLLECTION_PREFIX.length)
  }
  return undefined
}

function showToast(message) {
  toastMessage.value = message
  toastVisible.value = true

  if (toastTimerId) {
    clearTimeout(toastTimerId)
  }

  toastTimerId = setTimeout(() => {
    toastVisible.value = false
  }, TOAST_DURATION_MS)
}

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
    })

    items.value = append ? [...items.value, ...result.items] : result.items
    page.value = result.page
    hasMore.value = Boolean(result.hasMore)
    total.value = result.total ?? items.value.length
  } catch (err) {
    if (!append) {
      items.value = []
      hasMore.value = false
      total.value = 0
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

function selectFolder(folderId) {
  if (folderId.startsWith(COLLECTION_PREFIX) || folderId === FOLDER_ID.UNCATEGORIZED) {
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
      (item) => item.id === selectedFolderId.value.slice(COLLECTION_PREFIX.length)
    )
    editFolderName.value = collection?.name ?? ''
  }

  loadImages({ nextPage: 1, append: false })
}

function toggleSelectionMode() {
  selectionMode.value = !selectionMode.value
  if (!selectionMode.value) {
    clearSelection()
  }
}

function clearSelection() {
  selectedIds.value = []
  dragOverFolderId.value = ''
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

  const dragIds = selectedIds.value.includes(id)
    ? [...selectedIds.value]
    : [id]

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

function handleFolderDragEnter(folderId) {
  if (!isDragging.value) return
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

async function handleFolderDrop({ folderId, event }) {
  dragOverFolderId.value = ''

  if (!isDragging.value) return

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
    collections.value.find((item) => item.id === folderId) ?? activeCollection.value
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

async function handleDelete(generationId) {
  if (deletingId.value) return

  deletingId.value = generationId
  deleteErrorMessage.value = ''

  try {
    await deleteGeneration(generationId)
    items.value = items.value.filter((item) => item.id !== generationId)
    total.value = Math.max(0, total.value - 1)
    selectedIds.value = selectedIds.value.filter((id) => id !== generationId)
    await loadCollections()
  } catch (err) {
    deleteErrorMessage.value = toUserErrorMessage(
      err,
      '이모티콘 삭제에 실패했습니다. 다시 시도해 주세요.'
    )
  } finally {
    deletingId.value = ''
  }
}

function handleToggleFavorite(generationId) {
  const added = toggleFavorite(generationId)
  if (added) {
    showToast('즐겨찾기에 추가했습니다.')
  }
}

function handleRetry() {
  refreshGallery()
}

function handleLoadMore() {
  loadImages({ nextPage: page.value + 1, append: true })
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

onMounted(async () => {
  await loadCollections()
  await loadImages({ nextPage: 1, append: false })

  showToast('드래그 & 드롭으로 폴더를 이동할 수 있어요!')
})
</script>

<template>
  <section class="gallery-page gallery-page--explorer">
    <div class="gallery-page__layout">
      <GallerySidebar
        class="gallery-page__sidebar gallery-page__sidebar--desktop"
        :selected-folder-id="selectedFolderId"
        :all-count="totalImageCount"
        :favorite-count="favoriteCount"
        :uncategorized-count="uncategorizedCount"
        :custom-folders="customFolders"
        :drag-over-folder-id="dragOverFolderId"
        :drop-enabled="dropEnabled"
        @select-folder="selectFolder"
        @create-folder="openCreateFolderModal"
        @folder-drag-enter="handleFolderDragEnter"
        @folder-drag-leave="handleFolderDragLeave"
        @folder-drop="handleFolderDrop"
        @rename-folder="handleSidebarRename"
        @delete-folder="handleDeleteFolder"
      />

      <div class="gallery-page__main">
        <div class="gallery-page__mobile-folders" aria-label="폴더 선택">
          <button
            type="button"
            class="gallery-page__folder-chip"
            :class="{ 'gallery-page__folder-chip--active': selectedFolderId === FOLDER_ID.ALL }"
            @click="selectFolder(FOLDER_ID.ALL)"
          >
            전체 {{ totalImageCount }}
          </button>
          <button
            type="button"
            class="gallery-page__folder-chip"
            :class="{ 'gallery-page__folder-chip--active': selectedFolderId === FOLDER_ID.FAVORITE }"
            @click="selectFolder(FOLDER_ID.FAVORITE)"
          >
            즐겨찾기 {{ favoriteCount }}
          </button>
          <button
            type="button"
            class="gallery-page__folder-chip"
            :class="{ 'gallery-page__folder-chip--active': selectedFolderId === FOLDER_ID.UNCATEGORIZED }"
            @click="selectFolder(FOLDER_ID.UNCATEGORIZED)"
          >
            미분류 {{ uncategorizedCount }}
          </button>
          <button
            v-for="folder in customFolders"
            :key="folder.id"
            type="button"
            class="gallery-page__folder-chip"
            :class="{
              'gallery-page__folder-chip--active':
                selectedFolderId === `${COLLECTION_PREFIX}${folder.id}`,
            }"
            @click="selectFolder(folder.id)"
          >
            {{ folder.name }} {{ folder.itemCount }}
          </button>
        </div>

        <div class="gallery-page__panel">
          <header class="gallery-page__main-header">
            <div class="gallery-page__folder-info">
              <div class="gallery-page__folder-title-row">
                <span class="gallery-page__folder-icon" aria-hidden="true">📁</span>

                <template v-if="isEditingFolderName && activeCollection">
                  <input
                    v-model="editFolderName"
                    type="text"
                    class="gallery-page__folder-name-input"
                    maxlength="50"
                    :disabled="isRenamingFolder"
                    @keydown.enter.prevent="handleRenameFolder"
                  />
                </template>
                <h1 v-else class="gallery-page__folder-title">
                  {{ filterTitle }}
                </h1>

                <button
                  v-if="activeCollection && !isEditingFolderName"
                  type="button"
                  class="gallery-page__icon-btn"
                  aria-label="폴더 이름 수정"
                  @click="startRenameFolder"
                >
                  ✎
                </button>
                <template v-else-if="isEditingFolderName">
                  <button
                    type="button"
                    class="gallery-page__icon-btn"
                    :disabled="isRenamingFolder"
                    @click="handleRenameFolder"
                  >
                    저장
                  </button>
                  <button
                    type="button"
                    class="gallery-page__icon-btn"
                    :disabled="isRenamingFolder"
                    @click="cancelRenameFolder"
                  >
                    취소
                  </button>
                </template>

                <span class="gallery-page__folder-count">{{ folderItemCount }}개</span>
              </div>

              <p class="gallery-page__folder-desc">{{ filterDescription }}</p>
            </div>

            <div class="gallery-page__controls">
              <button
                type="button"
                class="gallery-page__control-btn"
                :class="{ 'gallery-page__control-btn--active': selectionMode }"
                @click="toggleSelectionMode"
              >
                {{ selectionMode ? '선택 취소' : '선택' }}
              </button>

              <label class="gallery-page__sort">
                <span class="gallery-page__sort-label">정렬:</span>
                <select v-model="sortOrder" class="gallery-page__sort-select">
                  <option value="newest">최신순</option>
                  <option value="oldest">오래된순</option>
                  <option value="name">이름순</option>
                </select>
              </label>

              <div class="gallery-page__view-toggle" role="group" aria-label="보기 전환">
                <button
                  type="button"
                  class="gallery-page__view-btn"
                  :class="{ 'gallery-page__view-btn--active': viewMode === 'grid' }"
                  aria-label="그리드 보기"
                  @click="viewMode = 'grid'"
                >
                  ▦
                </button>
                <button
                  type="button"
                  class="gallery-page__view-btn"
                  :class="{ 'gallery-page__view-btn--active': viewMode === 'list' }"
                  aria-label="리스트 보기"
                  @click="viewMode = 'list'"
                >
                  ☰
                </button>
              </div>

              <button
                v-if="activeCollection"
                type="button"
                class="gallery-page__control-btn gallery-page__control-btn--danger"
                @click="handleDeleteFolder(activeCollection.id)"
              >
                폴더 삭제
              </button>
            </div>
          </header>

          <ErrorMessage :message="folderActionErrorMessage" variant="error" />

          <GalleryActionBar
            v-if="selectionMode && !isInitialLoading() && !errorMessage"
            :selected-count="selectedCount"
            :is-all-visible-selected="isAllVisibleSelected"
            :has-visible-items="visibleGenerations.length > 0"
            :bulk-downloading="isBulkDownloading"
            :bulk-deleting="isBulkDeleting"
            @folder-move="openFolderMoveModal"
            @delete="handleBulkDelete"
            @download="handleBulkDownload"
            @toggle-select-all="toggleSelectAllVisible"
          />

          <p
            v-if="isInitialLoading()"
            class="gallery-page__loading-text"
            role="status"
            aria-live="polite"
          >
            이모티콘 목록을 불러오는 중입니다...
          </p>

          <GalleryGrid v-if="isInitialLoading()" :loading="true" />

          <div v-else-if="errorMessage" class="gallery-page__error">
            <ErrorMessage :message="errorMessage" variant="error" />
            <button type="button" class="gallery-page__retry-btn" @click="handleRetry">
              다시 시도
            </button>
          </div>

          <div v-else-if="!hasAnyImages" class="gallery-page__empty">
            <p class="gallery-page__empty-text">
              아직 생성한 이모티콘이 없습니다.
            </p>
            <RouterLink to="/generate" class="gallery-page__create-link">
              이모티콘 만들러 가기
            </RouterLink>
          </div>

          <div v-else-if="isEmpty()" class="gallery-page__empty">
            <p class="gallery-page__empty-text">
              {{
                selectedFolderId === FOLDER_ID.FAVORITE
                  ? '즐겨찾기한 이미지가 없습니다. 카드의 별 아이콘을 눌러 추가해 보세요.'
                  : selectedFolderId === FOLDER_ID.UNCATEGORIZED
                    ? '미분류 이미지가 없습니다.'
                    : '이 폴더가 비어 있습니다. 다른 폴더에서 이미지를 끌어다 놓아 보세요.'
              }}
            </p>
          </div>

          <template v-else-if="isSuccess()">
            <ErrorMessage
              v-if="deleteErrorMessage"
              :message="deleteErrorMessage"
              variant="error"
            />

            <GalleryGrid
              :items="displayItems"
              :collection-name-by-id="collectionNameById"
              :selection-mode="selectionMode"
              :selected-ids="selectedIds"
              :deleting-id="deletingId"
              :moving-ids="movingIds"
              :dragging-id="draggedImageId"
              :favorite-ids="favoriteIds"
              :view-mode="viewMode"
              @delete="handleDelete"
              @toggle-select="toggleSelect"
              @drag-start="handleCardDragStart"
              @drag-end="handleCardDragEnd"
              @toggle-favorite="handleToggleFavorite"
            />

            <p class="gallery-page__item-count">{{ displayItems.length }}개 항목</p>

            <div v-if="hasMore && selectedFolderId !== FOLDER_ID.FAVORITE" class="gallery-page__load-more">
              <button
                type="button"
                class="gallery-page__load-more-btn"
                :disabled="isLoadingMore"
                @click="handleLoadMore"
              >
                {{ isLoadingMore ? '불러오는 중...' : '더 보기' }}
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>

    <FolderCreateModal
      :open="showCreateFolderModal"
      :existing-names="existingFolderNames"
      :loading="isCreatingFolder"
      @close="closeCreateFolderModal"
      @create="handleCreateFolder"
    />

    <GalleryFolderMoveModal
      :open="showFolderMoveModal"
      :folders="customFolders"
      :selected-count="selectedCount"
      :loading="movingIds.length > 0"
      @close="closeFolderMoveModal"
      @move="handleFolderMoveSelect"
    />

    <GalleryToast :message="toastMessage" :visible="toastVisible" />
  </section>
</template>

<style scoped>
.gallery-page--explorer {
  width: 100%;
  min-height: 100%;
  padding: 24px 20px 40px;
  background: #f7f4ff;
  box-sizing: border-box;
}

.gallery-page__layout {
  display: grid;
  grid-template-columns: minmax(280px, 300px) minmax(0, 1fr);
  gap: 20px;
  width: min(1280px, 100%);
  margin-inline: auto;
}

.gallery-page__main {
  min-width: 0;
}

.gallery-page__panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 22px;
  border: 1px solid #e8e2f8;
  border-radius: 22px;
  background: #ffffff;
  box-shadow: 0 14px 35px rgba(80, 60, 160, 0.08);
  box-sizing: border-box;
}

.gallery-page__main-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.gallery-page__folder-info {
  min-width: 0;
}

.gallery-page__folder-title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.gallery-page__folder-icon {
  font-size: 22px;
}

.gallery-page__folder-title {
  margin: 0;
  font-size: clamp(24px, 3vw, 32px);
  font-weight: 800;
  color: #111827;
}

.gallery-page__folder-name-input {
  min-width: 180px;
  min-height: 42px;
  padding: 8px 12px;
  border: 1px solid #e8e2f8;
  border-radius: 10px;
  background: #fbf8ff;
  font: inherit;
  font-size: 18px;
  font-weight: 700;
}

.gallery-page__folder-count {
  padding: 4px 10px;
  border-radius: 999px;
  background: #f1ebff;
  color: #6d3df2;
  font-size: 13px;
  font-weight: 700;
}

.gallery-page__folder-desc {
  margin: 8px 0 0;
  font-size: 14px;
  color: #7c86a3;
}

.gallery-page__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.gallery-page__control-btn,
.gallery-page__retry-btn,
.gallery-page__load-more-btn,
.gallery-page__create-link {
  min-height: 40px;
  padding: 8px 14px;
  border: 1px solid #e8e2f8;
  border-radius: 12px;
  background: #ffffff;
  color: #111827;
  font-family: var(--sans);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
}

.gallery-page__control-btn--active {
  border-color: #6d3df2;
  background: #f2ecff;
  color: #6d3df2;
}

.gallery-page__control-btn--danger {
  color: #ff4d6d;
  border-color: #ffc9d3;
  background: #fff5f7;
}

.gallery-page__sort {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.gallery-page__sort-label {
  font-size: 14px;
  color: #7c86a3;
}

.gallery-page__sort-select {
  min-height: 40px;
  padding: 8px 12px;
  border: 1px solid #e8e2f8;
  border-radius: 12px;
  background: #fbf8ff;
  color: #111827;
  font: inherit;
  font-size: 14px;
}

.gallery-page__view-toggle {
  display: inline-flex;
  border: 1px solid #e8e2f8;
  border-radius: 12px;
  overflow: hidden;
}

.gallery-page__view-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: #ffffff;
  color: #7c86a3;
  font-size: 16px;
  cursor: pointer;
}

.gallery-page__view-btn--active {
  background: #f2ecff;
  color: #6d3df2;
}

.gallery-page__icon-btn {
  min-height: 34px;
  padding: 6px 10px;
  border: 1px solid #e8e2f8;
  border-radius: 10px;
  background: #fbf8ff;
  color: #6d3df2;
  font-family: var(--sans);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.gallery-page__loading-text {
  margin: 0;
  text-align: center;
  font-size: 14px;
  color: #7c86a3;
}

.gallery-page__error,
.gallery-page__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 32px 16px;
  border: 1px dashed #ddd2ff;
  border-radius: 18px;
  background: #fbf8ff;
  text-align: center;
}

.gallery-page__empty-text {
  margin: 0;
  font-size: 15px;
  line-height: 1.5;
  color: #111827;
}

.gallery-page__create-link {
  color: #6d3df2;
  background: #f1ebff;
  border-color: transparent;
}

.gallery-page__item-count {
  margin: 0;
  text-align: center;
  font-size: 14px;
  color: #7c86a3;
}

.gallery-page__load-more {
  display: flex;
  justify-content: center;
}

.gallery-page__load-more-btn,
.gallery-page__retry-btn {
  color: #6d3df2;
  background: #f1ebff;
  border-color: transparent;
}

.gallery-page__mobile-folders {
  display: none;
  gap: 8px;
  margin-bottom: 12px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.gallery-page__folder-chip {
  flex-shrink: 0;
  min-height: 38px;
  padding: 8px 14px;
  border: 1px solid #e8e2f8;
  border-radius: 999px;
  background: #ffffff;
  color: #111827;
  font-family: var(--sans);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}

.gallery-page__folder-chip--active {
  border-color: #6d3df2;
  background: #f2ecff;
  color: #6d3df2;
}

@media (max-width: 960px) {
  .gallery-page__layout {
    grid-template-columns: 1fr;
  }

  .gallery-page__sidebar--desktop {
    display: none;
  }

  .gallery-page__mobile-folders {
    display: flex;
  }
}

@media (max-width: 640px) {
  .gallery-page--explorer {
    padding: 16px 12px 28px;
  }

  .gallery-page__panel {
    padding: 16px;
  }

  .gallery-page__controls {
    width: 100%;
    justify-content: flex-start;
  }

  .gallery-page__control-btn,
  .gallery-page__sort-select {
    width: 100%;
  }

  .gallery-page__view-toggle {
    width: 100%;
  }

  .gallery-page__view-btn {
    flex: 1 1 50%;
  }
}
</style>
