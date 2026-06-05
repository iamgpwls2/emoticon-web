<script setup>
import { computed, ref } from 'vue'
import ImageUploader from '../components/ImageUploader.vue'
import PromptForm from '../components/PromptForm.vue'
import ErrorMessage from '../components/ErrorMessage.vue'
import { isPromptFormComplete } from '../utils/inputValidation.js'

const uploadedImage = ref(null)
const promptForm = ref({
  emotion: '',
  motion: '',
  text: '',
})
const promptTouched = ref(false)

const hasImage = computed(() => Boolean(uploadedImage.value))

const isFormComplete = computed(() =>
  isPromptFormComplete({
    emotion: promptForm.value.emotion,
    motion: promptForm.value.motion,
    text: promptForm.value.text,
    hasImage: hasImage.value,
  })
)

const imageHintMessage = computed(() => {
  if (hasImage.value) return ''

  const { emotion, motion, text } = promptForm.value
  const hasPromptInput = Boolean(emotion || motion || text.trim())

  if (!promptTouched.value && !hasPromptInput) return ''

  return '이미지를 먼저 업로드해 주세요.'
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

function handleNextStep() {
  console.log('Next step:', {
    uploadedImage: uploadedImage.value,
    prompt: { ...promptForm.value },
  })
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
      </div>

      <div class="create-page__actions">
        <ErrorMessage :message="imageHintMessage" />
        <button
          type="button"
          class="create-page__next-btn"
          :disabled="!isFormComplete"
          @click="handleNextStep"
        >
          다음 단계
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
