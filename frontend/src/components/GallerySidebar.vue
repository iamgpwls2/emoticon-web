<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { FOLDER_ID, COLLECTION_PREFIX } from '../constants/gallery.js'

const props = defineProps({
  selectedFolderId: {
    type: String,
    required: true,
  },
  allCount: {
    type: Number,
    default: 0,
  },
  favoriteCount: {
    type: Number,
    default: 0,
  },
  uncategorizedCount: {
    type: Number,
    default: 0,
  },
  customFolders: {
    type: Array,
    default: () => [],
  },
  dragOverFolderId: {
    type: String,
    default: '',
  },
  dropEnabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'select-folder',
  'create-folder',
  'folder-drag-enter',
  'folder-drag-leave',
  'folder-drop',
  'open-rename-folder',
  'delete-folder',
])

const openMenuFolderId = ref('')

const systemFolders = [
  { id: FOLDER_ID.ALL, name: '전체 이미지', icon: '🖼️' },
  { id: FOLDER_ID.FAVORITE, name: '즐겨찾기', icon: '⭐' },
  { id: FOLDER_ID.UNCATEGORIZED, name: '미분류', icon: '📂' },
]

function getFolderCount(folderId) {
  if (folderId === FOLDER_ID.ALL) return props.allCount
  if (folderId === FOLDER_ID.FAVORITE) return props.favoriteCount
  if (folderId === FOLDER_ID.UNCATEGORIZED) return props.uncategorizedCount

  const folder = props.customFolders.find((item) => item.id === folderId)
  return folder?.itemCount ?? 0
}

function isDropTarget(folderId) {
  return (
    props.dropEnabled &&
    folderId !== FOLDER_ID.ALL &&
    folderId !== FOLDER_ID.FAVORITE
  )
}

function isDropDisabled(folderId) {
  return (
    props.dropEnabled &&
    (folderId === FOLDER_ID.ALL || folderId === FOLDER_ID.FAVORITE)
  )
}

function isFolderActive(folderId) {
  if (folderId === props.selectedFolderId) return true
  if (props.selectedFolderId === `${COLLECTION_PREFIX}${folderId}`) return true
  return false
}

function isDropHighlight(folderId) {
  return props.dragOverFolderId === folderId && isDropTarget(folderId)
}

function isDropDisabledHighlight(folderId) {
  return props.dragOverFolderId === folderId && isDropDisabled(folderId)
}

function handleSelect(folderId) {
  closeFolderMenu()
  emit('select-folder', folderId)
}

function handleDragOver(folderId, event) {
  if (!props.dropEnabled) return
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = isDropTarget(folderId) ? 'move' : 'none'
  }
}

function handleDragEnter(folderId, event) {
  if (!props.dropEnabled) return
  event.preventDefault()
  emit('folder-drag-enter', folderId)
}

function handleDragLeave(folderId) {
  if (!props.dropEnabled) return
  emit('folder-drag-leave', folderId)
}

function handleDrop(folderId, event) {
  if (!props.dropEnabled) return
  event.preventDefault()
  emit('folder-drop', { folderId, event })
}

function toggleFolderMenu(folderId) {
  openMenuFolderId.value = openMenuFolderId.value === folderId ? '' : folderId
}

function closeFolderMenu() {
  openMenuFolderId.value = ''
}

function handleRenameClick(folder) {
  closeFolderMenu()
  emit('open-rename-folder', folder.id)
}

function handleDeleteClick(folderId) {
  closeFolderMenu()
  emit('delete-folder', folderId)
}

function handleDocumentClick() {
  closeFolderMenu()
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<template>
  <aside class="gallery-sidebar" aria-label="폴더 목록">
    <button
      type="button"
      class="gallery-sidebar__create-btn"
      @click="emit('create-folder')"
    >
      + 폴더 생성하기
    </button>

    <section class="gallery-sidebar__section">
      <h2 class="gallery-sidebar__section-title">내 폴더</h2>

      <ul class="gallery-sidebar__list">
        <li v-for="folder in systemFolders" :key="folder.id">
          <button
            type="button"
            class="gallery-sidebar__item"
            :class="{
              'gallery-sidebar__item--active': isFolderActive(folder.id),
              'gallery-sidebar__item--drop': isDropHighlight(folder.id),
              'gallery-sidebar__item--drop-disabled': isDropDisabledHighlight(folder.id),
            }"
            @click="handleSelect(folder.id)"
            @dragover="handleDragOver(folder.id, $event)"
            @dragenter="handleDragEnter(folder.id, $event)"
            @dragleave="handleDragLeave(folder.id)"
            @drop="handleDrop(folder.id, $event)"
          >
            <span class="gallery-sidebar__item-icon" aria-hidden="true">
              {{ folder.icon }}
            </span>
            <span class="gallery-sidebar__item-name">{{ folder.name }}</span>
            <span class="gallery-sidebar__item-count">
              {{ getFolderCount(folder.id) }}
            </span>
          </button>
        </li>
      </ul>
    </section>

    <section class="gallery-sidebar__section">
      <div class="gallery-sidebar__section-head">
        <h2 class="gallery-sidebar__section-title">폴더</h2>
        <button
          type="button"
          class="gallery-sidebar__mini-add"
          aria-label="폴더 추가"
          @click="emit('create-folder')"
        >
          +
        </button>
      </div>

      <ul v-if="customFolders.length > 0" class="gallery-sidebar__list">
        <li
          v-for="folder in customFolders"
          :key="folder.id"
          class="gallery-sidebar__item-wrap"
        >
          <div class="gallery-sidebar__item-row">
            <button
              type="button"
              class="gallery-sidebar__item"
              :class="{
                'gallery-sidebar__item--active': isFolderActive(folder.id),
                'gallery-sidebar__item--drop': isDropHighlight(folder.id),
                'gallery-sidebar__item--drop-disabled': isDropDisabledHighlight(folder.id),
              }"
              @click="handleSelect(folder.id)"
              @dragover="handleDragOver(folder.id, $event)"
              @dragenter="handleDragEnter(folder.id, $event)"
              @dragleave="handleDragLeave(folder.id)"
              @drop="handleDrop(folder.id, $event)"
            >
              <span class="gallery-sidebar__item-icon" aria-hidden="true">📁</span>
              <span class="gallery-sidebar__item-name">{{ folder.name }}</span>
              <span class="gallery-sidebar__item-count">
                {{ folder.itemCount ?? 0 }}
              </span>
            </button>
            <button
              type="button"
              class="gallery-sidebar__item-menu-btn"
              :aria-label="`「${folder.name}」 폴더 메뉴`"
              aria-haspopup="menu"
              :aria-expanded="openMenuFolderId === folder.id"
              @click.stop="toggleFolderMenu(folder.id)"
            >
              ⋮
            </button>
          </div>

          <div
            v-if="openMenuFolderId === folder.id"
            class="gallery-sidebar__menu"
            role="menu"
            @click.stop
          >
            <button
              type="button"
              role="menuitem"
              class="gallery-sidebar__menu-item"
              @click="handleRenameClick(folder)"
            >
              수정
            </button>
            <button
              type="button"
              role="menuitem"
              class="gallery-sidebar__menu-item gallery-sidebar__menu-item--danger"
              @click="handleDeleteClick(folder.id)"
            >
              삭제
            </button>
          </div>
        </li>
      </ul>

      <p v-else class="gallery-sidebar__empty">만든 폴더가 없습니다.</p>
    </section>
  </aside>
</template>

<style scoped>
.gallery-sidebar {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  min-width: 0;
  padding: 20px 16px;
  border: 1px solid #e8e2f8;
  border-radius: 20px;
  background: #ffffff;
  box-shadow: 0 14px 35px rgba(80, 60, 160, 0.08);
  box-sizing: border-box;
}

.gallery-sidebar__create-btn {
  width: 100%;
  min-height: 48px;
  padding: 12px 16px;
  border: 1.5px solid #6d3df2;
  border-radius: 14px;
  background: #fbf8ff;
  color: #6d3df2;
  font-family: var(--sans);
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.gallery-sidebar__create-btn:hover {
  background: #6d3df2;
  color: #ffffff;
  box-shadow: 0 10px 24px rgba(109, 61, 242, 0.22);
}

.gallery-sidebar__section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.gallery-sidebar__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.gallery-sidebar__section-title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #7c86a3;
  text-transform: uppercase;
}

.gallery-sidebar__mini-add {
  width: 28px;
  height: 28px;
  border: 1px solid #e8e2f8;
  border-radius: 8px;
  background: #fbf8ff;
  color: #6d3df2;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}

.gallery-sidebar__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.gallery-sidebar__item-wrap {
  position: relative;
}

.gallery-sidebar__item-row {
  display: flex;
  align-items: stretch;
  gap: 4px;
}

.gallery-sidebar__item {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 46px;
  padding: 10px 12px;
  border: 1px solid transparent;
  border-radius: 12px;
  background: transparent;
  color: #111827;
  font-family: var(--sans);
  font-size: 14px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
}

.gallery-sidebar__item:hover {
  background: #f2ecff;
}

.gallery-sidebar__item--active {
  background: #f2ecff;
  border-color: #cbb8ff;
  color: #6d3df2;
}

.gallery-sidebar__item--drop {
  background: #efe7ff;
  border: 1.5px dashed #6d3df2;
  color: #6d3df2;
  transform: scale(1.02);
  box-shadow: 0 8px 20px rgba(109, 61, 242, 0.14);
}

.gallery-sidebar__item--drop-disabled {
  background: #fafafa;
  border: 1px dashed #d1d5db;
  color: #9ca3af;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.gallery-sidebar__item-icon {
  flex-shrink: 0;
  font-size: 16px;
  line-height: 1;
}

.gallery-sidebar__item-name {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gallery-sidebar__item-count {
  flex-shrink: 0;
  min-width: 24px;
  font-size: 13px;
  font-weight: 600;
  color: #7c86a3;
  text-align: right;
}

.gallery-sidebar__item--active .gallery-sidebar__item-count,
.gallery-sidebar__item--drop .gallery-sidebar__item-count {
  color: #6d3df2;
}

.gallery-sidebar__item-menu-btn {
  flex-shrink: 0;
  width: 32px;
  min-height: 46px;
  border: 1px solid transparent;
  border-radius: 12px;
  background: transparent;
  color: #7c86a3;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease;
}

.gallery-sidebar__item-menu-btn:hover,
.gallery-sidebar__item-menu-btn[aria-expanded='true'] {
  background: rgba(109, 61, 242, 0.1);
  border-color: #e8e2f8;
  color: #6d3df2;
}

.gallery-sidebar__menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 20;
  min-width: 140px;
  padding: 6px;
  border: 1px solid #e8e2f8;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 12px 32px rgba(80, 60, 160, 0.16);
}

.gallery-sidebar__menu-item {
  display: block;
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #111827;
  font-family: var(--sans);
  font-size: 14px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.gallery-sidebar__menu-item:hover {
  background: #f2ecff;
  color: #6d3df2;
}

.gallery-sidebar__menu-item--danger {
  color: #ff4d6d;
}

.gallery-sidebar__menu-item--danger:hover {
  background: #fff5f7;
  color: #ff4d6d;
}

.gallery-sidebar__empty {
  margin: 0;
  padding: 8px 4px;
  font-size: 13px;
  color: #7c86a3;
}
</style>
