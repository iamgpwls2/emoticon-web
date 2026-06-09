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
})

const emit = defineEmits(['delete', 'toggle-select', 'drag-start'])

const imageLoadFailed = ref(false)

const hasImageUrl = computed(() => Boolean(props.generatedImageUrl?.trim()))
const trimmedImageUrl = computed(() => props.generatedImageUrl?.trim() || '')

const formattedCreatedAt = computed(() => {
  if (!props.createdAt?.trim()) return ''

  const date = new Date(props.createdAt)
  if (Number.isNaN(date.getTime())) return props.createdAt

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
})

const metaLine = computed(() => {
  const parts = [props.emotion, props.motion].filter(Boolean)
  return parts.join(' · ')
})

const isDraggable = computed(
  () => props.selectionMode && props.selected && !props.deleting && !props.moving
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
</script>

<template>
  <article
    class="emoticon-card"
    :class="{
      'emoticon-card--selectable': selectionMode,
      'emoticon-card--selected': selected,
      'emoticon-card--moving': moving,
    }"
    :data-generation-id="id"
    :draggable="isDraggable"
    @click="handleCardClick"
    @dragstart="handleDragStart"
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
      <span class="emoticon-card__select-text">선택</span>
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
      <p v-else class="emoticon-card__preview-placeholder">
        {{
          hasImageUrl && imageLoadFailed
            ? '이미지를 불러오지 못했습니다.'
            : status === 'completed'
              ? '이미지가 없습니다.'
              : '생성 중이거나 실패한 항목입니다.'
        }}
      </p>
    </div>

    <div class="emoticon-card__body">
      <p v-if="metaLine" class="emoticon-card__meta">{{ metaLine }}</p>
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
    </div>

    <div v-if="!selectionMode" class="emoticon-card__actions">
      <button
        type="button"
        class="emoticon-card__download-btn"
        :disabled="isDownloadDisabled || moving"
        :aria-busy="isDownloading"
        @click.stop="handleDownloadClick"
      >
        {{ isDownloading ? '저장 중...' : 'PNG 저장' }}
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
  gap: 12px;
  width: 100%;
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--code-bg);
  box-shadow: var(--shadow);
  box-sizing: border-box;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.emoticon-card--selectable {
  cursor: pointer;
}

.emoticon-card--selected {
  border-color: #6d3df2;
  box-shadow: 0 0 0 3px rgba(109, 61, 242, 0.14);
}

.emoticon-card--moving {
  opacity: 0.65;
}

.emoticon-card--selectable[draggable='true'] {
  cursor: grab;
}

.emoticon-card--selectable[draggable='true']:active {
  cursor: grabbing;
}

.emoticon-card__select {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-h);
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
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg);
  box-sizing: border-box;
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
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 16px;
  box-sizing: border-box;
  text-align: center;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text);
  background: var(--social-bg);
}

.emoticon-card__body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.emoticon-card__meta {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-h);
  word-break: keep-all;
}

.emoticon-card__text {
  margin: 0;
  font-size: 14px;
  line-height: 1.45;
  color: var(--text-h);
  overflow-wrap: anywhere;
  word-break: break-word;
}

.emoticon-card__date {
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
  color: var(--text);
}

.emoticon-card__actions {
  display: flex;
  gap: 8px;
  width: 100%;
  min-width: 0;
}

.emoticon-card__download-btn {
  flex: 1 1 50%;
  min-width: 0;
  min-height: 44px;
  margin: 0;
  padding: 10px 14px;
  border: 1px solid transparent;
  border-radius: 8px;
  font-family: var(--sans);
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
  color: var(--accent);
  background: var(--accent-bg);
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s, opacity 0.2s;
}

.emoticon-card__download-btn:hover:not(:disabled) {
  border-color: var(--accent-border);
  box-shadow: var(--shadow);
}

.emoticon-card__download-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.emoticon-card__download-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.emoticon-card__download-error {
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
  color: #dc2626;
}

.emoticon-card__delete-btn {
  flex: 1 1 50%;
  min-width: 0;
  min-height: 44px;
  margin: 0;
  padding: 10px 14px;
  border: 1px solid rgba(220, 38, 38, 0.35);
  border-radius: 8px;
  font-family: var(--sans);
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
  color: #dc2626;
  background: rgba(220, 38, 38, 0.08);
  cursor: pointer;
  transition: border-color 0.2s, background-color 0.2s, opacity 0.2s;
}

.emoticon-card__delete-btn:hover:not(:disabled) {
  background: rgba(220, 38, 38, 0.14);
  border-color: rgba(220, 38, 38, 0.55);
}

.emoticon-card__delete-btn:focus-visible {
  outline: 2px solid #dc2626;
  outline-offset: 2px;
}

.emoticon-card__delete-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

@media (max-width: 480px) {
  .emoticon-card__download-btn,
  .emoticon-card__delete-btn {
    font-size: 15px;
  }
}
</style>
