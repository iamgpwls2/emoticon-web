<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import CollectionFolderCard from '../components/CollectionFolderCard.vue'
import ErrorMessage from '../components/ErrorMessage.vue'
import GalleryGrid from '../components/GalleryGrid.vue'
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
  fetchMyGenerations,
} from '../services/generation.service.js'
import { toUserErrorMessage } from '../utils/apiError.js'

const DRAG_MIME_TYPE = 'application/x-emoticon-ids'
const PAGE_LIMIT = 12
const COLLECTION_NAME_MAX_LENGTH = 50

const collections = ref([])
const uncategorizedCount = ref(0)

const activeFilter = ref('uncategorized')
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
const dragOverFolderId = ref('')

const showCreateFolderForm = ref(false)
const newFolderName = ref('')
const isCreatingFolder = ref(false)
const renameFolderName = ref('')
const isRenamingFolder = ref(false)

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
  activeFilter.value.startsWith('collection:')
    ? collections.value.find(
        (collection) => collection.id === activeFilter.value.slice('collection:'.length)
      ) ?? null
    : null
)

const activeCollectionId = computed(() => activeCollection.value?.id ?? '')

const filterTitle = computed(() => {
  if (activeFilter.value === 'uncategorized') return '미분류'
  if (activeCollection.value) return activeCollection.value.name
  return '갤러리'
})

const hasAnyImages = computed(() => totalImageCount.value > 0)

const isInitialLoading = () => isLoading.value && items.value.length === 0
const isEmpty = () =>
  !isLoading.value && !errorMessage.value && items.value.length === 0
const isSuccess = () =>
  !isLoading.value && !errorMessage.value && items.value.length > 0

function resolveCollectionIdForFetch() {
  if (activeFilter.value === 'uncategorized') return 'uncategorized'
  if (activeFilter.value.startsWith('collection:')) {
    return activeFilter.value.slice('collection:'.length)
  }
  return undefined
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

function setFilter(filterKey) {
  activeFilter.value = filterKey
  page.value = 1
  deleteErrorMessage.value = ''
  folderActionErrorMessage.value = ''
  clearSelection()

  if (filterKey.startsWith('collection:')) {
    const collection = collections.value.find(
      (item) => item.id === filterKey.slice('collection:'.length)
    )
    renameFolderName.value = collection?.name ?? ''
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

function toggleSelect(generationId) {
  if (!selectionMode.value) return

  if (selectedIds.value.includes(generationId)) {
    selectedIds.value = selectedIds.value.filter((id) => id !== generationId)
  } else {
    selectedIds.value = [...selectedIds.value, generationId]
  }
}

function handleCardDragStart({ id, event }) {
  const dragIds = selectedIds.value.includes(id)
    ? [...selectedIds.value]
    : [id]

  event.dataTransfer?.setData(DRAG_MIME_TYPE, JSON.stringify(dragIds))
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
}

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

function handleFolderDragEnter(collectionId) {
  if (!selectionMode.value) return
  dragOverFolderId.value = collectionId
}

function handleFolderDragLeave(collectionId) {
  if (dragOverFolderId.value === collectionId) {
    dragOverFolderId.value = ''
  }
}

async function moveGenerationsToUncategorized(generationIds) {
  for (const generationId of generationIds) {
    await moveGenerationToCollection(generationId, null)
  }
}

async function moveSelectedGenerations(generationIds, collectionId) {
  folderActionErrorMessage.value = ''
  movingIds.value = generationIds

  try {
    if (collectionId) {
      await moveGenerationsToCollection(generationIds, collectionId)
    } else {
      await moveGenerationsToUncategorized(generationIds)
    }

    items.value = items.value.filter((item) => !generationIds.includes(item.id))
    total.value = Math.max(0, total.value - generationIds.length)
    clearSelection()
    await loadCollections()
  } catch (err) {
    folderActionErrorMessage.value = toUserErrorMessage(
      err,
      '폴더 이동에 실패했습니다. 다시 시도해 주세요.'
    )
  } finally {
    movingIds.value = []
  }
}

async function handleDropOnFolder(collectionId, event) {
  dragOverFolderId.value = ''

  if (!selectionMode.value) return

  const generationIds = parseDraggedIds(event)
  if (generationIds.length === 0) return

  await moveSelectedGenerations(generationIds, collectionId)
}

async function handleDropOnUncategorized(event) {
  dragOverFolderId.value = ''

  if (!selectionMode.value) return

  event.preventDefault()
  const generationIds = parseDraggedIds(event)
  if (generationIds.length === 0) return

  await moveSelectedGenerations(generationIds, null)
}

function handleUncategorizedDragEnter() {
  if (!selectionMode.value) return
  dragOverFolderId.value = 'uncategorized'
}

function handleUncategorizedDragOver(event) {
  if (!selectionMode.value) return
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

function handleUncategorizedDragLeave() {
  if (dragOverFolderId.value === 'uncategorized') {
    dragOverFolderId.value = ''
  }
}

function openCreateFolderForm() {
  showCreateFolderForm.value = true
  newFolderName.value = ''
  folderActionErrorMessage.value = ''
}

function closeCreateFolderForm() {
  showCreateFolderForm.value = false
  newFolderName.value = ''
}

async function handleCreateFolder() {
  const trimmedName = newFolderName.value.trim()
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
    closeCreateFolderForm()
  } catch (err) {
    folderActionErrorMessage.value = toUserErrorMessage(
      err,
      '폴더를 만들지 못했습니다. 다시 시도해 주세요.'
    )
  } finally {
    isCreatingFolder.value = false
  }
}

async function handleRenameFolder() {
  if (!activeCollectionId.value || isRenamingFolder.value) return

  const trimmedName = renameFolderName.value.trim()
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
    renameFolderName.value = updated.name
  } catch (err) {
    folderActionErrorMessage.value = toUserErrorMessage(
      err,
      '폴더 이름을 변경하지 못했습니다. 다시 시도해 주세요.'
    )
  } finally {
    isRenamingFolder.value = false
  }
}

async function handleDeleteFolder() {
  if (!activeCollection.value) return

  const itemCount = activeCollection.value.itemCount ?? 0
  const message =
    itemCount > 0
      ? `「${activeCollection.value.name}」 폴더를 삭제할까요?\n\n이미지 ${itemCount}개는 미분류로 이동합니다.`
      : `「${activeCollection.value.name}」 폴더를 삭제할까요?`

  if (!window.confirm(message)) return

  const deleteImagesToo = window.confirm(
    '폴더 안 이미지도 함께 삭제할까요?\n취소를 누르면 이미지는 미분류로만 이동합니다.'
  )

  folderActionErrorMessage.value = ''

  try {
    await deleteCollection(activeCollection.value.id, {
      cascade: deleteImagesToo,
    })
    activeFilter.value = 'uncategorized'
    await refreshGallery()
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

function handleRetry() {
  refreshGallery()
}

function handleLoadMore() {
  loadImages({ nextPage: page.value + 1, append: true })
}

onMounted(async () => {
  await loadCollections()

  if (uncategorizedCount.value === 0 && collections.value.length > 0) {
    const firstCollection = collections.value[0]
    activeFilter.value = `collection:${firstCollection.id}`
    renameFolderName.value = firstCollection.name
  }

  await loadImages({ nextPage: 1, append: false })
})
</script>

<template>
  <section class="gallery-page">
    <div class="gallery-page__card">
      <header class="gallery-page__header">
        <h1>내 이모티콘 갤러리</h1>
        <p class="gallery-page__lead">
          생성한 이모티콘을 폴더로 정리할 수 있습니다.
          <span v-if="hasAnyImages" class="gallery-page__count">
            총 {{ totalImageCount }}개
          </span>
        </p>
      </header>

      <template v-if="hasAnyImages">
        <div class="gallery-page__toolbar">
          <button
            type="button"
            class="gallery-page__toolbar-btn"
            :class="{ 'gallery-page__toolbar-btn--active': selectionMode }"
            @click="toggleSelectionMode"
          >
            {{ selectionMode ? '선택 취소' : '이미지 선택' }}
          </button>

          <button
            type="button"
            class="gallery-page__toolbar-btn gallery-page__toolbar-btn--primary"
            @click="openCreateFolderForm"
          >
            폴더 만들기
          </button>
        </div>

        <p
          v-if="selectionMode"
          class="gallery-page__selection-hint"
          role="status"
        >
          <template v-if="selectedCount > 0">
            {{ selectedCount }}개 선택됨 — 폴더로 끌어다 놓으면 이동합니다.
          </template>
          <template v-else>
            이동할 이미지를 선택한 뒤, 폴더로 끌어다 놓으세요.
          </template>
        </p>

        <form
          v-if="showCreateFolderForm"
          class="gallery-page__create-folder"
          @submit.prevent="handleCreateFolder"
        >
          <label for="new-folder-name" class="gallery-page__create-label">
            새 폴더 이름
          </label>
          <div class="gallery-page__create-row">
            <input
              id="new-folder-name"
              v-model="newFolderName"
              type="text"
              class="gallery-page__create-input"
              maxlength="50"
              placeholder="예: 토끼 이모티콘"
              :disabled="isCreatingFolder"
            />
            <button
              type="submit"
              class="gallery-page__create-btn"
              :disabled="isCreatingFolder || !newFolderName.trim()"
            >
              {{ isCreatingFolder ? '만드는 중...' : '만들기' }}
            </button>
            <button
              type="button"
              class="gallery-page__cancel-btn"
              :disabled="isCreatingFolder"
              @click="closeCreateFolderForm"
            >
              취소
            </button>
          </div>
        </form>

        <ErrorMessage :message="folderActionErrorMessage" variant="error" />

        <div class="gallery-page__folder-strip">
          <button
            type="button"
            class="gallery-page__filter-btn"
            :class="{
              'gallery-page__filter-btn--active': activeFilter === 'uncategorized',
              'gallery-page__filter-btn--drop-highlight':
                dragOverFolderId === 'uncategorized',
            }"
            @click="setFilter('uncategorized')"
            @dragover="handleUncategorizedDragOver"
            @dragenter.prevent="handleUncategorizedDragEnter"
            @dragleave="handleUncategorizedDragLeave"
            @drop="handleDropOnUncategorized"
          >
            미분류
            <span class="gallery-page__filter-count">{{ uncategorizedCount }}</span>
          </button>

          <CollectionFolderCard
            v-for="collection in collections"
            :key="collection.id"
            :name="collection.name"
            :item-count="collection.itemCount ?? 0"
            :cover-image-url="collection.coverImageUrl || ''"
            :active="activeFilter === `collection:${collection.id}`"
            :drop-enabled="selectionMode"
            :drop-highlight="dragOverFolderId === collection.id"
            @open="setFilter(`collection:${collection.id}`)"
            @drag-enter="handleFolderDragEnter(collection.id)"
            @drag-leave="handleFolderDragLeave(collection.id)"
            @drop="handleDropOnFolder(collection.id, $event)"
          />
        </div>

        <div
          v-if="activeCollection"
          class="gallery-page__folder-manage"
        >
          <div class="gallery-page__rename-row">
            <input
              v-model="renameFolderName"
              type="text"
              class="gallery-page__rename-input"
              maxlength="50"
              :disabled="isRenamingFolder"
            />
            <button
              type="button"
              class="gallery-page__rename-btn"
              :disabled="isRenamingFolder || !renameFolderName.trim()"
              @click="handleRenameFolder"
            >
              {{ isRenamingFolder ? '변경 중...' : '이름 변경' }}
            </button>
          </div>
          <button
            type="button"
            class="gallery-page__delete-folder-btn"
            @click="handleDeleteFolder"
          >
            폴더 삭제
          </button>
        </div>
      </template>

      <h2 class="gallery-page__section-title">{{ filterTitle }}</h2>

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
        <button
          type="button"
          class="gallery-page__retry-btn"
          @click="handleRetry"
        >
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
            activeFilter === 'uncategorized'
              ? '미분류 이미지가 없습니다. 폴더를 열어 내용을 확인해 보세요.'
              : '이 폴더가 비어 있습니다. 미분류에서 이미지를 선택해 끌어다 놓으세요.'
          }}
        </p>
        <button
          v-if="activeFilter !== 'uncategorized'"
          type="button"
          class="gallery-page__retry-btn"
          @click="setFilter('uncategorized')"
        >
          미분류 보기
        </button>
      </div>

      <template v-else-if="isSuccess()">
        <ErrorMessage
          v-if="deleteErrorMessage"
          :message="deleteErrorMessage"
          variant="error"
        />

        <GalleryGrid
          :items="items"
          :selection-mode="selectionMode"
          :selected-ids="selectedIds"
          :deleting-id="deletingId"
          :moving-ids="movingIds"
          @delete="handleDelete"
          @toggle-select="toggleSelect"
          @drag-start="handleCardDragStart"
        />

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
  </section>
</template>

<style scoped>
.gallery-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-grow: 1;
  width: 100%;
  box-sizing: border-box;
  padding: 32px 20px;
  text-align: left;
}

.gallery-page__card {
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

@media (min-width: 641px) {
  .gallery-page__card {
    max-width: 960px;
  }
}

.gallery-page__header h1 {
  margin: 0 0 12px;
  font-size: 36px;
  text-align: center;
  color: var(--text-h);
}

.gallery-page__lead {
  margin: 0;
  text-align: center;
  line-height: 1.5;
  color: var(--text);
}

.gallery-page__count {
  display: block;
  margin-top: 6px;
  font-size: 14px;
}

.gallery-page__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  width: 100%;
}

.gallery-page__toolbar-btn {
  flex: 1 1 140px;
  min-height: 44px;
  padding: 10px 16px;
  border: 1px solid var(--border);
  border-radius: 10px;
  font-family: var(--sans);
  font-size: 15px;
  font-weight: 500;
  color: var(--text-h);
  background: var(--bg);
  cursor: pointer;
}

.gallery-page__toolbar-btn--primary {
  color: var(--accent);
  background: var(--accent-bg);
  border-color: transparent;
}

.gallery-page__toolbar-btn--active {
  border-color: #6d3df2;
  color: #6d3df2;
  background: rgba(109, 61, 242, 0.08);
}

.gallery-page__selection-hint {
  margin: 0;
  padding: 12px 14px;
  border-radius: 10px;
  font-size: 14px;
  line-height: 1.5;
  color: #6d3df2;
  background: rgba(109, 61, 242, 0.08);
  border: 1px solid rgba(109, 61, 242, 0.18);
}

.gallery-page__create-folder,
.gallery-page__folder-manage {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--code-bg);
  box-sizing: border-box;
}

.gallery-page__create-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-h);
}

.gallery-page__create-row,
.gallery-page__rename-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
}

.gallery-page__create-input,
.gallery-page__rename-input {
  flex: 1 1 180px;
  min-width: 0;
  min-height: 44px;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text-h);
  font: inherit;
  font-size: 15px;
}

.gallery-page__create-btn,
.gallery-page__rename-btn,
.gallery-page__cancel-btn {
  min-height: 44px;
  padding: 10px 16px;
  border-radius: 8px;
  font-family: var(--sans);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

.gallery-page__create-btn,
.gallery-page__rename-btn {
  color: var(--accent);
  background: var(--accent-bg);
  border: 2px solid transparent;
}

.gallery-page__cancel-btn {
  color: var(--text-h);
  background: var(--bg);
  border: 1px solid var(--border);
}

.gallery-page__folder-strip {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  width: 100%;
}

@media (min-width: 641px) {
  .gallery-page__folder-strip {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 16px;
  }
}

.gallery-page__filter-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 52px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
  font-family: var(--sans);
  font-size: 15px;
  font-weight: 600;
  color: var(--text-h);
  background: var(--bg);
  cursor: pointer;
}

.gallery-page__filter-btn--active {
  border-color: #6d3df2;
  background: rgba(109, 61, 242, 0.08);
  color: #6d3df2;
}

.gallery-page__filter-btn--drop-highlight {
  border-color: #6d3df2;
  box-shadow: 0 0 0 3px rgba(109, 61, 242, 0.18);
}

.gallery-page__filter-count {
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
}

.gallery-page__section-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-h);
}

.gallery-page__delete-folder-btn {
  align-self: flex-start;
  min-height: 40px;
  padding: 8px 14px;
  border: 1px solid rgba(220, 38, 38, 0.35);
  border-radius: 8px;
  font-family: var(--sans);
  font-size: 14px;
  font-weight: 500;
  color: #dc2626;
  background: rgba(220, 38, 38, 0.08);
  cursor: pointer;
}

.gallery-page__loading-text {
  margin: 0;
  text-align: center;
  font-size: 14px;
  color: var(--text);
}

.gallery-page__error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.gallery-page__retry-btn,
.gallery-page__load-more-btn {
  width: 100%;
  max-width: 320px;
  min-height: 44px;
  font-family: var(--sans);
  font-size: 16px;
  font-weight: 500;
  line-height: 1.4;
  padding: 10px 16px;
  border: 2px solid transparent;
  border-radius: 8px;
  color: var(--accent);
  background: var(--accent-bg);
  cursor: pointer;
}

.gallery-page__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
  padding: 32px 16px;
  border: 1px dashed var(--border);
  border-radius: 12px;
  background: var(--code-bg);
  box-sizing: border-box;
  text-align: center;
}

.gallery-page__empty-text {
  margin: 0;
  font-size: 15px;
  line-height: 1.5;
  color: var(--text-h);
}

.gallery-page__create-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 10px 18px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  text-decoration: none;
  color: var(--accent);
  background: var(--accent-bg);
  border: 2px solid transparent;
}

.gallery-page__load-more {
  display: flex;
  justify-content: center;
  width: 100%;
  padding-top: 4px;
}

@media (max-width: 480px) {
  .gallery-page {
    padding: 24px 16px;
  }

  .gallery-page__card {
    max-width: 100%;
    gap: 16px;
  }

  .gallery-page__header h1 {
    font-size: 28px;
  }

  .gallery-page__toolbar-btn,
  .gallery-page__retry-btn,
  .gallery-page__load-more-btn {
    width: 100%;
    max-width: 100%;
  }

  .gallery-page__create-row,
  .gallery-page__rename-row {
    flex-direction: column;
  }

  .gallery-page__create-btn,
  .gallery-page__rename-btn,
  .gallery-page__cancel-btn {
    width: 100%;
  }
}
</style>
