<script setup>
import { computed, ref, watch } from 'vue'
import ErrorMessage from './ErrorMessage.vue'
import ImageViewerModal from './ImageViewerModal.vue'

const props = defineProps({
  result: {
    type: Object,
    required: true,
  },
  index: {
    type: Number,
    required: true,
  },
  isGenerating: {
    type: Boolean,
    default: false,
  },
  canRegenerate: {
    type: Boolean,
    default: false,
  },
  uploadRequired: {
    type: Boolean,
    default: false,
  },
  isSaving: {
    type: Boolean,
    default: false,
  },
  saveMessage: {
    type: String,
    default: '',
  },
  saveErrorMessage: {
    type: String,
    default: '',
  },
  downloadErrorMessage: {
    type: String,
    default: '',
  },
  regenerateErrorMessage: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['toggle', 'save', 'download', 'regenerate', 'remove'])

const generatedImageLoadFailed = ref(false)
const isFinalPromptOpen = ref(false)
const isGenerationInfoOpen = ref(false)
const isViewerOpen = ref(false)
const viewerImageUrl = ref('')

const resultNumber = computed(() => props.index + 1)

const trimmedImageUrl = computed(
  () => props.result.generatedImageUrl?.trim() || ''
)

const hasImage = computed(() => Boolean(trimmedImageUrl.value))

const hasFinalPrompt = computed(() =>
  Boolean(props.result.finalPrompt?.trim())
)

const toggleButtonLabel = computed(() =>
  props.result.isExpanded ? '접기' : '펼치기'
)

const toggleIcon = computed(() =>
  props.result.isExpanded ? '▲' : '▼'
)

const isSaveDisabled = computed(
  () =>
    !hasImage.value ||
    !props.result.id?.trim() ||
    props.isGenerating ||
    props.isSaving ||
    props.result.savedToGallery ||
    generatedImageLoadFailed.value
)

const isDownloadDisabled = computed(
  () =>
    !hasImage.value ||
    props.isGenerating ||
    generatedImageLoadFailed.value
)

const isRegenerateDisabled = computed(
  () => props.isGenerating || !props.canRegenerate || props.uploadRequired
)

const saveDescription = computed(() => {
  if (props.isSaving) return '저장 중...'
  if (props.result.savedToGallery) return '저장 완료'
  return '갤러리에 저장'
})

const regenerateDescription = computed(() =>
  props.isGenerating ? '생성 중...' : '다시 생성'
)

const generationInfoLines = computed(() => {
  const lines = []
  if (props.result.emotion?.trim()) {
    lines.push(`감정: ${props.result.emotion.trim()}`)
  }
  if (props.result.motion?.trim()) {
    lines.push(`모션: ${props.result.motion.trim()}`)
  }
  if (props.result.inputText?.trim()) {
    lines.push(`이모티콘 텍스트: ${props.result.inputText.trim()}`)
  } else {
    lines.push('이모티콘 텍스트: (없음)')
  }
  if (props.result.id?.trim()) {
    lines.push(`생성 ID: ${props.result.id.trim()}`)
  }
  return lines
})

watch(
  () => props.result.generatedImageUrl,
  () => {
    generatedImageLoadFailed.value = false
  }
)

function onToggle() {
  emit('toggle', props.index)
}

function onRemove() {
  if (props.isGenerating) return
  emit('remove', props.index)
}

function onSave() {
  if (isSaveDisabled.value) return
  emit('save', props.index)
}

function onDownload() {
  if (isDownloadDisabled.value) return
  emit('download', props.index)
}

function onRegenerate() {
  if (isRegenerateDisabled.value) return
  emit('regenerate')
}

function onGeneratedImageError() {
  generatedImageLoadFailed.value = true
}

function toggleFinalPromptAccordion() {
  isFinalPromptOpen.value = !isFinalPromptOpen.value
}

function toggleGenerationInfoAccordion() {
  isGenerationInfoOpen.value = !isGenerationInfoOpen.value
}

function openImageViewer(imageUrl) {
  if (!imageUrl?.trim() || generatedImageLoadFailed.value) return
  viewerImageUrl.value = imageUrl.trim()
  isViewerOpen.value = true
}

function closeImageViewer() {
  isViewerOpen.value = false
  viewerImageUrl.value = ''
}

function onExpandedImageClick() {
  openImageViewer(trimmedImageUrl.value)
}

function onCollapsedThumbClick() {
  openImageViewer(trimmedImageUrl.value)
}
</script>

<template>
  <article
    class="generation-result-card"
    :data-generation-id="result.id || undefined"
    :aria-expanded="result.isExpanded"
  >
    <div
      class="generation-result-card__header"
      :class="{ 'generation-result-card__header--collapsed': !result.isExpanded }"
    >
      <div class="generation-result-card__header-main">
        <h3 class="generation-result-card__title">
          생성 결과 {{ resultNumber }}번
        </h3>
        <span
          v-if="result.savedToGallery"
          class="generation-result-card__badge"
        >
          저장됨
        </span>
      </div>
      <div class="generation-result-card__header-actions">
        <button
          type="button"
          class="generation-result-card__toggle-btn"
          @click="onToggle"
        >
          {{ toggleButtonLabel }}
          <span class="generation-result-card__toggle-icon" aria-hidden="true">
            {{ toggleIcon }}
          </span>
        </button>
        <button
          type="button"
          class="generation-result-card__remove-btn"
          aria-label="생성 결과 삭제"
          :disabled="isGenerating"
          @click="onRemove"
        >
          <span aria-hidden="true">✕</span>
        </button>
      </div>
    </div>

    <div
      v-if="!result.isExpanded && hasImage"
      class="generation-result-card__collapsed"
    >
      <button
        type="button"
        class="generation-result-card__image-btn generation-result-card__image-btn--thumb"
        title="클릭하여 확대"
        @click="onCollapsedThumbClick"
      >
        <img
          :src="trimmedImageUrl"
          :alt="`생성 결과 ${resultNumber}번 미리보기`"
          class="generation-result-card__collapsed-thumb"
        />
        <span class="generation-result-card__zoom-hint" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="1.8" />
            <path d="M16 16l4.5 4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </span>
      </button>
    </div>

    <div v-if="result.isExpanded" class="generation-result-card__body">
      <div class="generation-result-card__image-box">
        <button
          v-if="hasImage && !generatedImageLoadFailed"
          type="button"
          class="generation-result-card__image-btn"
          title="클릭하여 확대"
          @click="onExpandedImageClick"
        >
          <img
            :src="trimmedImageUrl"
            :alt="`생성 결과 ${resultNumber}번 이미지`"
            class="generation-result-card__image"
            @error="onGeneratedImageError"
          />
          <span class="generation-result-card__zoom-hint" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="1.8" />
              <path d="M16 16l4.5 4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            </svg>
            <span class="generation-result-card__zoom-label">클릭하여 확대</span>
          </span>
        </button>
        <p
          v-else-if="generatedImageLoadFailed"
          class="generation-result-card__image-error"
          role="alert"
        >
          생성 이미지를 불러오지 못했습니다.
        </p>
      </div>

      <div class="generation-result-card__notice" role="note">
        <span class="generation-result-card__notice-icon" aria-hidden="true">i</span>
        <span>
          생성 결과가 원본 캐릭터와 다르다면 프롬프트를 수정하거나 다시
          생성해 주세요.
        </span>
      </div>

      <div class="generation-result-card__actions">
        <button
          type="button"
          class="generation-result-card__action-btn generation-result-card__action-btn--primary"
          :disabled="isSaveDisabled"
          @click="onSave"
        >
          <span class="generation-result-card__action-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" stroke-width="1.8" />
              <circle cx="8.5" cy="10.5" r="1.6" fill="currentColor" />
              <path d="M3 16l5.2-4.2 3.3 2.6 3.5-3.1L21 16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
          <span class="generation-result-card__action-text">
            <strong>갤러리에 저장</strong>
            <small>{{ saveDescription }}</small>
          </span>
        </button>

        <button
          type="button"
          class="generation-result-card__action-btn generation-result-card__action-btn--secondary"
          :disabled="isDownloadDisabled"
          @click="onDownload"
        >
          <span class="generation-result-card__action-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 4v10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
              <path d="M8 10l4 4 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M5 18h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            </svg>
          </span>
          <span class="generation-result-card__action-text">
            <strong>PNG 다운로드</strong>
            <small>파일 저장</small>
          </span>
        </button>

        <button
          type="button"
          class="generation-result-card__action-btn generation-result-card__action-btn--secondary"
          :disabled="isRegenerateDisabled"
          @click="onRegenerate"
        >
          <span class="generation-result-card__action-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3z" fill="currentColor" />
              <path d="M18.5 14.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1z" fill="currentColor" />
            </svg>
          </span>
          <span class="generation-result-card__action-text">
            <strong>다시 생성하기</strong>
            <small>{{ regenerateDescription }}</small>
          </span>
        </button>
      </div>

      <span
        v-if="result.savedToGallery"
        class="generation-result-card__badge generation-result-card__badge--inline"
      >
        저장됨
      </span>

      <ErrorMessage :message="saveMessage" variant="success" />
      <ErrorMessage :message="saveErrorMessage" variant="error" />
      <ErrorMessage :message="downloadErrorMessage" variant="error" />
      <ErrorMessage
        v-if="index === 0"
        :message="regenerateErrorMessage"
        variant="error"
      />

      <div class="generation-result-card__accordions">
        <div class="generation-result-card__accordion">
          <button
            type="button"
            class="generation-result-card__accordion-trigger"
            :aria-expanded="isFinalPromptOpen"
            @click="toggleFinalPromptAccordion"
          >
            <span>최종 프롬프트</span>
            <span aria-hidden="true">{{ isFinalPromptOpen ? '▲' : '▼' }}</span>
          </button>
          <div
            v-if="isFinalPromptOpen && hasFinalPrompt"
            class="generation-result-card__accordion-panel"
          >
            <p class="generation-result-card__prompt-text">
              {{ result.finalPrompt.trim() }}
            </p>
          </div>
          <p
            v-else-if="!isFinalPromptOpen && hasFinalPrompt"
            class="generation-result-card__accordion-summary"
          >
            {{ result.finalPrompt.trim().slice(0, 80)
            }}{{ result.finalPrompt.trim().length > 80 ? '…' : '' }}
          </p>
        </div>

        <div class="generation-result-card__accordion">
          <button
            type="button"
            class="generation-result-card__accordion-trigger"
            :aria-expanded="isGenerationInfoOpen"
            @click="toggleGenerationInfoAccordion"
          >
            <span>생성 정보</span>
            <span aria-hidden="true">{{ isGenerationInfoOpen ? '▲' : '▼' }}</span>
          </button>
          <div
            v-if="isGenerationInfoOpen"
            class="generation-result-card__accordion-panel"
          >
            <ul class="generation-result-card__info-list">
              <li v-for="line in generationInfoLines" :key="line">{{ line }}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <ImageViewerModal
      :is-open="isViewerOpen"
      :image-url="viewerImageUrl"
      :alt-text="`생성 결과 ${resultNumber}번 이미지`"
      @close="closeImageViewer"
    />
  </article>
</template>

<style scoped>
.generation-result-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1px solid #e4d8ff;
  border-radius: 16px;
  background: #ffffff;
}

.generation-result-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.generation-result-card__header--collapsed {
  margin-bottom: 0;
}

.generation-result-card__header-main {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.generation-result-card__title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #111827;
}

.generation-result-card__badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: #f1ebff;
  color: #6d3df2;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.generation-result-card__badge--inline {
  align-self: flex-start;
}

.generation-result-card__header-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.generation-result-card__toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 6px 12px;
  border: 1px solid #e4d8ff;
  border-radius: 10px;
  background: #ffffff;
  color: #6d3df2;
  font-family: var(--sans);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
}

.generation-result-card__remove-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid #e4d8ff;
  border-radius: 999px;
  background: #ffffff;
  color: #7c86a3;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
}

.generation-result-card__remove-btn:hover:not(:disabled) {
  background: #fff1f2;
  border-color: #fecdd3;
  color: #e11d48;
}

.generation-result-card__remove-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(225, 29, 72, 0.18);
}

.generation-result-card__remove-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.generation-result-card__toggle-icon {
  font-size: 11px;
}

.generation-result-card__collapsed {
  display: flex;
  align-items: center;
  gap: 14px;
}

.generation-result-card__collapsed-thumb {
  width: 56px;
  height: 56px;
  border-radius: 10px;
  object-fit: contain;
  background: #faf7ff;
  border: 1px solid #ddd2ff;
}

.generation-result-card__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.generation-result-card__image-box {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 240px;
  padding: 12px;
  border: 1px solid #ddd2ff;
  border-radius: 16px;
  background: #ffffff;
  overflow: hidden;
}

.generation-result-card__image-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
}

.generation-result-card__image-btn--thumb {
  width: auto;
}

.generation-result-card__image-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 4px rgba(109, 61, 242, 0.18);
  border-radius: 12px;
}

.generation-result-card__image {
  display: block;
  width: 100%;
  max-height: 300px;
  object-fit: contain;
}

.generation-result-card__zoom-hint {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 12px;
  background: rgba(17, 24, 39, 0.45);
  color: #ffffff;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.generation-result-card__image-btn:hover .generation-result-card__zoom-hint,
.generation-result-card__image-btn:focus-visible .generation-result-card__zoom-hint {
  opacity: 1;
}

.generation-result-card__zoom-hint svg {
  width: 28px;
  height: 28px;
}

.generation-result-card__zoom-label {
  font-size: 13px;
  font-weight: 700;
}

.generation-result-card__image-error {
  margin: 0;
  padding: 16px;
  font-size: 13px;
  line-height: 1.5;
  text-align: center;
  color: #ff4d6d;
}

.generation-result-card__notice {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  border: 1px solid #e4d8ff;
  border-radius: 14px;
  background: #ffffff;
  color: #7c86a3;
  font-size: 13px;
  line-height: 1.55;
}

.generation-result-card__notice-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: #f1ebff;
  color: #6d3df2;
  font-size: 13px;
  font-weight: 800;
  flex-shrink: 0;
}

.generation-result-card__actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  width: 100%;
}

.generation-result-card__action-btn {
  min-height: 82px;
  border-radius: 16px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
  cursor: pointer;
  font-family: var(--sans);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease;
}

.generation-result-card__action-btn:hover:not(:disabled) {
  transform: translateY(-2px);
}

.generation-result-card__action-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 4px rgba(109, 61, 242, 0.18);
}

.generation-result-card__action-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
}

.generation-result-card__action-btn--primary {
  color: #ffffff;
  border: none;
  background: linear-gradient(135deg, #a855f7, #6d3df2);
  box-shadow: 0 16px 32px rgba(109, 61, 242, 0.28);
}

.generation-result-card__action-btn--secondary {
  color: #6d3df2;
  background: #ffffff;
  border: 1px solid #cdbdff;
  box-shadow: 0 10px 24px rgba(80, 60, 160, 0.08);
}

.generation-result-card__action-btn--secondary:hover:not(:disabled) {
  background: #faf7ff;
  border-color: #6d3df2;
}

.generation-result-card__action-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.generation-result-card__action-icon svg {
  width: 20px;
  height: 20px;
}

.generation-result-card__action-btn--primary .generation-result-card__action-icon {
  background: rgba(255, 255, 255, 0.18);
}

.generation-result-card__action-btn--secondary .generation-result-card__action-icon {
  background: #f1ebff;
}

.generation-result-card__action-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.generation-result-card__action-text strong {
  font-size: 15px;
  font-weight: 800;
  line-height: 1.2;
  white-space: nowrap;
}

.generation-result-card__action-text small {
  font-size: 12px;
  font-weight: 500;
  line-height: 1.25;
  white-space: nowrap;
  opacity: 0.78;
}

.generation-result-card__accordions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.generation-result-card__accordion {
  border: 1px solid #e4d8ff;
  border-radius: 14px;
  background: #ffffff;
  overflow: hidden;
}

.generation-result-card__accordion-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 48px;
  padding: 12px 16px;
  border: none;
  background: transparent;
  color: #111827;
  font-family: var(--sans);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.generation-result-card__accordion-panel {
  padding: 0 16px 16px;
}

.generation-result-card__accordion-summary {
  margin: 0;
  padding: 0 16px 14px;
  font-size: 13px;
  line-height: 1.5;
  color: #7c86a3;
}

.generation-result-card__prompt-text {
  margin: 0;
  padding: 14px 16px;
  border: 1px solid #e4d8ff;
  border-radius: 12px;
  background: #faf7ff;
  color: #111827;
  font-size: 14px;
  line-height: 1.55;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
  max-height: 180px;
  overflow-y: auto;
}

.generation-result-card__info-list {
  margin: 0;
  padding: 14px 16px 14px 32px;
  border: 1px solid #e4d8ff;
  border-radius: 12px;
  background: #faf7ff;
  color: #111827;
  font-size: 14px;
  line-height: 1.6;
}

@media (max-width: 900px) {
  .generation-result-card__actions {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .generation-result-card__image-box {
    min-height: 200px;
  }
}
</style>
