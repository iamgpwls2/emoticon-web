<script setup>
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
  'rename-folder',
  'delete-folder',
])

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

function isFolderActive(folderId) {
  if (folderId === props.selectedFolderId) return true
  if (props.selectedFolderId === `${COLLECTION_PREFIX}${folderId}`) return true
  return false
}

function isDropHighlight(folderId) {
  return props.dragOverFolderId === folderId && isDropTarget(folderId)
}

function handleSelect(folderId) {
  emit('select-folder', folderId)
}

function handleDragOver(folderId, event) {
  if (!isDropTarget(folderId)) return
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

function handleDragEnter(folderId, event) {
  if (!isDropTarget(folderId)) return
  event.preventDefault()
  emit('folder-drag-enter', folderId)
}

function handleDragLeave(folderId) {
  if (!isDropTarget(folderId)) return
  emit('folder-drag-leave', folderId)
}

function handleDrop(folderId, event) {
  if (!isDropTarget(folderId)) return
  event.preventDefault()
  emit('folder-drop', { folderId, event })
}

function handleFolderMenu(folderId, event) {
  event.stopPropagation()
  const folder = props.customFolders.find((item) => item.id === folderId)
  if (!folder) return

  const action = window.prompt(
    `「${folder.name}」 폴더\n\n이름 변경: 새 이름 입력\n삭제: "삭제" 입력\n취소: ESC`,
    folder.name
  )

  if (action === null) return

  if (action.trim() === '삭제') {
    emit('delete-folder', folderId)
    return
  }

  const trimmed = action.trim()
  if (trimmed && trimmed !== folder.name) {
    emit('rename-folder', { folderId, name: trimmed })
  }
}
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
        <li v-for="folder in customFolders" :key="folder.id">
          <button
            type="button"
            class="gallery-sidebar__item"
            :class="{
              'gallery-sidebar__item--active': isFolderActive(folder.id),
              'gallery-sidebar__item--drop': isDropHighlight(folder.id),
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
            <span
              class="gallery-sidebar__item-menu"
              role="button"
              tabindex="0"
              aria-label="폴더 메뉴"
              @click="handleFolderMenu(folder.id, $event)"
              @keydown.enter.stop="handleFolderMenu(folder.id, $event)"
            >
              ⋮
            </span>
          </button>
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

.gallery-sidebar__item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
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
  border: 1px dashed #6d3df2;
  color: #6d3df2;
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

.gallery-sidebar__item-menu {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 8px;
  color: #7c86a3;
  font-size: 16px;
  line-height: 24px;
  text-align: center;
}

.gallery-sidebar__item-menu:hover {
  background: rgba(109, 61, 242, 0.1);
  color: #6d3df2;
}

.gallery-sidebar__empty {
  margin: 0;
  padding: 8px 4px;
  font-size: 13px;
  color: #7c86a3;
}
</style>
