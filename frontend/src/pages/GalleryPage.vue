<script setup>
import { onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import ErrorMessage from '../components/ErrorMessage.vue'
import DeleteConfirmModal from '../components/DeleteConfirmModal.vue'
import FolderCreateModal from '../components/FolderCreateModal.vue'
import FolderRenameModal from '../components/FolderRenameModal.vue'
import GalleryActionBar from '../components/GalleryActionBar.vue'
import GalleryFolderMoveModal from '../components/GalleryFolderMoveModal.vue'
import GalleryGrid from '../components/GalleryGrid.vue'
import GallerySidebar from '../components/GallerySidebar.vue'
import GalleryToast from '../components/GalleryToast.vue'
import { useAuth } from '../composables/useAuth.js'
import { useGalleryData } from '../composables/useGalleryData.js'
import { useGalleryDisplay } from '../composables/useGalleryDisplay.js'
import { useGalleryFolders } from '../composables/useGalleryFolders.js'
import { useGallerySelection } from '../composables/useGallerySelection.js'
import { useGalleryToast } from '../composables/useGalleryToast.js'
import { useFavorites } from '../composables/useFavorites.js'
import { COLLECTION_PREFIX, FOLDER_ID } from '../constants/gallery.js'
import { deleteGeneration } from '../services/generation.service.js'
import { toUserErrorMessage } from '../utils/apiError.js'

const collections = ref([])
const uncategorizedCount = ref(0)

const selectedFolderId = ref(FOLDER_ID.ALL)

const deleteErrorMessage = ref('')
const folderActionErrorMessage = ref('')

const deletingId = ref('')

const deleteModalOpen = ref(false)
const deleteModalTitle = ref('')
const deleteModalDescription = ref('')
const deleteModalLoading = ref(false)
const deleteModalError = ref('')
const deleteModalShowCascade = ref(false)
const deleteModalCascade = ref(false)
const pendingDeleteAction = ref(null)

const showRenameFolderModal = ref(false)
const renameFolderId = ref('')
const renameFolderCurrentName = ref('')
const renameModalError = ref('')

const { isAuthReady, isAuthenticated, accessToken, user } = useAuth()

const {
  favoriteCount,
  togglingIds,
  favoriteError,
  toggleFavorite,
  loadFavoriteCount,
  syncFavoriteCountFromTotal,
  clearFavoriteError,
} = useFavorites()

const { toastMessage, toastVisible, showToast } = useGalleryToast()

let loadCollectionsBridge = async () => {}
let resetExternalBridge = () => {}
let galleryLoadGeneration = 0

const {
  items,
  page,
  hasMore,
  total,
  allFolderTotal,
  isLoading,
  isLoadingMore,
  errorMessage,
  lastLoadedUserId,
  adjustCountsAfterDelete,
  loadImages,
  refreshGallery,
  resetGalleryState,
} = useGalleryData({
  selectedFolderId,
  collections,
  uncategorizedCount,
  loadCollections: () => loadCollectionsBridge(),
  onResetStart: () => {
    galleryLoadGeneration += 1
  },
  onResetExternal: () => resetExternalBridge(),
  onFavoriteTotalLoaded: syncFavoriteCountFromTotal,
})

let exitSelectionModeBridge = () => {}

const {
  movingIds,
  dragOverFolderId,
  showCreateFolderModal,
  isCreatingFolder,
  isRenamingFolder,
  totalImageCount,
  activeCollection,
  customFolders,
  collectionNameById,
  existingFolderNames,
  loadCollections,
  selectFolder,
  handleFolderDrop: handleFolderDropCore,
  handleFolderDragEnter: handleFolderDragEnterCore,
  handleFolderDragLeave,
  openCreateFolderModal,
  closeCreateFolderModal,
  handleCreateFolder,
  renameFolderById,
  getFolderDeleteInfo,
  executeDeleteFolder,
  moveSelectedGenerations,
  resetFolderUiState,
} = useGalleryFolders({
  items,
  total,
  page,
  selectedFolderId,
  deleteErrorMessage,
  folderActionErrorMessage,
  showToast,
  refreshGallery,
  loadImages,
  exitSelectionMode: () => exitSelectionModeBridge(),
  collections,
  uncategorizedCount,
  allFolderTotal,
})

loadCollectionsBridge = loadCollections

const {
  viewMode,
  displayItems,
  visibleGenerations,
  filterTitle,
  filterDescription,
  folderItemCount,
  hasAnyImages,
  isInitialLoading,
  isEmpty,
  isSuccess,
} = useGalleryDisplay({
  items,
  selectedFolderId,
  activeCollection,
  allFolderTotal,
  isAuthReady,
  isLoading,
  errorMessage,
})

const {
  selectionMode,
  selectedIds,
  draggedImageId,
  isDragging,
  showFolderMoveModal,
  isBulkDownloading,
  isBulkDeleting,
  selectedCount,
  isAllVisibleSelected,
  dropEnabled,
  exitSelectionMode,
  toggleSelectionMode,
  toggleSelectAllVisible,
  toggleSelect,
  handleCardDragStart,
  handleCardDragEnd,
  openFolderMoveModal,
  closeFolderMoveModal,
  handleFolderMoveSelect,
  executeBulkDelete,
  handleBulkDownload,
  removeFromSelection,
  resetSelectionState,
} = useGallerySelection({
  items,
  total,
  visibleGenerations,
  deleteErrorMessage,
  loadCollections,
  showToast,
  moveSelectedGenerations,
  movingIds,
  dragOverFolderId,
  adjustCountsAfterDelete,
})

exitSelectionModeBridge = exitSelectionMode

resetExternalBridge = () => {
  collections.value = []
  uncategorizedCount.value = 0
  selectedFolderId.value = FOLDER_ID.ALL
  deleteErrorMessage.value = ''
  folderActionErrorMessage.value = ''
  deletingId.value = ''
  clearFavoriteError()
  resetFolderUiState()
  resetSelectionState()
}

function handleFolderDragEnter(folderId) {
  handleFolderDragEnterCore(folderId, isDragging.value)
}

function handleFolderDrop(payload) {
  return handleFolderDropCore(payload, isDragging.value)
}

function closeDeleteModal() {
  if (deleteModalLoading.value) return
  deleteModalOpen.value = false
  deleteModalError.value = ''
  deleteModalShowCascade.value = false
  deleteModalCascade.value = false
  pendingDeleteAction.value = null
}

function openDeleteModal({ title, description, showCascadeOption = false, action }) {
  deleteModalTitle.value = title
  deleteModalDescription.value = description
  deleteModalShowCascade.value = showCascadeOption
  deleteModalCascade.value = false
  deleteModalError.value = ''
  pendingDeleteAction.value = action
  deleteModalOpen.value = true
}

function requestDeleteGeneration(generationId) {
  if (deletingId.value) return

  openDeleteModal({
    title: '이 이모티콘을 삭제할까요?',
    description: '삭제한 이모티콘은 갤러리에서 다시 볼 수 없습니다.',
    action: async () => {
      deletingId.value = generationId
      deleteErrorMessage.value = ''

      try {
        await deleteGeneration(generationId)
        items.value = items.value.filter((item) => item.id !== generationId)
        adjustCountsAfterDelete(1)
        removeFromSelection(generationId)
        await loadCollections()
        return true
      } catch (err) {
        deleteModalError.value = toUserErrorMessage(
          err,
          '이모티콘 삭제에 실패했습니다. 다시 시도해 주세요.'
        )
        return false
      } finally {
        deletingId.value = ''
      }
    },
  })
}

function requestBulkDelete() {
  if (selectedCount.value === 0 || isBulkDeleting.value) return

  const count = selectedCount.value
  openDeleteModal({
    title:
      count === 1
        ? '이 이모티콘을 삭제할까요?'
        : `선택한 이모티콘 ${count}개를 삭제할까요?`,
    description: '삭제한 이모티콘은 갤러리에서 다시 볼 수 없습니다.',
    action: async () => {
      const success = await executeBulkDelete()
      if (!success && deleteErrorMessage.value) {
        deleteModalError.value = deleteErrorMessage.value
      }
      return success
    },
  })
}

function openRenameFolderModal(folderId) {
  const folder = customFolders.value.find((item) => item.id === folderId)
  if (!folder) return

  renameFolderId.value = folderId
  renameFolderCurrentName.value = folder.name
  renameModalError.value = ''
  showRenameFolderModal.value = true
}

function closeRenameFolderModal() {
  if (isRenamingFolder.value) return

  showRenameFolderModal.value = false
  renameFolderId.value = ''
  renameFolderCurrentName.value = ''
  renameModalError.value = ''
}

async function handleRenameFolderSubmit(name) {
  renameModalError.value = ''

  const result = await renameFolderById(renameFolderId.value, name)
  if (result.success) {
    closeRenameFolderModal()
    return
  }

  if (result.error) {
    renameModalError.value = result.error
  }
}

function requestDeleteFolder(folderId) {
  const info = getFolderDeleteInfo(folderId)
  if (!info) return

  openDeleteModal({
    title: info.title,
    description: info.description,
    showCascadeOption: info.showCascadeOption,
    action: async () => {
      const success = await executeDeleteFolder(info.folderId, {
        cascade: deleteModalCascade.value,
      })
      if (!success && folderActionErrorMessage.value) {
        deleteModalError.value = folderActionErrorMessage.value
      }
      return success
    },
  })
}

async function confirmDeleteModal() {
  if (!pendingDeleteAction.value || deleteModalLoading.value) return

  deleteModalLoading.value = true
  deleteModalError.value = ''

  let success = false
  try {
    success = await pendingDeleteAction.value()
  } finally {
    deleteModalLoading.value = false
    if (success) {
      closeDeleteModal()
    }
  }
}

function isMobileDropTarget(folderId) {
  return (
    isDragging.value &&
    folderId !== FOLDER_ID.ALL &&
    folderId !== FOLDER_ID.FAVORITE
  )
}

function isMobileDropDisabled(folderId) {
  return (
    isDragging.value &&
    (folderId === FOLDER_ID.ALL || folderId === FOLDER_ID.FAVORITE)
  )
}

function handleMobileFolderDragEnter(folderId) {
  if (!isDragging.value) return
  handleFolderDragEnter(folderId)
}

function handleMobileFolderDragLeave(folderId) {
  if (!isDragging.value) return
  handleFolderDragLeave(folderId)
}

function handleMobileFolderDragOver(folderId, event) {
  if (!isDragging.value) return
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = isMobileDropTarget(folderId) ? 'move' : 'none'
  }
}

async function handleMobileFolderDrop(folderId, event) {
  await handleFolderDrop({ folderId, event })
}

async function handleToggleFavorite(generationId) {
  const item = items.value.find((entry) => entry.id === generationId)
  if (!item) return

  const previousFavorite = item.isFavorite === true
  const nextFavorite = !previousFavorite

  item.isFavorite = nextFavorite
  clearFavoriteError()

  try {
    const updatedFavorite = await toggleFavorite(generationId, previousFavorite)
    item.isFavorite = updatedFavorite

    if (updatedFavorite) {
      showToast('즐겨찾기에 추가했습니다.')
    }

    if (selectedFolderId.value === FOLDER_ID.FAVORITE && !updatedFavorite) {
      items.value = items.value.filter((entry) => entry.id !== generationId)
      total.value = Math.max(0, total.value - 1)
    }
  } catch {
    item.isFavorite = previousFavorite
    showToast(
      favoriteError.value ||
        '즐겨찾기 변경에 실패했습니다. 다시 시도해 주세요.'
    )
  }
}

function handleRetry() {
  refreshGallery()
}

function handleLoadMore() {
  loadImages({ nextPage: page.value + 1, append: true })
}

watch(
  [isAuthReady, isAuthenticated, accessToken, () => user.value?.id],
  async ([ready, authed, token, userId]) => {
    if (!ready) return

    if (!authed || !token || !userId) {
      lastLoadedUserId.value = null
      resetGalleryState()
      return
    }

    if (lastLoadedUserId.value === userId) return

    const currentGeneration = ++galleryLoadGeneration
    try {
      await Promise.all([refreshGallery(), loadFavoriteCount()])
      if (currentGeneration !== galleryLoadGeneration) return
      if (errorMessage.value) {
        console.warn('갤러리 첫 로드 실패, 재시도 가능 상태 유지')
        return
      }
      lastLoadedUserId.value = userId
    } catch {
      console.warn('갤러리 첫 로드 실패, 재시도 가능 상태 유지')
    }
  },
  { immediate: true }
)

onMounted(() => {
  showToast('드래그 & 드롭으로 폴더를 이동할 수 있어요!')
})
</script>

<template>
  <section class="gallery-page gallery-page--explorer">
    <div class="gallery-page__layout app-container">
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
        @open-rename-folder="openRenameFolderModal"
        @delete-folder="requestDeleteFolder"
      />

      <div class="gallery-page__main">
        <div class="gallery-page__mobile-folders" aria-label="폴더 선택">
          <button
            type="button"
            class="gallery-page__folder-chip"
            :class="{
              'gallery-page__folder-chip--active': selectedFolderId === FOLDER_ID.ALL,
              'gallery-page__folder-chip--drop': dragOverFolderId === FOLDER_ID.ALL,
              'gallery-page__folder-chip--drop-disabled': isMobileDropDisabled(FOLDER_ID.ALL),
            }"
            @click="selectFolder(FOLDER_ID.ALL)"
            @dragenter.prevent="handleMobileFolderDragEnter(FOLDER_ID.ALL)"
            @dragleave="handleMobileFolderDragLeave(FOLDER_ID.ALL)"
            @dragover="handleMobileFolderDragOver(FOLDER_ID.ALL, $event)"
            @drop="handleMobileFolderDrop(FOLDER_ID.ALL, $event)"
          >
            전체 {{ totalImageCount }}
          </button>
          <button
            type="button"
            class="gallery-page__folder-chip"
            :class="{
              'gallery-page__folder-chip--active': selectedFolderId === FOLDER_ID.FAVORITE,
              'gallery-page__folder-chip--drop': dragOverFolderId === FOLDER_ID.FAVORITE,
              'gallery-page__folder-chip--drop-disabled': isMobileDropDisabled(FOLDER_ID.FAVORITE),
            }"
            @click="selectFolder(FOLDER_ID.FAVORITE)"
            @dragenter.prevent="handleMobileFolderDragEnter(FOLDER_ID.FAVORITE)"
            @dragleave="handleMobileFolderDragLeave(FOLDER_ID.FAVORITE)"
            @dragover="handleMobileFolderDragOver(FOLDER_ID.FAVORITE, $event)"
            @drop="handleMobileFolderDrop(FOLDER_ID.FAVORITE, $event)"
          >
            즐겨찾기 {{ favoriteCount }}
          </button>
          <button
            type="button"
            class="gallery-page__folder-chip"
            :class="{
              'gallery-page__folder-chip--active': selectedFolderId === FOLDER_ID.UNCATEGORIZED,
              'gallery-page__folder-chip--drop': dragOverFolderId === FOLDER_ID.UNCATEGORIZED,
            }"
            @click="selectFolder(FOLDER_ID.UNCATEGORIZED)"
            @dragenter.prevent="handleMobileFolderDragEnter(FOLDER_ID.UNCATEGORIZED)"
            @dragleave="handleMobileFolderDragLeave(FOLDER_ID.UNCATEGORIZED)"
            @dragover="handleMobileFolderDragOver(FOLDER_ID.UNCATEGORIZED, $event)"
            @drop="handleMobileFolderDrop(FOLDER_ID.UNCATEGORIZED, $event)"
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
              'gallery-page__folder-chip--drop':
                dragOverFolderId === `${COLLECTION_PREFIX}${folder.id}`,
            }"
            @click="selectFolder(folder.id)"
            @dragenter.prevent="handleMobileFolderDragEnter(`${COLLECTION_PREFIX}${folder.id}`)"
            @dragleave="handleMobileFolderDragLeave(`${COLLECTION_PREFIX}${folder.id}`)"
            @dragover="handleMobileFolderDragOver(`${COLLECTION_PREFIX}${folder.id}`, $event)"
            @drop="handleMobileFolderDrop(`${COLLECTION_PREFIX}${folder.id}`, $event)"
          >
            {{ folder.name }} {{ folder.itemCount }}
          </button>
        </div>

        <div class="gallery-page__panel">
          <header class="gallery-page__main-header">
            <div class="gallery-page__folder-info">
              <div class="gallery-page__folder-title-row">
                <span class="gallery-page__folder-icon" aria-hidden="true">📁</span>
                <h1 class="gallery-page__folder-title">
                  {{ filterTitle }}
                </h1>
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
            </div>
          </header>

          <ErrorMessage :message="folderActionErrorMessage" variant="error" />

          <GalleryActionBar
            v-if="selectionMode && selectedCount > 0 && !isInitialLoading() && !errorMessage"
            :selected-count="selectedCount"
            :is-all-visible-selected="isAllVisibleSelected"
            :has-visible-items="visibleGenerations.length > 0"
            :bulk-downloading="isBulkDownloading"
            :bulk-deleting="isBulkDeleting"
            @folder-move="openFolderMoveModal"
            @delete="requestBulkDelete"
            @download="handleBulkDownload"
            @toggle-select-all="toggleSelectAllVisible"
            @clear-selection="exitSelectionMode"
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
              :toggling-ids="togglingIds"
              :view-mode="viewMode"
              @delete="requestDeleteGeneration"
              @toggle-select="toggleSelect"
              @drag-start="handleCardDragStart"
              @drag-end="handleCardDragEnd"
              @toggle-favorite="handleToggleFavorite"
            />

            <p class="gallery-page__item-count">{{ displayItems.length }}개 항목</p>

            <div v-if="hasMore" class="gallery-page__load-more">
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

    <FolderRenameModal
      :open="showRenameFolderModal"
      :current-name="renameFolderCurrentName"
      :existing-names="existingFolderNames"
      :loading="isRenamingFolder"
      :error-message="renameModalError"
      @close="closeRenameFolderModal"
      @rename="handleRenameFolderSubmit"
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

    <DeleteConfirmModal
      :open="deleteModalOpen"
      :title="deleteModalTitle"
      :description="deleteModalDescription"
      :loading="deleteModalLoading"
      :error-message="deleteModalError"
      :show-cascade-option="deleteModalShowCascade"
      v-model:cascade-checked="deleteModalCascade"
      @cancel="closeDeleteModal"
      @confirm="confirmDeleteModal"
    />
  </section>
</template>

<style scoped>
.gallery-page--explorer {
  width: 100%;
  min-height: 100%;
  padding: 24px 0 40px;
  background: #f7f4ff;
  box-sizing: border-box;
  overflow-x: hidden;
}

.gallery-page__layout {
  display: grid;
  grid-template-columns: minmax(280px, 300px) minmax(0, 1fr);
  gap: 20px;
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
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
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

.gallery-page__folder-chip--drop {
  border-color: #6d3df2;
  background: #efe7ff;
  color: #6d3df2;
  transform: scale(1.03);
  box-shadow: 0 6px 16px rgba(109, 61, 242, 0.16);
}

.gallery-page__folder-chip--drop-disabled {
  border-color: #d1d5db;
  background: #f9fafb;
  color: #9ca3af;
  transform: none;
  box-shadow: none;
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
    padding: 16px 0 28px;
  }

  .gallery-page__panel {
    padding: 16px;
  }

  .gallery-page__controls {
    width: 100%;
    justify-content: flex-start;
  }

  .gallery-page__control-btn {
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
