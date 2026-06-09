<script setup>
import { computed, ref } from 'vue'
import ImageUploader from '../components/ImageUploader.vue'
import PromptForm from '../components/PromptForm.vue'
import PromptRefiner from '../components/PromptRefiner.vue'
import ErrorMessage from '../components/ErrorMessage.vue'
import LoadingOverlay from '../components/LoadingOverlay.vue'
import GenerationResult from '../components/GenerationResult.vue'
import { supabase } from '../lib/supabase.js'
import { createGeneration } from '../services/generation.service.js'
import { isPromptFormComplete } from '../utils/inputValidation.js'
import { toUserErrorMessage } from '../utils/apiError.js'

const uploadedImage = ref(null)
const promptForm = ref({
  emotion: '',
  motion: '',
  text: '',
})
const storyPrompt = ref('')
const finalPrompt = ref('')
const promptTouched = ref(false)
const isGenerating = ref(false)
const generationId = ref('')
const generatedImageUrl = ref('')
const generationErrorMessage = ref('')
const regenerateErrorMessage = ref('')
const lastGenerationPayload = ref(null)

const REGENERATE_FAILED_MESSAGE =
  '다시 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.'

const hasImage = computed(() => Boolean(uploadedImage.value))

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
  () => !isFormComplete.value || !hasFinalPrompt.value || isGenerating.value
)

const generateButtonLabel = computed(() =>
  isGenerating.value ? '이미지 생성 중...' : '이미지 생성'
)

const canRegenerate = computed(() => Boolean(lastGenerationPayload.value))

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

function onUploaded(result) {
  uploadedImage.value = result
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
  }
}

function applyGenerationSuccess(payload, result) {
  generationId.value = result.id
  generatedImageUrl.value = result.generatedImageUrl
  storyPrompt.value = payload.storyPrompt
  finalPrompt.value = payload.finalPrompt
  lastGenerationPayload.value = { ...payload }
}

async function handleGenerateImage() {
  if (isGenerating.value) return

  if (!finalPrompt.value.trim()) {
    generationErrorMessage.value = 'finalPrompt는 필수값입니다.'
    return
  }

  isGenerating.value = true
  generationErrorMessage.value = ''
  regenerateErrorMessage.value = ''

  const payload = buildGenerationPayload()

  try {
    const result = await createGeneration(payload)
    applyGenerationSuccess(payload, result)
  } catch (err) {
    generationErrorMessage.value = toUserErrorMessage(
      err,
      '이모티콘 생성에 실패했습니다. 다시 시도해 주세요.'
    )
  } finally {
    isGenerating.value = false
  }
}

async function handleRegenerate() {
  if (isGenerating.value || !lastGenerationPayload.value) return

  isGenerating.value = true
  regenerateErrorMessage.value = ''

  try {
    const result = await createGeneration(lastGenerationPayload.value)
    applyGenerationSuccess(lastGenerationPayload.value, result)
  } catch (err) {
    regenerateErrorMessage.value = toUserErrorMessage(
      err,
      REGENERATE_FAILED_MESSAGE
    )
  } finally {
    isGenerating.value = false
  }
}
</script>

<template>
  <section class="create-page create-page--builder">
    <LoadingOverlay
      :visible="isGenerating"
      message="이모티콘을 생성하는 중입니다."
    />

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
      <header class="create-page__header">
        <h1 class="create-page__title">이모티콘 생성</h1>
        <p class="create-page__lead">
          이미지를 업로드하고 감정·모션·텍스트를 입력한 뒤 다음 단계로
          진행합니다.
        </p>
      </header>

      <div class="create-builder-card">
        <div class="create-page__section">
          <h2 class="create-page__section-title">1. 이미지 업로드</h2>
          <ImageUploader @uploaded="onUploaded" />
        </div>

        <div class="create-page__section">
          <h2 class="create-page__section-title">2. 이모티콘 설정</h2>
          <PromptForm
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
              @update:story-prompt="storyPrompt = $event"
              @update:final-prompt="finalPrompt = $event"
            />
          </fieldset>
        </div>

        <div class="create-page__actions">
          <ErrorMessage :message="imageHintMessage" variant="hint" />
          <ErrorMessage :message="finalPromptHintMessage" variant="hint" />
          <ErrorMessage :message="generationErrorMessage" variant="error" />
          <button
            type="button"
            class="create-page__generate-btn"
            :disabled="isGenerateDisabled"
            @click="handleGenerateImage"
          >
            {{ generateButtonLabel }}
          </button>
        </div>

        <GenerationResult
          :generated-image-url="generatedImageUrl"
          :original-image-url="originalImageUrl"
          :final-prompt="finalPrompt"
          :generation-id="generationId"
          :is-generating="isGenerating"
          :can-regenerate="canRegenerate"
          :regenerate-error-message="regenerateErrorMessage"
          @regenerate="handleRegenerate"
        />
      </div>
    </div>
  </section>
</template>
