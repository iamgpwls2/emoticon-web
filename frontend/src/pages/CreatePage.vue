<script setup>
import { computed, ref } from 'vue'
import ImageUploader from '../components/ImageUploader.vue'
import PromptForm from '../components/PromptForm.vue'
import PromptRefiner from '../components/PromptRefiner.vue'
import ErrorMessage from '../components/ErrorMessage.vue'
import { supabase } from '../lib/supabase.js'
import { createGeneration } from '../services/generation.service.js'
import { isPromptFormComplete } from '../utils/inputValidation.js'

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

const hasImage = computed(() => Boolean(uploadedImage.value))

const originalImageUrl = computed(() => {
  const image = uploadedImage.value
  if (!image) return ''

  if (image.url?.trim()) {
    return image.url.trim()
  }

  const { bucket, path } = image
  if (!bucket || !path) return ''

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
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

async function handleGenerateImage() {
  if (isGenerating.value) return

  if (!finalPrompt.value.trim()) {
    generationErrorMessage.value = 'finalPrompt는 필수값입니다.'
    return
  }

  isGenerating.value = true
  generationErrorMessage.value = ''

  try {
    const result = await createGeneration({
      originalImageUrl: originalImageUrl.value || undefined,
      emotion: promptForm.value.emotion,
      motion: promptForm.value.motion,
      inputText: promptForm.value.text,
      storyPrompt: storyPrompt.value,
      finalPrompt: finalPrompt.value,
    })

    generationId.value = result.id
    generatedImageUrl.value = result.generatedImageUrl
  } catch (err) {
    generationErrorMessage.value =
      err instanceof Error
        ? err.message
        : '이모티콘 생성에 실패했습니다. 다시 시도해 주세요.'
  } finally {
    isGenerating.value = false
  }
}
</script>

<template>
  <section class="create-page">
    <div class="create-page__card">
      <header class="create-page__header">
        <h1>이모티콘 생성</h1>
        <p class="create-page__lead">
          이미지를 업로드하고 감정·모션·텍스트를 입력한 뒤 다음 단계로
          진행합니다.
        </p>
      </header>

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
        <PromptRefiner
          :emotion="promptForm.emotion"
          :motion="promptForm.motion"
          :input-text="promptForm.text"
          :original-image-url="originalImageUrl"
          @update:story-prompt="storyPrompt = $event"
          @update:final-prompt="finalPrompt = $event"
        />
      </div>

      <div v-if="generatedImageUrl" class="create-page__section">
        <h2 class="create-page__section-title">3. 생성 결과</h2>
        <div class="create-page__preview-wrap">
          <img
            :src="generatedImageUrl"
            alt="생성된 이모티콘 미리보기"
            class="create-page__preview"
          />
        </div>
      </div>

      <div class="create-page__actions">
        <ErrorMessage :message="imageHintMessage" />
        <ErrorMessage :message="finalPromptHintMessage" />
        <ErrorMessage :message="generationErrorMessage" />
        <button
          type="button"
          class="create-page__next-btn"
          :disabled="isGenerateDisabled"
          @click="handleGenerateImage"
        >
          {{ generateButtonLabel }}
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.create-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-grow: 1;
  width: 100%;
  box-sizing: border-box;
  padding: 32px 20px;
  text-align: left;
}

.create-page__card {
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.create-page__header h1 {
  font-size: 36px;
  margin: 0 0 12px;
  text-align: center;
  color: var(--text-h);
}

.create-page__lead {
  margin: 0;
  text-align: center;
  line-height: 1.5;
}

.create-page__section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.create-page__section > :not(.create-page__section-title) {
  width: 100%;
  max-width: 480px;
  margin-inline: auto;
}

.create-page__section-title {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  color: var(--text-h);
}

.create-page__actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
  max-width: 480px;
  margin-inline: auto;
  padding-top: 4px;
}

.create-page__next-btn {
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

.create-page__next-btn:hover:not(:disabled) {
  border-color: var(--accent-border);
  box-shadow: var(--shadow);
}

.create-page__next-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.create-page__next-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  color: var(--text);
  background: var(--social-bg);
  border-color: var(--border);
  box-shadow: none;
}

.create-page__preview-wrap {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  background: var(--code-bg);
}

.create-page__preview {
  display: block;
  width: 100%;
  max-height: min(60vh, 360px);
  object-fit: contain;
}

@media (max-width: 480px) {
  .create-page {
    padding: 24px 16px;
  }

  .create-page__card {
    max-width: 100%;
    gap: 24px;
  }

  .create-page__header h1 {
    font-size: 28px;
  }

  .create-page__section-title {
    font-size: 16px;
  }

  .create-page__section > :not(.create-page__section-title),
  .create-page__actions {
    max-width: 100%;
  }
}
</style>
