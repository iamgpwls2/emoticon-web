<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import ErrorMessage from '../components/ErrorMessage.vue'
import FolderCreateModal from '../components/FolderCreateModal.vue'
import GalleryActionBar from '../components/GalleryActionBar.vue'
import GalleryFolderMoveModal from '../components/GalleryFolderMoveModal.vue'
import GalleryGrid from '../components/GalleryGrid.vue'
import GallerySidebar from '../components/GallerySidebar.vue'
import GalleryToast from '../components/GalleryToast.vue'
import { useAuth } from '../composables/useAuth.js'
import { useGalleryFolders } from '../composables/useGalleryFolders.js'
import { useGallerySelection } from '../composables/useGallerySelection.js'
import { useFavorites } from '../composables/useFavorites.js'
import { COLLECTION_PREFIX, FOLDER_ID } from '../constants/gallery.js'
import { deleteGeneration, fetchMyGenerations } from '../services/generation.service.js'
import { toUserErrorMessage } from '../utils/apiError.js'

const PAGE_LIMIT = 12
const TOAST_DURATION_MS = 3000

const collections = ref([])
const uncategorizedCount = ref(0)
const allFolderTotal = ref(0)

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

const sortOrder = ref('newest')
const viewMode = ref('grid')

const toastMessage = ref('')
const toastVisible = ref(false)
let toastTimerId = null

const { isAuthReady, isAuthenticated, accessToken, user } = useAuth()

const {
  favoriteIds,
  favoriteCount,
  toggleFavorite,
  filterFavoriteItems,
  clearFavorites,
} = useFavorites()

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

/**
 * selectedFolderId를 GET /api/generations/me 의 collectionId 쿼리값으로 변환합니다.
 * - 'uncategorized' → 'uncategorized'
 * - 'collection:{uuid}' → uuid
 * - 'all' / 'favorite' → undefined (서버가 전체 목록 반환)
 */
function resolveCollectionIdForFetch() {
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
    })

    items.value = append ? [...items.value, ...result.items] : result.items
    page.value = result.page
    hasMore.value = Boolean(result.hasMore)

    const fetchedTotal = result.total ?? items.value.length
    total.value = fetchedTotal
    if (!append) {
      syncFolderListCount(fetchedTotal)
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

let clearSelectionBridge = () => {}

const {
  movingIds,
  dragOverFolderId,
  showCreateFolderModal,
  isCreatingFolder,
  isRenamingFolder,
  isEditingFolderName,
  editFolderName,
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
  startRenameFolder,
  cancelRenameFolder,
  handleRenameFolder,
  handleSidebarRename,
  handleDeleteFolder,
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
  clearSelection: () => clearSelectionBridge(),
  collections,
  uncategorizedCount,
  allFolderTotal,
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

function filterItemsByFolder(list, folderId) {
  if (folderId === FOLDER_ID.ALL) {
    return list
  }

  if (folderId === FOLDER_ID.FAVORITE) {
    return filterFavoriteItems(list)
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
  filterItemsByFolder(sortedItems.value, selectedFolderId.value)
)

/**
 * 현재 화면에 렌더링 중인 이미지 목록.
 * displayItems(정렬·즐겨찾기 필터 반영)와 동일하며,
 * 전체 선택·일괄 다운로드는 DB 전체가 아닌 이 목록 기준으로 동작합니다.
 */
const visibleGenerations = computed(() => displayItems.value)

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

clearSelectionBridge = clearSelection

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

function handleFolderDragEnter(folderId) {
  handleFolderDragEnterCore(folderId, isDragging.value)
}

function handleFolderDrop(payload) {
  return handleFolderDropCore(payload, isDragging.value)
}

async function handleDelete(generationId) {
  if (deletingId.value) return

  deletingId.value = generationId
  deleteErrorMessage.value = ''

  try {
    await deleteGeneration(generationId)
    items.value = items.value.filter((item) => item.id !== generationId)
    adjustCountsAfterDelete(1)
    removeFromSelection(generationId)
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

let galleryLoadGeneration = 0
let lastLoadedUserId = null

function resetGalleryState() {
  galleryLoadGeneration += 1
  collections.value = []
  uncategorizedCount.value = 0
  allFolderTotal.value = 0
  selectedFolderId.value = FOLDER_ID.ALL
  items.value = []
  page.value = 1
  hasMore.value = false
  total.value = 0
  isLoading.value = false
  isLoadingMore.value = false
  errorMessage.value = ''
  deleteErrorMessage.value = ''
  folderActionErrorMessage.value = ''
  deletingId.value = ''
  clearFavorites()
  resetFolderUiState()
  resetSelectionState()
}

watch(
  [isAuthReady, isAuthenticated, accessToken, () => user.value?.id],
  async ([ready, authed, token, userId]) => {
    if (!ready) return

    if (!authed || !token || !userId) {
      lastLoadedUserId = null
      resetGalleryState()
      return
    }

    if (lastLoadedUserId === userId) return
    lastLoadedUserId = userId

    const currentGeneration = ++galleryLoadGeneration
    await refreshGallery()
    if (currentGeneration !== galleryLoadGeneration) return
  },
  { immediate: true }
)

onMounted(() => {
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
