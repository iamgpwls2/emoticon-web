<script setup>
import { computed, ref } from 'vue'

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
})

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

function onImageError() {
  imageLoadFailed.value = true
}
</script>

<template>
  <article class="emoticon-card" :data-generation-id="id">
    <div class="emoticon-card__preview-wrap">
      <img
        v-if="hasImageUrl && !imageLoadFailed"
        :src="trimmedImageUrl"
        :alt="inputText ? `${inputText} 이모티콘` : '생성된 이모티콘'"
        class="emoticon-card__preview"
        loading="lazy"
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
</style>
