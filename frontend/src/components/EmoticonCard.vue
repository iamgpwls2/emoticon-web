<script setup>
import { computed, ref } from 'vue'
import Tooltip from './Tooltip.vue'
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
  favoriteToggling: {
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
  if (props.favoriteToggling) return
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
    <div class="emoticon-card__preview-wrap">
      <label
        v-if="selectionMode"
        class="emoticon-card__select"
        @click.stop
      >
        <input
          type="checkbox"
          :checked="selected"
          :disabled="deleting || moving"
          aria-label="이미지 선택"
          @change="handleToggleSelect"
        />
      </label>

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

      <div v-if="!selectionMode" class="emoticon-card__overlay-actions">
        <Tooltip label="PNG 다운로드">
          <button
            type="button"
            class="emoticon-card__icon-btn"
            :disabled="isDownloadDisabled || moving"
            :aria-busy="isDownloading"
            aria-label="PNG 다운로드"
            @click.stop="handleDownloadClick"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 4v10m0 0l3.5-3.5M12 14l-3.5-3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M5 18h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            </svg>
          </button>
        </Tooltip>

        <Tooltip label="삭제">
          <button
            type="button"
            class="emoticon-card__icon-btn emoticon-card__icon-btn--danger"
            :disabled="deleting || moving"
            :aria-busy="deleting"
            aria-label="삭제"
            @click.stop="handleDeleteClick"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 7h12M9 7V5h6v2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
              <path d="M8 7l1 12h6l1-12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </Tooltip>
      </div>
    </div>

    <div class="emoticon-card__body">
      <div class="emoticon-card__meta-row">
        <p v-if="metaLine" class="emoticon-card__meta">{{ metaLine }}</p>
        <Tooltip :label="favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'">
          <button
            type="button"
            class="emoticon-card__favorite"
            :class="{ 'emoticon-card__favorite--active': favorite }"
            :aria-pressed="favorite"
            :aria-busy="favoriteToggling"
            :disabled="favoriteToggling"
            :aria-label="favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'"
            @click="handleToggleFavorite"
          >
            {{ favorite ? '★' : '☆' }}
          </button>
        </Tooltip>
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

.emoticon-card:hover,
.emoticon-card:focus-within {
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
  border: 2px solid #8b5cf6;
  box-shadow: 0 18px 40px rgba(109, 61, 242, 0.16);
}

.emoticon-card--moving {
  opacity: 0.65;
}

.emoticon-card--dragging {
  opacity: 0.45;
  transform: scale(0.98);
}

.emoticon-card[draggable='true'] {
  cursor: grab;
}

.emoticon-card[draggable='true']:active {
  cursor: grabbing;
}

.emoticon-card__preview-wrap {
  position: relative;
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

.emoticon-card__select {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin: 0;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #e4d8ff;
  box-shadow: 0 4px 12px rgba(80, 60, 160, 0.12);
  cursor: pointer;
}

.emoticon-card__select input {
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: #6d3df2;
  cursor: pointer;
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

.emoticon-card__overlay-actions {
  position: absolute;
  right: 10px;
  bottom: 10px;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 8px;
  opacity: 0;
  transform: translateY(4px);
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.emoticon-card:hover .emoticon-card__overlay-actions,
.emoticon-card:focus-within .emoticon-card__overlay-actions {
  opacity: 1;
  transform: translateY(0);
}

.emoticon-card__icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid #e4d8ff;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.94);
  color: #6d3df2;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(80, 60, 160, 0.14);
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease;
}

.emoticon-card__icon-btn svg {
  width: 18px;
  height: 18px;
}

.emoticon-card__icon-btn:hover:not(:disabled) {
  background: #f1ebff;
  border-color: #cbb8ff;
  transform: translateY(-1px);
}

.emoticon-card__icon-btn--danger {
  color: #ff4d6d;
  border-color: #ffc9d3;
}

.emoticon-card__icon-btn--danger:hover:not(:disabled) {
  background: #fff1f2;
  border-color: #ff4d6d;
}

.emoticon-card__icon-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
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

.emoticon-card__favorite:disabled {
  opacity: 0.55;
  cursor: not-allowed;
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

.emoticon-card__download-error {
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
  color: #ff4d6d;
}

@media (hover: none) {
  .emoticon-card__overlay-actions {
    opacity: 1;
    transform: none;
  }
}
</style>
