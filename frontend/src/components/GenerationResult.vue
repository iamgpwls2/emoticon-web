<script setup>
import { computed, ref, watch } from 'vue'
import ErrorMessage from './ErrorMessage.vue'
import { downloadImage } from '../utils/downloadImage.js'

const props = defineProps({
  generatedImageUrl: {
    type: String,
    default: '',
  },
  originalImageUrl: {
    type: String,
    default: '',
  },
  finalPrompt: {
    type: String,
    default: '',
  },
  generationId: {
    type: String,
    default: '',
  },
  isGenerating: {
    type: Boolean,
    default: false,
  },
  canRegenerate: {
    type: Boolean,
    default: false,
  },
  regenerateErrorMessage: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['regenerate'])

const generatedImageLoadFailed = ref(false)
const originalImageLoadFailed = ref(false)
const isDownloading = ref(false)
const downloadErrorMessage = ref('')

const DOWNLOAD_FAILED_MESSAGE =
  '이미지 다운로드에 실패했습니다. 이미지를 새 탭에서 열어 저장해 주세요.'

const hasGeneratedImageUrl = computed(() =>
  Boolean(props.generatedImageUrl?.trim())
)
const hasOriginalImageUrl = computed(() =>
  Boolean(props.originalImageUrl?.trim())
)
const hasFinalPrompt = computed(() => Boolean(props.finalPrompt?.trim()))
const trimmedGeneratedImageUrl = computed(
  () => props.generatedImageUrl?.trim() || ''
)
const trimmedOriginalImageUrl = computed(
  () => props.originalImageUrl?.trim() || ''
)

const downloadFilename = computed(() => {
  const id = props.generationId?.trim()
  return id ? `emoticon-${id}.png` : 'emoticon-result.png'
})

const isDownloadDisabled = computed(
  () =>
    !hasGeneratedImageUrl.value ||
    props.isGenerating ||
    isDownloading.value ||
    generatedImageLoadFailed.value
)

const downloadButtonLabel = computed(() =>
  isDownloading.value ? '다운로드 중...' : 'PNG 다운로드'
)

const isRegenerateDisabled = computed(
  () => props.isGenerating || !props.canRegenerate
)

const regenerateButtonLabel = computed(() =>
  props.isGenerating ? '다시 생성 중...' : '다시 생성하기'
)

watch(
  () => props.generatedImageUrl,
  () => {
    generatedImageLoadFailed.value = false
  }
)

watch(
  () => props.originalImageUrl,
  () => {
    originalImageLoadFailed.value = false
  }
)

function onGeneratedImageError() {
  generatedImageLoadFailed.value = true
}

function onOriginalImageError() {
  originalImageLoadFailed.value = true
}

async function handleDownload() {
  if (isDownloadDisabled.value) return

  isDownloading.value = true
  downloadErrorMessage.value = ''

  try {
    await downloadImage(trimmedGeneratedImageUrl.value, downloadFilename.value)
  } catch {
    downloadErrorMessage.value = DOWNLOAD_FAILED_MESSAGE
  } finally {
    isDownloading.value = false
  }
}

function handleRegenerateClick() {
  if (isRegenerateDisabled.value) return
  emit('regenerate')
}
</script>

<template>
  <section
    v-if="hasGeneratedImageUrl"
    class="generation-result"
    :data-generation-id="generationId || undefined"
    :aria-busy="isGenerating"
  >
    <h2 class="generation-result__title">3. 생성 결과</h2>

    <div class="generation-result__card">
      <div class="generation-result__compare">
        <div class="generation-result__compare-item">
          <h3 class="generation-result__compare-label">원본 이미지</h3>
          <div class="generation-result__preview-wrap">
            <img
              v-if="hasOriginalImageUrl && !originalImageLoadFailed"
              :src="trimmedOriginalImageUrl"
              alt="원본 이미지"
              class="generation-result__preview"
              @error="onOriginalImageError"
            />
            <p v-else class="generation-result__empty-state">
              {{
                hasOriginalImageUrl && originalImageLoadFailed
                  ? '원본 이미지를 불러오지 못했습니다.'
                  : '원본 이미지가 없습니다.'
              }}
            </p>
          </div>
        </div>

        <div class="generation-result__compare-item">
          <h3 class="generation-result__compare-label">생성 이미지</h3>
          <div class="generation-result__preview-wrap">
            <img
              v-if="!generatedImageLoadFailed"
              :src="trimmedGeneratedImageUrl"
              alt="생성된 이모티콘 미리보기"
              class="generation-result__preview"
              @error="onGeneratedImageError"
            />
            <p
              v-else
              class="generation-result__image-error"
              role="alert"
            >
              생성 이미지를 불러오지 못했습니다.
            </p>
          </div>
        </div>
      </div>

      <p class="generation-result__hint">
        생성 결과가 원본 캐릭터와 다르다면 프롬프트를 수정하거나 다시 생성해
        주세요.
      </p>

      <div class="generation-result__actions">
        <button
          type="button"
          class="generation-result__download-btn"
          :disabled="isDownloadDisabled"
          @click="handleDownload"
        >
          {{ downloadButtonLabel }}
        </button>
        <button
          type="button"
          class="generation-result__regenerate-btn"
          :disabled="isRegenerateDisabled"
          @click="handleRegenerateClick"
        >
          {{ regenerateButtonLabel }}
        </button>
        <ErrorMessage :message="downloadErrorMessage" variant="error" />
        <ErrorMessage :message="regenerateErrorMessage" variant="error" />
      </div>

      <div v-if="hasFinalPrompt" class="generation-result__prompt">
        <h3 class="generation-result__prompt-label">최종 프롬프트</h3>
        <p class="generation-result__prompt-text">{{ finalPrompt.trim() }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.generation-result {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 100%;
  margin-inline: auto;
  text-align: left;
}

.generation-result__title {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  color: var(--text-h);
}

.generation-result__card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 100%;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--code-bg);
  box-shadow: var(--shadow);
  box-sizing: border-box;
}

.generation-result__compare {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  width: 100%;
}

.generation-result__compare-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.generation-result__compare-label {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-h);
}

.generation-result__preview-wrap {
  width: 100%;
  max-width: 100%;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg);
  box-sizing: border-box;
}

.generation-result__preview {
  display: block;
  width: 100%;
  max-width: 100%;
  max-height: min(50vh, 320px);
  object-fit: contain;
}

.generation-result__empty-state {
  margin: 0;
  padding: 24px 16px;
  font-size: 14px;
  line-height: 1.5;
  text-align: center;
  color: var(--text);
  background: var(--social-bg);
}

.generation-result__image-error {
  margin: 0;
  padding: 24px 16px;
  font-size: 14px;
  line-height: 1.5;
  text-align: center;
  color: #dc2626;
  background: rgba(220, 38, 38, 0.08);
}

.generation-result__hint {
  margin: 0;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text);
  font-size: 13px;
  line-height: 1.55;
}

.generation-result__actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.generation-result__download-btn {
  width: 100%;
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
  transition: border-color 0.3s, box-shadow 0.3s, opacity 0.2s,
    background-color 0.2s;
}

.generation-result__download-btn:hover:not(:disabled) {
  border-color: var(--accent-border);
  box-shadow: var(--shadow);
}

.generation-result__download-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.generation-result__download-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  color: var(--text);
  background: var(--social-bg);
  border-color: var(--border);
  box-shadow: none;
}

.generation-result__regenerate-btn {
  width: 100%;
  min-height: 44px;
  font-family: var(--sans);
  font-size: 16px;
  font-weight: 500;
  line-height: 1.4;
  padding: 10px 16px;
  border: 2px solid var(--border);
  border-radius: 8px;
  color: var(--text-h);
  background: var(--bg);
  cursor: pointer;
  transition: border-color 0.3s, box-shadow 0.3s, opacity 0.2s,
    background-color 0.2s;
}

.generation-result__regenerate-btn:hover:not(:disabled) {
  border-color: var(--accent-border);
  box-shadow: var(--shadow);
}

.generation-result__regenerate-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.generation-result__regenerate-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  color: var(--text);
  background: var(--social-bg);
  border-color: var(--border);
  box-shadow: none;
}

.generation-result__prompt {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  min-width: 0;
}

.generation-result__prompt-label {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-h);
}

.generation-result__prompt-text {
  margin: 0;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text-h);
  font-size: 14px;
  line-height: 1.55;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
}

@media (min-width: 641px) {
  .generation-result__compare {
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
}

@media (max-width: 480px) {
  .generation-result__title {
    font-size: 16px;
  }

  .generation-result__card {
    padding: 12px;
    gap: 14px;
  }

  .generation-result__hint {
    padding: 10px 12px;
    font-size: 12px;
  }

  .generation-result__prompt-text {
    padding: 10px 12px;
    font-size: 13px;
  }
}
</style>
