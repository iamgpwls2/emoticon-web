<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import ImageUploader from '../components/ImageUploader.vue'
import PromptForm from '../components/PromptForm.vue'
import PromptRefiner from '../components/PromptRefiner.vue'
import PromptChatModal from '../components/PromptChatModal.vue'
import ErrorMessage from '../components/ErrorMessage.vue'
import GenerationResultCard from '../components/GenerationResultCard.vue'
import { supabase } from '../lib/supabase.js'
import { useGenerationJob } from '../composables/useGenerationJob.js'
import { useImageMask } from '../composables/useImageMask.js'
import { showAppToast } from '../composables/useAppToast.js'
import { saveGenerationToGallery } from '../services/generation.service.js'
import { isPromptFormComplete } from '../utils/inputValidation.js'
import { toUserErrorMessage } from '../utils/apiError.js'
import { downloadImage } from '../utils/downloadImage.js'

const {
  isGenerating,
  generationResults,
  generationError,
  savedInput,
  startGeneration,
  toggleResult,
  markAsSaved,
  removeResult,
  resetGeneration,
  onComplete,
  offComplete,
} = useGenerationJob()

const { generateMask } = useImageMask()

const uploadedImage = ref(null)
const maskBlob = ref(null)
const isMaskGenerating = ref(false)
const isUploadRequired = ref(false)
const promptForm = ref({
  emotion: '',
  motion: '',
  text: '',
})
const storyPrompt = ref('')
const finalPrompt = ref('')
const promptTouched = ref(false)
const generationErrorMessage = ref('')
const regenerateErrorMessage = ref('')
const isPromptChatModalOpen = ref(false)
const restoredPromptForm = ref(null)
const savingIndex = ref(-1)
const saveMessages = ref({})
const saveErrors = ref({})
const downloadErrors = ref({})

const DOWNLOAD_FAILED_MESSAGE =
  '이미지 다운로드에 실패했습니다. 이미지를 새 탭에서 열어 저장해 주세요.'

const hasImage = computed(() => Boolean(uploadedImage.value))

const uploaderPreviewUrl = computed(() => originalImageUrl.value || null)

const uploaderPreviewFileName = computed(
  () => uploadedImage.value?.name?.trim() || null
)

const originalImageUrl = computed(() => {
  const image = uploadedImage.value
  if (!image) return ''

  if (image.url?.trim()) {
    return image.url.trim()
  }

  const { bucket, path } = image
  if (bucket && path) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    const publicUrl = data.publicUrl?.trim()
    if (publicUrl) return publicUrl
  }

  if (image.previewUrl?.trim()) {
    return image.previewUrl.trim()
  }

  return ''
})

const isFormComplete = computed(() =>
  isPromptFormComplete({
    emotion: promptForm.value.emotion,
    motion: promptForm.value.motion,
    text: promptForm.value.text,
    hasImage: hasImage.value,
  })
)

const hasFinalPrompt = computed(() => Boolean(finalPrompt.value.trim()))

const isGenerateDisabled = computed(
  () =>
    !isFormComplete.value ||
    !hasFinalPrompt.value ||
    isGenerating.value ||
    isUploadRequired.value
)

const uploadRequiredMessage = computed(() =>
  isUploadRequired.value
    ? '이미지가 변경되었습니다. 먼저 다시 업로드해 주세요.'
    : ''
)

const generateButtonLabel = computed(() =>
  isGenerating.value ? '이미지 생성 중...' : '이모티콘 생성'
)

const canRegenerate = computed(
  () =>
    isFormComplete.value &&
    hasFinalPrompt.value &&
    !isUploadRequired.value
)

const showEmptyState = computed(
  () => generationResults.value.length === 0 && !isGenerating.value
)

const showResultsPanel = computed(
  () => generationResults.value.length > 0 || isGenerating.value
)

const resultsTitle = computed(() => {
  const count = generationResults.value.length
  if (count >= 2) {
    return `3. 생성 결과 (총 ${count}개)`
  }
  return '3. 생성 결과'
})

const imageHintMessage = computed(() => {
  if (hasImage.value) return ''

  const { emotion, motion, text } = promptForm.value
  const hasPromptInput = Boolean(emotion || motion || text.trim())

  if (!promptTouched.value && !hasPromptInput) return ''

  return '이미지를 먼저 업로드해 주세요.'
})

const finalPromptHintMessage = computed(() => {
  if (hasFinalPrompt.value || !isFormComplete.value) return ''
  return '프롬프트 구체화 후 최종 프롬프트를 확인해 주세요.'
})

const promptChatContext = computed(() => ({
  emotion: promptForm.value.emotion,
  motion: promptForm.value.motion,
  text: promptForm.value.text,
}))

function onOpenPromptChat() {
  isPromptChatModalOpen.value = true
}

function onClosePromptChat() {
  isPromptChatModalOpen.value = false
}

function onPromptChatComplete(prompt) {
  finalPrompt.value = prompt
  isPromptChatModalOpen.value = false
}

function resetStateOnImageChange() {
  promptForm.value = {
    emotion: '',
    motion: '',
    text: '',
  }
  restoredPromptForm.value = {
    emotion: '',
    motion: '',
    text: '',
  }
  finalPrompt.value = ''
  resetGeneration()
}

function onFileSelected() {
  uploadedImage.value = null
  maskBlob.value = null
  isUploadRequired.value = true
}

function onFileRemoved() {
  if (uploadedImage.value) {
    resetStateOnImageChange()
  }

  uploadedImage.value = null
  maskBlob.value = null
  isUploadRequired.value = true
}

async function onUploaded(result) {
  if (uploadedImage.value) {
    resetStateOnImageChange()
  }

  uploadedImage.value = {
    ...result,
    name: result.name?.trim() || result.path?.split('/').pop()?.trim() || '',
  }
  isUploadRequired.value = false

  if (!result.file) return

  isMaskGenerating.value = true
  try {
    maskBlob.value = await generateMask(result.file)
  } catch (e) {
    console.warn('마스크 생성 실패, 마스크 없이 진행:', e)
    maskBlob.value = null
  } finally {
    isMaskGenerating.value = false
  }
}

function onFormUpdate(value) {
  promptForm.value = value
}

function onPromptInteraction() {
  promptTouched.value = true
}

function buildGenerationPayload() {
  return {
    originalImageUrl: originalImageUrl.value || undefined,
    emotion: promptForm.value.emotion,
    motion: promptForm.value.motion,
    inputText: promptForm.value.text,
    storyPrompt: storyPrompt.value,
    finalPrompt: finalPrompt.value,
    maskBlob: maskBlob.value ?? null,
  }
}

function buildInputSnapshot() {
  const image = uploadedImage.value
  const imageUrl = originalImageUrl.value
  const imageName =
    image?.name?.trim() || image?.path?.split('/').pop()?.trim() || ''

  return {
    uploadedImageUrl: imageUrl || undefined,
    uploadedImageName: imageName || undefined,
    uploadedImage: image,
    emotion: promptForm.value.emotion,
    motion: promptForm.value.motion,
    inputText: promptForm.value.text,
    finalPrompt: finalPrompt.value,
    storyPrompt: storyPrompt.value,
  }
}

function restoreSavedInput() {
  if (!savedInput.value) return

  const snapshot = savedInput.value

  if (snapshot.uploadedImageUrl) {
    uploadedImage.value = {
      ...(snapshot.uploadedImage ?? {}),
      url: snapshot.uploadedImageUrl,
      name: snapshot.uploadedImageName ?? snapshot.uploadedImage?.name ?? '',
    }
    isUploadRequired.value = false
  } else if (snapshot.uploadedImage) {
    uploadedImage.value = snapshot.uploadedImage
    isUploadRequired.value = false
  } else {
    uploadedImage.value = null
    isUploadRequired.value = true
  }

  promptForm.value = {
    emotion: snapshot.emotion ?? '',
    motion: snapshot.motion ?? '',
    text: snapshot.inputText ?? '',
  }
  restoredPromptForm.value = { ...promptForm.value }
  finalPrompt.value = snapshot.finalPrompt ?? ''
  storyPrompt.value = snapshot.storyPrompt ?? ''
}

function handleGenerationComplete() {
  generationErrorMessage.value = ''
  regenerateErrorMessage.value = ''
}

function restorePageState() {
  restoreSavedInput()

  if (generationError.value && generationResults.value.length === 0) {
    generationErrorMessage.value = generationError.value
  }
}

onMounted(() => {
  restorePageState()
  onComplete(handleGenerationComplete)
})

onBeforeRouteLeave(() => {
  if (isGenerating.value) {
    showAppToast('이미지 생성이 백그라운드에서 계속됩니다.')
  }
  return true
})

onBeforeUnmount(() => {
  offComplete(handleGenerationComplete)
})

async function runGeneration() {
  if (isGenerating.value || isUploadRequired.value) return false

  if (!finalPrompt.value.trim()) {
    generationErrorMessage.value = 'finalPrompt는 필수값입니다.'
    return false
  }

  const payload = buildGenerationPayload()
  await startGeneration(payload, buildInputSnapshot())
  return true
}

async function handleGenerateImage() {
  generationErrorMessage.value = ''
  regenerateErrorMessage.value = ''

  const started = await runGeneration()
  if (!started) return

  if (generationError.value) {
    generationErrorMessage.value = generationError.value
  }
}

async function handleRegenerate() {
  regenerateErrorMessage.value = ''

  const started = await runGeneration()
  if (!started) return

  if (generationError.value) {
    regenerateErrorMessage.value = generationError.value
  }
}

async function handleSave(index) {
  const result = generationResults.value[index]
  if (!result || result.savedToGallery || savingIndex.value !== -1) return

  savingIndex.value = index
  saveErrors.value = { ...saveErrors.value, [index]: '' }
  saveMessages.value = { ...saveMessages.value, [index]: '' }

  try {
    await saveGenerationToGallery(result.id.trim())
    markAsSaved(index)
    saveMessages.value = { ...saveMessages.value, [index]: '저장되었습니다.' }
  } catch (err) {
    saveErrors.value = {
      ...saveErrors.value,
      [index]: toUserErrorMessage(err, '갤러리 저장에 실패했습니다.'),
    }
  } finally {
    savingIndex.value = -1
  }
}

async function handleDownload(index) {
  const result = generationResults.value[index]
  if (!result?.generatedImageUrl?.trim()) return

  downloadErrors.value = { ...downloadErrors.value, [index]: '' }

  try {
    const id = result.id?.trim()
    const filename = id ? `emoticon-${id}.png` : 'emoticon-result.png'
    await downloadImage(result.generatedImageUrl.trim(), filename)
  } catch {
    downloadErrors.value = {
      ...downloadErrors.value,
      [index]: DOWNLOAD_FAILED_MESSAGE,
    }
  }
}

function handleRemoveResult(index) {
  removeResult(index)
}
</script>

<template>
  <section class="create-page create-page--builder">
    <div class="create-page__decor" aria-hidden="true">
      <span class="create-page__sparkle create-page__sparkle--1">✦</span>
      <span class="create-page__sparkle create-page__sparkle--2">✦</span>
      <span class="create-page__sparkle create-page__sparkle--3">✦</span>
      <span class="create-page__circle create-page__circle--1" />
      <span class="create-page__circle create-page__circle--2" />
      <span class="create-page__dots create-page__dots--1" />
      <span class="create-page__dots create-page__dots--2" />
    </div>

    <div class="create-page__inner">
      <header class="create-page__header generate-hero">
        <h1 class="create-page__title">이모티콘 생성</h1>
        <p class="create-page__lead">
          이미지를 업로드하고 감정·모션을 선택한 뒤 프롬프트를 구체화합니다.
          이모티콘 텍스트는 선택 사항입니다.
        </p>
      </header>

      <section class="generate-workspace">
        <section class="generate-input-panel" aria-label="이모티콘 입력">
          <div class="create-page__section">
            <h2 class="create-page__section-title">1. 이미지 업로드</h2>
            <ImageUploader
              :preview-url="uploaderPreviewUrl"
              :preview-file-name="uploaderPreviewFileName"
              @uploaded="onUploaded"
              @file-selected="onFileSelected"
              @file-removed="onFileRemoved"
            />
            <ErrorMessage :message="uploadRequiredMessage" variant="hint" />
          </div>

          <div class="create-page__section">
            <h2 class="create-page__section-title">2. 이모티콘 설정</h2>
            <PromptForm
              :initial-form="restoredPromptForm"
              @update:form="onFormUpdate"
              @interaction="onPromptInteraction"
            />
            <fieldset
              class="create-page__refiner-fieldset"
              :disabled="isGenerating"
            >
              <PromptRefiner
                :emotion="promptForm.emotion"
                :motion="promptForm.motion"
                :input-text="promptForm.text"
                :original-image-url="originalImageUrl"
                :upload-required="isUploadRequired"
                :story-prompt="storyPrompt"
                :final-prompt="finalPrompt"
                @open-chat="onOpenPromptChat"
              />

              <div class="create-page__final-prompt-field">
                <label
                  class="create-page__final-prompt-label"
                  for="create-page-final-prompt"
                >
                  최종 프롬프트
                </label>
                <textarea
                  id="create-page-final-prompt"
                  v-model="finalPrompt"
                  class="create-page__final-prompt-input"
                  rows="6"
                  placeholder="최종 프롬프트를 직접 수정할 수 있습니다"
                />
              </div>
            </fieldset>
          </div>

          <div class="create-page__actions">
            <ErrorMessage :message="imageHintMessage" variant="hint" />
            <ErrorMessage :message="finalPromptHintMessage" variant="hint" />
            <ErrorMessage :message="generationErrorMessage" variant="error" />
            <p v-if="isMaskGenerating" class="create-page__mask-status" role="status">
              캐릭터 분석 중...
            </p>
            <button
              type="button"
              class="create-page__generate-btn"
              :disabled="isGenerateDisabled"
              @click="handleGenerateImage"
            >
              {{ generateButtonLabel }}
            </button>
          </div>
        </section>

        <section
          class="generation-result generate-result-panel"
          :aria-busy="isGenerating"
          aria-label="생성 결과"
        >
          <div class="generation-result__header">
            <h2 class="generation-result__title">{{ resultsTitle }}</h2>
          </div>

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

          <div v-else-if="showResultsPanel" class="generation-result__list">
            <GenerationResultCard
              v-for="(result, index) in generationResults"
              :key="result.id"
              :result="result"
              :index="index"
              :is-generating="isGenerating"
              :can-regenerate="canRegenerate"
              :upload-required="isUploadRequired"
              :is-saving="savingIndex === index"
              :save-message="saveMessages[index] || ''"
              :save-error-message="saveErrors[index] || ''"
              :download-error-message="downloadErrors[index] || ''"
              :regenerate-error-message="regenerateErrorMessage"
              @toggle="toggleResult"
              @save="handleSave"
              @download="handleDownload"
              @regenerate="handleRegenerate"
              @remove="handleRemoveResult"
            />

            <div
              v-if="isGenerating"
              class="generation-result__loading generation-result__loading--inline"
              role="status"
            >
              <div class="generation-result__spinner" aria-hidden="true" />
              <p class="generation-result__loading-text">
                이미지를 생성하는 중입니다.
              </p>
            </div>
          </div>
        </section>
      </section>
    </div>

    <PromptChatModal
      :is-open="isPromptChatModalOpen"
      :context="promptChatContext"
      @close="onClosePromptChat"
      @complete="onPromptChatComplete"
    />
  </section>
</template>

<style scoped>
/* main.css의 .generate-workspace { align-items: start } 보다 우선 적용 */
.create-page--builder .generate-workspace {
  display: grid;
  grid-template-columns: minmax(420px, 0.9fr) minmax(560px, 1.1fr);
  align-items: stretch;
  gap: 16px;
  width: 100%;
}

.create-page--builder .generate-input-panel {
  height: 100%;
  min-height: 100%;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  position: static;
}

.create-page--builder .generation-result.generate-result-panel {
  height: 100%;
  min-height: 100%;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.generation-result {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  min-width: 0;
  min-height: 0;
  height: 100%;
  text-align: left;
}

.generation-result__header {
  display: flex;
  flex-shrink: 0;
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

.generation-result__list {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
  overflow-y: auto;
}

.generation-result__empty {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 32px 20px;
  border: 1px dashed #cdbdff;
  border-radius: 16px;
  background: #faf7ff;
  text-align: center;
  box-sizing: border-box;
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

.generation-result__loading--inline {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 16px;
  border: 1px solid #e4d8ff;
  border-radius: 16px;
  background: #faf7ff;
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

@keyframes generation-result-spin {
  to {
    transform: rotate(360deg);
  }
}

.create-page__refiner-fieldset :deep(.prompt-refiner__field:has(#prompt-refiner-final)) {
  display: none;
}

.create-page__final-prompt-field {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  margin-top: 8px;
}

.create-page__final-prompt-label {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}

.create-page__final-prompt-input {
  width: 100%;
  max-width: 100%;
  min-height: 120px;
  box-sizing: border-box;
  padding: 14px 16px;
  border: 1px solid #ddd2ff;
  border-radius: 12px;
  background: #ffffff;
  color: #111827;
  font: inherit;
  font-size: 16px;
  line-height: 1.55;
  resize: vertical;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.create-page__final-prompt-input::placeholder {
  color: #9ca3af;
}

.create-page__final-prompt-input:focus {
  outline: none;
  border-color: #6d3df2;
  box-shadow: 0 0 0 3px rgba(109, 61, 242, 0.12);
}

.create-page__mask-status {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: #6d3df2;
}

@media (max-width: 1024px) {
  .create-page--builder .generate-workspace {
    grid-template-columns: 1fr;
  }

  .create-page--builder .generate-input-panel,
  .create-page--builder .generation-result.generate-result-panel {
    width: 100%;
    min-width: 0;
    height: auto;
    min-height: 0;
  }

  .generation-result {
    height: auto;
    flex: none;
  }
}
</style>
