<script setup>
import { computed } from 'vue'

const props = defineProps({
  name: {
    type: String,
    required: true,
  },
  itemCount: {
    type: Number,
    default: 0,
  },
  coverImageUrl: {
    type: String,
    default: '',
  },
  active: {
    type: Boolean,
    default: false,
  },
  dropHighlight: {
    type: Boolean,
    default: false,
  },
  dropEnabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['open', 'drop', 'drag-enter', 'drag-leave'])

const hasCover = computed(() => Boolean(props.coverImageUrl?.trim()))
const countLabel = computed(() => `${props.itemCount}개`)

function handleDragOver(event) {
  if (!props.dropEnabled) return
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

function handleDragEnter(event) {
  if (!props.dropEnabled) return
  event.preventDefault()
  emit('drag-enter')
}

function handleDragLeave() {
  if (!props.dropEnabled) return
  emit('drag-leave')
}

function handleDrop(event) {
  if (!props.dropEnabled) return
  event.preventDefault()
  emit('drop', event)
}

function handleKeydown(event) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    emit('open')
  }
}
</script>

<template>
  <div
    class="folder-card"
    :class="{
      'folder-card--active': active,
      'folder-card--drop-highlight': dropHighlight,
      'folder-card--drop-enabled': dropEnabled,
    }"
    role="button"
    tabindex="0"
    :aria-label="`${name} 폴더, ${countLabel}`"
    @click="emit('open')"
    @keydown="handleKeydown"
    @dragover="handleDragOver"
    @dragenter="handleDragEnter"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <div class="folder-card__cover">
      <img
        v-if="hasCover"
        :src="coverImageUrl"
        :alt="`${name} 대표 이미지`"
        class="folder-card__image"
        loading="lazy"
        draggable="false"
      />
      <span v-else class="folder-card__icon" aria-hidden="true">📁</span>
    </div>

    <div class="folder-card__body">
      <h2 class="folder-card__name">{{ name }}</h2>
      <p class="folder-card__count">{{ countLabel }}</p>
      <p v-if="dropEnabled" class="folder-card__drop-hint">여기에 놓기</p>
    </div>
  </div>
</template>

<style scoped>
.folder-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--code-bg);
  box-shadow: var(--shadow);
  box-sizing: border-box;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease,
    background 0.2s ease;
}

.folder-card:hover {
  border-color: var(--accent-border);
  box-shadow: 0 8px 24px rgba(109, 61, 242, 0.1);
  transform: translateY(-1px);
}

.folder-card:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.folder-card--active {
  border-color: var(--accent-border);
  background: var(--accent-bg);
}

.folder-card--drop-enabled {
  cursor: copy;
}

.folder-card--drop-highlight {
  border-color: #6d3df2;
  background: rgba(109, 61, 242, 0.08);
  box-shadow: 0 0 0 3px rgba(109, 61, 242, 0.18);
  transform: scale(1.02);
}

.folder-card__cover {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 1;
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  background: var(--bg);
}

.folder-card__image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

.folder-card__icon {
  font-size: 42px;
  line-height: 1;
}

.folder-card__body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.folder-card__name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-h);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.folder-card__count {
  margin: 0;
  font-size: 13px;
  color: var(--text);
}

.folder-card__drop-hint {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: #6d3df2;
}
</style>
