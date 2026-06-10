<script setup>
import { computed, ref } from 'vue'
import { downloadImage } from '../utils/downloadImage.js'

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
  generatedImageUrl: {
    type: String,
    default: '',
  },
  emotion: {
    type: String,
    default: '',
  },
  motion: {
    type: String,
    default: '',
  },
  inputText: {
    type: String,
    default: '',
  },
  createdAt: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    default: '',
  },
  deleting: {
    type: Boolean,
    default: false,
  },
  moving: {
    type: Boolean,
    default: false,
  },
  selectionMode: {
    type: Boolean,
    default: false,
  },
  selected: {
    type: Boolean,
    default: false,
  },
  dragging: {
    type: Boolean,
    default: false,
  },
  favorite: {
    type: Boolean,
    default: false,
  },
  viewMode: {
    type: String,
    default: 'grid',
  },
  folderName: {
    type: String,
    default: '',
  },
})

const emit = defineEmits([
  'delete',
  'toggle-select',
  'drag-start',
  'drag-end',
  'toggle-favorite',
])

const imageLoadFailed = ref(false)

const hasImageUrl = computed(() => Boolean(props.generatedImageUrl?.trim()))
const trimmedImageUrl = computed(() => props.generatedImageUrl?.trim() || '')

const formattedCreatedAt = computed(() => {
  if (!props.createdAt?.trim()) return ''

  const date = new Date(props.createdAt)
  if (Number.isNaN(date.getTime())) return props.createdAt

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')

  return `${year}.${month}.${day} ${hour}:${minute}`
})

const metaLine = computed(() => {
  const parts = [props.emotion, props.motion].filter(Boolean)
  return parts.join(' · ')
})

const isDraggable = computed(
  () => !props.deleting && !props.moving && hasImageUrl.value
)

function onImageError() {
  imageLoadFailed.value = true
}

const isDownloading = ref(false)
const downloadErrorMessage = ref('')

const isDownloadDisabled = computed(
  () => !hasImageUrl.value || imageLoadFailed.value || isDownloading.value
)

async function handleDownloadClick() {
  if (isDownloadDisabled.value) return

  isDownloading.value = true
  downloadErrorMessage.value = ''

  try {
    await downloadImage(trimmedImageUrl.value, `emoticon-${props.id}.png`)
  } catch {
    downloadErrorMessage.value =
      '다운로드에 실패했습니다. 잠시 후 다시 시도해 주세요.'
  } finally {
    isDownloading.value = false
  }
}

function handleDeleteClick() {
  if (props.deleting || props.selectionMode) return

  const confirmed = window.confirm(
    '이 이모티콘을 삭제할까요?\n삭제하면 복구할 수 없습니다.'
  )
  if (!confirmed) return

  emit('delete', props.id)
}

function handleToggleSelect() {
  if (!props.selectionMode || props.deleting || props.moving) return
  emit('toggle-select', props.id)
}

function handleCardClick() {
  if (!props.selectionMode || props.deleting || props.moving) return
  emit('toggle-select', props.id)
}

function handleDragStart(event) {
  if (!isDraggable.value) {
    event.preventDefault()
    return
  }

  emit('drag-start', { id: props.id, event })
}

function handleDragEnd() {
  emit('drag-end')
}

function handleToggleFavorite(event) {
  event.stopPropagation()
  emit('toggle-favorite', props.id)
}
</script>

<template>
  <article
    class="emoticon-card"
    :class="{
      'emoticon-card--list': viewMode === 'list',
      'emoticon-card--selectable': selectionMode,
      'emoticon-card--selected': selected,
      'emoticon-card--moving': moving,
      'emoticon-card--dragging': dragging,
    }"
    :data-generation-id="id"
    :draggable="isDraggable"
    @click="handleCardClick"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
  >
    <label
      v-if="selectionMode"
      class="emoticon-card__select"
      @click.stop
    >
      <input
        type="checkbox"
        :checked="selected"
        :disabled="deleting || moving"
        @change="handleToggleSelect"
      />
    </label>

    <div class="emoticon-card__preview-wrap">
      <img
        v-if="hasImageUrl && !imageLoadFailed"
        :src="trimmedImageUrl"
        :alt="inputText ? `${inputText} 이모티콘` : '생성된 이모티콘'"
        class="emoticon-card__preview"
        loading="lazy"
        draggable="false"
        @error="onImageError"
      />
      <div v-else class="emoticon-card__preview-placeholder">
        <span class="emoticon-card__placeholder-icon" aria-hidden="true">🖼️</span>
        <p class="emoticon-card__placeholder-text">
          {{
            hasImageUrl && imageLoadFailed
              ? '이미지를 불러오지 못했습니다.'
              : status === 'completed'
                ? '이미지가 없습니다.'
                : '생성 중이거나 실패한 항목입니다.'
          }}
        </p>
      </div>
    </div>

    <div class="emoticon-card__body">
      <div class="emoticon-card__meta-row">
        <p v-if="metaLine" class="emoticon-card__meta">{{ metaLine }}</p>
        <button
          type="button"
          class="emoticon-card__favorite"
          :class="{ 'emoticon-card__favorite--active': favorite }"
          :aria-pressed="favorite"
          :aria-label="favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'"
          @click="handleToggleFavorite"
        >
          {{ favorite ? '★' : '☆' }}
        </button>
      </div>

      <p v-if="inputText?.trim()" class="emoticon-card__text">
        {{ inputText.trim() }}
      </p>

      <time
        v-if="formattedCreatedAt"
        class="emoticon-card__date"
        :datetime="createdAt"
      >
        {{ formattedCreatedAt }}
      </time>

      <div class="emoticon-card__tags">
        <span class="emoticon-card__format">PNG</span>
        <span
          v-if="folderName?.trim()"
          class="emoticon-card__format emoticon-card__format--folder"
        >
          {{ folderName.trim() }}
        </span>
      </div>
    </div>

    <div v-if="!selectionMode" class="emoticon-card__actions">
      <button
        type="button"
        class="emoticon-card__download-btn"
        :disabled="isDownloadDisabled || moving"
        :aria-busy="isDownloading"
        @click.stop="handleDownloadClick"
      >
        {{ isDownloading ? '저장 중...' : '저장' }}
      </button>
      <button
        type="button"
        class="emoticon-card__delete-btn"
        :disabled="deleting || moving"
        :aria-busy="deleting"
        @click.stop="handleDeleteClick"
      >
        {{ deleting ? '삭제 중...' : '삭제' }}
      </button>
    </div>

    <p
      v-if="!selectionMode && downloadErrorMessage"
      class="emoticon-card__download-error"
      role="alert"
    >
      {{ downloadErrorMessage }}
    </p>
  </article>
</template>

<style scoped>
.emoticon-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
  min-width: 0;
  padding: 14px;
  border: 1px solid #ece8f7;
  border-radius: 20px;
  background: #ffffff;
  box-shadow: 0 14px 35px rgba(80, 60, 160, 0.1);
  box-sizing: border-box;
  position: relative;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease,
    opacity 0.2s ease;
}

.emoticon-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 18px 42px rgba(80, 60, 160, 0.14);
}

.emoticon-card--list {
  flex-direction: row;
  align-items: stretch;
}

.emoticon-card--selectable {
  cursor: pointer;
}

.emoticon-card--selected {
  border-color: #6d3df2;
  box-shadow:
    0 0 0 3px rgba(109, 61, 242, 0.12),
    0 14px 35px rgba(80, 60, 160, 0.1);
}

.emoticon-card--selected::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: rgba(109, 61, 242, 0.06);
  pointer-events: none;
}

.emoticon-card--moving {
  opacity: 0.65;
}

.emoticon-card--dragging {
  opacity: 0.6;
  transform: scale(0.96);
}

.emoticon-card[draggable='true'] {
  cursor: grab;
}

.emoticon-card[draggable='true']:active {
  cursor: grabbing;
}

.emoticon-card__select {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  margin: 0;
  cursor: pointer;
}

.emoticon-card__select input {
  width: 18px;
  height: 18px;
  accent-color: #6d3df2;
}

.emoticon-card__preview-wrap {
  width: 100%;
  aspect-ratio: 1;
  border: 1px solid #ddd2ff;
  border-radius: 14px;
  overflow: hidden;
  background: #faf7ff;
  box-sizing: border-box;
  flex-shrink: 0;
}

.emoticon-card--list .emoticon-card__preview-wrap {
  width: 120px;
  aspect-ratio: 1;
}

.emoticon-card__preview {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
}

.emoticon-card__preview-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 100%;
  padding: 16px;
  box-sizing: border-box;
  text-align: center;
}

.emoticon-card__placeholder-icon {
  font-size: 28px;
  opacity: 0.7;
}

.emoticon-card__placeholder-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: #7c86a3;
}

.emoticon-card__body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  flex: 1 1 auto;
}

.emoticon-card__meta-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.emoticon-card__meta {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #6d3df2;
  word-break: keep-all;
}

.emoticon-card__favorite {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #cbb8ff;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}

.emoticon-card__favorite--active {
  color: #6d3df2;
}

.emoticon-card__text {
  margin: 0;
  font-size: 14px;
  line-height: 1.45;
  color: #111827;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.emoticon-card__date {
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
  color: #7c86a3;
}

.emoticon-card__tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.emoticon-card__format {
  padding: 2px 8px;
  border-radius: 999px;
  background: #f1ebff;
  color: #6d3df2;
  font-size: 11px;
  font-weight: 700;
}

.emoticon-card__format--folder {
  background: #fff4cc;
  color: #9a6b00;
}

.emoticon-card__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  width: 100%;
  min-width: 0;
}

.emoticon-card--list .emoticon-card__actions {
  margin-top: auto;
}

.emoticon-card__download-btn {
  min-width: 82px;
  min-height: 44px;
  margin: 0;
  padding: 12px 14px;
  border: 1px solid transparent;
  border-radius: 12px;
  font-family: var(--sans);
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  word-break: keep-all;
  color: #6d3df2;
  background: #f1ebff;
  cursor: pointer;
}

.emoticon-card__download-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.emoticon-card__delete-btn {
  min-width: 0;
  min-height: 44px;
  margin: 0;
  padding: 12px 14px;
  border: 1px solid #ffc9d3;
  border-radius: 12px;
  font-family: var(--sans);
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  word-break: keep-all;
  color: #ff4d6d;
  background: #fff5f7;
  cursor: pointer;
}

.emoticon-card__delete-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.emoticon-card__download-error {
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
  color: #ff4d6d;
}
</style>
