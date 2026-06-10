<script setup>
import { computed } from 'vue'

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  folders: {
    type: Array,
    default: () => [],
  },
  selectedCount: {
    type: Number,
    default: 0,
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close', 'move'])

const title = computed(() =>
  props.selectedCount > 0
    ? `${props.selectedCount}개 이미지를 이동할 폴더를 선택하세요`
    : '이동할 폴더를 선택하세요'
)

function handleClose() {
  if (props.loading) return
  emit('close')
}

function handleBackdropClick(event) {
  if (event.target === event.currentTarget) {
    handleClose()
  }
}

function handleSelectFolder(folderId) {
  if (props.loading) return
  emit('move', folderId)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="folder-modal">
      <div
        v-if="open"
        class="folder-move-modal"
        role="presentation"
        @click="handleBackdropClick"
      >
        <div
          class="folder-move-modal__panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="folder-move-modal-title"
          @click.stop
        >
          <h2 id="folder-move-modal-title" class="folder-move-modal__title">
            폴더 이동
          </h2>
          <p class="folder-move-modal__desc">{{ title }}</p>

          <ul class="folder-move-modal__list" role="listbox" aria-label="폴더 목록">
            <li>
              <button
                type="button"
                class="folder-move-modal__item"
                :disabled="loading"
                role="option"
                @click="handleSelectFolder(null)"
              >
                <span class="folder-move-modal__item-icon" aria-hidden="true">📂</span>
                <span>미분류</span>
              </button>
            </li>
            <li v-for="folder in folders" :key="folder.id">
              <button
                type="button"
                class="folder-move-modal__item"
                :disabled="loading"
                role="option"
                @click="handleSelectFolder(folder.id)"
              >
                <span class="folder-move-modal__item-icon" aria-hidden="true">📁</span>
                <span>{{ folder.name }}</span>
                <span class="folder-move-modal__item-count">{{ folder.itemCount ?? 0 }}</span>
              </button>
            </li>
          </ul>

          <div class="folder-move-modal__actions">
            <button
              type="button"
              class="folder-move-modal__cancel"
              :disabled="loading"
              @click="handleClose"
            >
              취소
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.folder-move-modal {
  position: fixed;
  inset: 0;
  z-index: 130;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(17, 24, 39, 0.35);
  backdrop-filter: blur(4px);
  box-sizing: border-box;
}

.folder-move-modal__panel {
  width: min(420px, 100%);
  max-height: min(80vh, 560px);
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  border: 1px solid #e8e2f8;
  border-radius: 20px;
  background: #ffffff;
  box-shadow: 0 24px 60px rgba(80, 60, 160, 0.18);
  box-sizing: border-box;
}

.folder-move-modal__title {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: #111827;
}

.folder-move-modal__desc {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: #7c86a3;
}

.folder-move-modal__list {
  margin: 0;
  padding: 0;
  list-style: none;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.folder-move-modal__item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 48px;
  padding: 10px 14px;
  border: 1px solid #e8e2f8;
  border-radius: 12px;
  background: #fbf8ff;
  color: #111827;
  font-family: var(--sans);
  font-size: 14px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.folder-move-modal__item:hover:not(:disabled) {
  border-color: #6d3df2;
  background: #f2ecff;
  color: #6d3df2;
}

.folder-move-modal__item:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.folder-move-modal__item-icon {
  font-size: 18px;
}

.folder-move-modal__item-count {
  margin-left: auto;
  padding: 2px 8px;
  border-radius: 999px;
  background: #f1ebff;
  color: #6d3df2;
  font-size: 12px;
  font-weight: 700;
}

.folder-move-modal__actions {
  display: flex;
  justify-content: flex-end;
}

.folder-move-modal__cancel {
  min-height: 42px;
  padding: 8px 16px;
  border: 1px solid #e8e2f8;
  border-radius: 12px;
  background: #ffffff;
  color: #7c86a3;
  font-family: var(--sans);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.folder-move-modal-enter-active,
.folder-move-modal-leave-active {
  transition: opacity 0.2s ease;
}

.folder-move-modal-enter-from,
.folder-move-modal-leave-to {
  opacity: 0;
}
</style>
