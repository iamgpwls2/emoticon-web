<script setup>
import { computed, ref, watch } from 'vue'
import ErrorMessage from './ErrorMessage.vue'
import { saveGenerationToGallery } from '../services/generation.service.js'
import { toUserErrorMessage } from '../utils/apiError.js'
import { downloadImage } from '../utils/downloadImage.js'

const props = defineProps({
  generatedImageUrl: {
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
  regenerateErrorMessage: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['regenerate', 'saved-to-gallery'])

const generatedImageLoadFailed = ref(false)
const isDownloading = ref(false)
const isSaving = ref(false)
const isSavedToGallery = ref(false)
const isResultCollapsed = ref(false)
const isFinalPromptOpen = ref(false)
const isGenerationInfoOpen = ref(false)
const downloadErrorMessage = ref('')
const saveMessage = ref('')
const saveErrorMessage = ref('')

const DOWNLOAD_FAILED_MESSAGE =
  '이미지 다운로드에 실패했습니다. 이미지를 새 탭에서 열어 저장해 주세요.'

const hasGeneratedImageUrl = computed(() =>
  Boolean(props.generatedImageUrl?.trim())
)
const hasFinalPrompt = computed(() => Boolean(props.finalPrompt?.trim()))
const trimmedGeneratedImageUrl = computed(
  () => props.generatedImageUrl?.trim() || ''
)

const showEmptyState = computed(
  () => !hasGeneratedImageUrl.value && !props.isGenerating
)
const showLoadingState = computed(() => props.isGenerating)
const showResultContent = computed(
  () => hasGeneratedImageUrl.value && !showEmptyState.value
)

const collapseButtonLabel = computed(() =>
  isResultCollapsed.value ? '결과 펼치기' : '결과 접기'
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

const isSaveDisabled = computed(
  () =>
    !hasGeneratedImageUrl.value ||
    !props.generationId?.trim() ||
    props.isGenerating ||
    isSaving.value ||
    isSavedToGallery.value ||
    generatedImageLoadFailed.value
)

const saveDescription = computed(() => {
  if (isSaving.value) return '저장 중...'
  if (isSavedToGallery.value) return '저장 완료'
  return '갤러리에 저장'
})

const isRegenerateDisabled = computed(
  () => props.isGenerating || !props.canRegenerate || props.uploadRequired
)

const downloadDescription = computed(() =>
  isDownloading.value ? '다운로드 중...' : '파일 저장'
)

const regenerateDescription = computed(() =>
  props.isGenerating ? '생성 중...' : '다시 생성'
)

const generationInfoLines = computed(() => {
  const lines = []
  if (props.emotion?.trim()) lines.push(`감정: ${props.emotion.trim()}`)
  if (props.motion?.trim()) lines.push(`모션: ${props.motion.trim()}`)
  if (props.inputText?.trim()) {
    lines.push(`이모티콘 텍스트: ${props.inputText.trim()}`)
  } else {
    lines.push('이모티콘 텍스트: (없음)')
  }
  if (props.generationId?.trim()) {
    lines.push(`생성 ID: ${props.generationId.trim()}`)
  }
  return lines
})

watch(
  () => props.generatedImageUrl,
  () => {
    generatedImageLoadFailed.value = false
    isSavedToGallery.value = false
    saveMessage.value = ''
    saveErrorMessage.value = ''
    isResultCollapsed.value = false
  }
)

watch(
  () => props.generationId,
  () => {
    isSavedToGallery.value = false
    saveMessage.value = ''
    saveErrorMessage.value = ''
  }
)

function onGeneratedImageError() {
  generatedImageLoadFailed.value = true
}

function toggleResultCollapse() {
  isResultCollapsed.value = !isResultCollapsed.value
}

function toggleFinalPromptAccordion() {
  isFinalPromptOpen.value = !isFinalPromptOpen.value
}

function toggleGenerationInfoAccordion() {
  isGenerationInfoOpen.value = !isGenerationInfoOpen.value
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

async function handleSaveToGallery() {
  if (isSaveDisabled.value) return

  isSaving.value = true
  saveErrorMessage.value = ''
  saveMessage.value = ''

  try {
    await saveGenerationToGallery(props.generationId.trim())
    isSavedToGallery.value = true
    saveMessage.value = '저장되었습니다.'
    emit('saved-to-gallery')
  } catch (err) {
    saveErrorMessage.value = toUserErrorMessage(
      err,
      '갤러리 저장에 실패했습니다.'
    )
  } finally {
    isSaving.value = false
  }
}

function handleRegenerateClick() {
  if (isRegenerateDisabled.value) return
  emit('regenerate')
}
</script>

<template>
  <section
    class="generation-result generate-result-panel"
    :data-generation-id="generationId || undefined"
    :aria-busy="isGenerating"
    aria-label="생성 결과"
  >
    <div class="generation-result__header">
      <h2 class="generation-result__title">3. 생성 결과</h2>
      <button
        v-if="showResultContent || showLoadingState"
        type="button"
        class="generation-result__collapse-btn"
        @click="toggleResultCollapse"
      >
        {{ collapseButtonLabel }}
        <span class="generation-result__collapse-icon" aria-hidden="true">
          {{ isResultCollapsed ? '▼' : '▲' }}
        </span>
      </button>
    </div>

    <div
      v-if="isResultCollapsed && hasGeneratedImageUrl"
      class="generation-result__collapsed-preview"
    >
      <img
        :src="trimmedGeneratedImageUrl"
        alt="최근 생성 이미지 미리보기"
        class="generation-result__collapsed-thumb"
      />
      <p class="generation-result__collapsed-text">결과가 접혀 있습니다.</p>
    </div>

    <template v-else>
      <div v-if="showEmptyState" class="generation-result__empty">
        <span class="generation-result__empty-icon" aria-hidden="true">🖼</span>
        <p class="generation-result__empty-title">
          아직 생성된 이미지가 없습니다.
        </p>
        <p class="generation-result__empty-desc">
          왼쪽에서 이미지를 업로드하고 설정을 입력한 뒤 이모티콘 생성을
          눌러주세요.
        </p>
      </div>

      <div v-else-if="showLoadingState && !hasGeneratedImageUrl" class="generation-result__loading">
        <div class="generation-result__spinner" aria-hidden="true" />
        <p class="generation-result__loading-text">이미지를 생성하는 중입니다.</p>
      </div>

      <div v-else class="generation-result__body">
        <div
          v-if="uploadRequired && hasGeneratedImageUrl"
          class="generation-result__reupload-notice"
          role="status"
        >
          새 이미지를 업로드한 뒤 다시 생성해 주세요.
        </div>

        <div
          v-if="showLoadingState"
          class="generation-result__loading generation-result__loading--inline"
          role="status"
        >
          <div class="generation-result__spinner" aria-hidden="true" />
          <p class="generation-result__loading-text">이미지를 생성하는 중입니다.</p>
        </div>

        <div
          v-if="showResultContent"
          class="generation-result__result"
          :class="{
            'generation-result__result--dimmed':
              showLoadingState || uploadRequired,
          }"
        >
          <h3 class="generation-result__result-label">생성 이미지</h3>
          <div class="generation-result__image-box">
            <img
              v-if="!generatedImageLoadFailed"
              :src="trimmedGeneratedImageUrl"
              alt="생성된 이모티콘 미리보기"
              class="generation-result__image"
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

        <template v-if="showResultContent">
          <div class="generation-result__notice" role="note">
            <span class="generation-result__notice-icon" aria-hidden="true">i</span>
            <span>
              생성 결과가 원본 캐릭터와 다르다면 프롬프트를 수정하거나 다시
              생성해 주세요.
            </span>
          </div>

          <div class="generation-result__actions">
            <button
              type="button"
              class="generation-result__action-btn generation-result__action-btn--primary"
              :disabled="isSaveDisabled"
              @click="handleSaveToGallery"
            >
              <span class="generation-result__action-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" stroke-width="1.8" />
                  <circle cx="8.5" cy="10.5" r="1.6" fill="currentColor" />
                  <path d="M3 16l5.2-4.2 3.3 2.6 3.5-3.1L21 16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </span>
              <span class="generation-result__action-text">
                <strong>갤러리에 저장</strong>
                <small>{{ saveDescription }}</small>
              </span>
            </button>

            <button
              type="button"
              class="generation-result__action-btn generation-result__action-btn--secondary"
              :disabled="isDownloadDisabled"
              @click="handleDownload"
            >
              <span class="generation-result__action-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 4v10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                  <path d="M8 10l4 4 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M5 18h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                </svg>
              </span>
              <span class="generation-result__action-text">
                <strong>PNG 다운로드</strong>
                <small>{{ downloadDescription }}</small>
              </span>
            </button>

            <button
              type="button"
              class="generation-result__action-btn generation-result__action-btn--secondary"
              :disabled="isRegenerateDisabled"
              @click="handleRegenerateClick"
            >
              <span class="generation-result__action-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3z" fill="currentColor" />
                  <path d="M18.5 14.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1z" fill="currentColor" />
                </svg>
              </span>
              <span class="generation-result__action-text">
                <strong>다시 생성하기</strong>
                <small>{{ regenerateDescription }}</small>
              </span>
            </button>
          </div>

          <ErrorMessage :message="saveMessage" variant="success" />
          <ErrorMessage :message="saveErrorMessage" variant="error" />
          <ErrorMessage :message="downloadErrorMessage" variant="error" />
          <ErrorMessage :message="regenerateErrorMessage" variant="error" />

          <div class="generation-result__accordions">
            <div class="generation-result__accordion">
              <button
                type="button"
                class="generation-result__accordion-trigger"
                :aria-expanded="isFinalPromptOpen"
                @click="toggleFinalPromptAccordion"
              >
                <span>최종 프롬프트</span>
                <span aria-hidden="true">{{ isFinalPromptOpen ? '▲' : '▼' }}</span>
              </button>
              <div
                v-if="isFinalPromptOpen && hasFinalPrompt"
                class="generation-result__accordion-panel"
              >
                <p class="generation-result__prompt-text">{{ finalPrompt.trim() }}</p>
              </div>
              <p
                v-else-if="!isFinalPromptOpen && hasFinalPrompt"
                class="generation-result__accordion-summary"
              >
                {{ finalPrompt.trim().slice(0, 80)
                }}{{ finalPrompt.trim().length > 80 ? '…' : '' }}
              </p>
            </div>

            <div class="generation-result__accordion">
              <button
                type="button"
                class="generation-result__accordion-trigger"
                :aria-expanded="isGenerationInfoOpen"
                @click="toggleGenerationInfoAccordion"
              >
                <span>생성 정보</span>
                <span aria-hidden="true">{{ isGenerationInfoOpen ? '▲' : '▼' }}</span>
              </button>
              <div
                v-if="isGenerationInfoOpen"
                class="generation-result__accordion-panel"
              >
                <ul class="generation-result__info-list">
                  <li v-for="line in generationInfoLines" :key="line">{{ line }}</li>
                </ul>
              </div>
            </div>
          </div>
        </template>
      </div>
    </template>
  </section>
</template>

<style scoped>
.generation-result {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  min-width: 0;
  text-align: left;
}

.generation-result__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.generation-result__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #6d3df2;
}

.generation-result__collapse-btn {
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
}

.generation-result__collapse-icon {
  font-size: 11px;
}

.generation-result__collapsed-preview {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border: 1px solid #e4d8ff;
  border-radius: 14px;
  background: #faf7ff;
}

.generation-result__collapsed-thumb {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  object-fit: contain;
  background: #ffffff;
  border: 1px solid #ddd2ff;
}

.generation-result__collapsed-text {
  margin: 0;
  font-size: 14px;
  color: #7c86a3;
}

.generation-result__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 320px;
  padding: 32px 20px;
  border: 1px dashed #cdbdff;
  border-radius: 16px;
  background: #faf7ff;
  text-align: center;
}

.generation-result__empty-icon {
  font-size: 36px;
  opacity: 0.65;
}

.generation-result__empty-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #111827;
}

.generation-result__empty-desc {
  margin: 0;
  max-width: 320px;
  font-size: 14px;
  line-height: 1.55;
  color: #7c86a3;
}

.generation-result__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  min-height: 320px;
  padding: 32px 20px;
  border: 1px solid #e4d8ff;
  border-radius: 16px;
  background: #faf7ff;
}

.generation-result__loading--inline {
  min-height: auto;
  margin-bottom: 12px;
  padding: 16px;
}

.generation-result__spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e4d8ff;
  border-top-color: #6d3df2;
  border-radius: 50%;
  animation: generation-result-spin 0.8s linear infinite;
}

.generation-result__loading-text {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #6d3df2;
}

.generation-result__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.generation-result__reupload-notice {
  padding: 14px 18px;
  border: 1px solid #fde68a;
  border-radius: 14px;
  background: #fffbeb;
  color: #92400e;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
  text-align: center;
}

.generation-result__result {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.generation-result__result--dimmed {
  opacity: 0.55;
  pointer-events: none;
}

.generation-result__result-label {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.generation-result__image-box {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 280px;
  padding: 12px;
  border: 1px solid #ddd2ff;
  border-radius: 16px;
  background: #ffffff;
  overflow: hidden;
}

.generation-result__image {
  display: block;
  width: 100%;
  max-height: 320px;
  object-fit: contain;
}

.generation-result__image-error {
  margin: 0;
  padding: 16px;
  font-size: 13px;
  line-height: 1.5;
  text-align: center;
  color: #ff4d6d;
}

.generation-result__notice {
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

.generation-result__notice-icon {
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

.generation-result__actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  width: 100%;
}

.generation-result__action-btn {
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

.generation-result__action-btn:hover:not(:disabled) {
  transform: translateY(-2px);
}

.generation-result__action-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 4px rgba(109, 61, 242, 0.18);
}

.generation-result__action-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
}

.generation-result__action-btn--primary {
  color: #ffffff;
  border: none;
  background: linear-gradient(135deg, #a855f7, #6d3df2);
  box-shadow: 0 16px 32px rgba(109, 61, 242, 0.28);
}

.generation-result__action-btn--secondary {
  color: #6d3df2;
  background: #ffffff;
  border: 1px solid #cdbdff;
  box-shadow: 0 10px 24px rgba(80, 60, 160, 0.08);
}

.generation-result__action-btn--secondary:hover:not(:disabled) {
  background: #faf7ff;
  border-color: #6d3df2;
}

.generation-result__action-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.generation-result__action-icon svg {
  width: 20px;
  height: 20px;
}

.generation-result__action-btn--primary .generation-result__action-icon {
  background: rgba(255, 255, 255, 0.18);
}

.generation-result__action-btn--secondary .generation-result__action-icon {
  background: #f1ebff;
}

.generation-result__action-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.generation-result__action-text strong {
  font-size: 15px;
  font-weight: 800;
  line-height: 1.2;
  white-space: nowrap;
}

.generation-result__action-text small {
  font-size: 12px;
  font-weight: 500;
  line-height: 1.25;
  white-space: nowrap;
  opacity: 0.78;
}

.generation-result__accordions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.generation-result__accordion {
  border: 1px solid #e4d8ff;
  border-radius: 14px;
  background: #ffffff;
  overflow: hidden;
}

.generation-result__accordion-trigger {
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

.generation-result__accordion-panel {
  padding: 0 16px 16px;
}

.generation-result__accordion-summary {
  margin: 0;
  padding: 0 16px 14px;
  font-size: 13px;
  line-height: 1.5;
  color: #7c86a3;
}

.generation-result__prompt-text {
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

.generation-result__info-list {
  margin: 0;
  padding: 14px 16px 14px 32px;
  border: 1px solid #e4d8ff;
  border-radius: 12px;
  background: #faf7ff;
  color: #111827;
  font-size: 14px;
  line-height: 1.6;
}

@keyframes generation-result-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 900px) {
  .generation-result__actions {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .generation-result__image-box {
    min-height: 220px;
  }
}

@media (max-width: 480px) {
  .generation-result__title {
    font-size: 16px;
  }
}
</style>
