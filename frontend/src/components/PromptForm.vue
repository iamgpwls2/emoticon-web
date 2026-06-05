<script setup>
import { computed, ref, watch } from 'vue'
import ErrorMessage from './ErrorMessage.vue'
import {
  EMOTICON_TEXT_MAX_LENGTH,
  validatePromptInput,
} from '../utils/inputValidation.js'

const EMOTION_OPTIONS = [
  '기쁨',
  '슬픔',
  '화남',
  '놀람',
  '부끄러움',
  '신남',
]

const MOTION_OPTIONS = [
  '손 흔들기',
  '점프',
  '울기',
  '박수',
  '하트 보내기',
  '고개 숙이기',
]

const emit = defineEmits(['update:form', 'interaction'])

const emotion = ref('')
const motion = ref('')
const text = ref('')

const touched = ref({
  emotion: false,
  motion: false,
  text: false,
})

const fieldErrors = computed(() => {
  const { errors } = validatePromptInput({
    emotion: emotion.value,
    motion: motion.value,
    text: text.value,
    hasImage: true,
  })

  return {
    emotion: touched.value.emotion ? errors.emotion || '' : '',
    motion: touched.value.motion ? errors.motion || '' : '',
    text: touched.value.text ? errors.text || '' : '',
  }
})

function emitForm() {
  emit('update:form', {
    emotion: emotion.value,
    motion: motion.value,
    text: text.value,
  })
}

function markTouched(field) {
  if (!touched.value[field]) {
    touched.value[field] = true
    emit('interaction')
  }
}

function handleEmotionBlur() {
  markTouched('emotion')
}

function handleEmotionChange() {
  markTouched('emotion')
}

function handleMotionBlur() {
  markTouched('motion')
}

function handleMotionChange() {
  markTouched('motion')
}

function handleTextBlur() {
  markTouched('text')
}

function handleTextInput() {
  if (touched.value.text) return
  markTouched('text')
}

watch([emotion, motion, text], emitForm, { immediate: true })
</script>

<template>
  <form class="prompt-form" novalidate @submit.prevent>
    <div class="prompt-form__field">
      <label for="prompt-emotion">감정</label>
      <select
        id="prompt-emotion"
        v-model="emotion"
        class="prompt-form__control"
        :aria-invalid="Boolean(fieldErrors.emotion)"
        @blur="handleEmotionBlur"
        @change="handleEmotionChange"
      >
        <option value="" disabled>감정을 선택해 주세요</option>
        <option v-for="option in EMOTION_OPTIONS" :key="option" :value="option">
          {{ option }}
        </option>
      </select>
      <ErrorMessage :message="fieldErrors.emotion" />
    </div>

    <div class="prompt-form__field">
      <label for="prompt-motion">모션</label>
      <select
        id="prompt-motion"
        v-model="motion"
        class="prompt-form__control"
        :aria-invalid="Boolean(fieldErrors.motion)"
        @blur="handleMotionBlur"
        @change="handleMotionChange"
      >
        <option value="" disabled>모션을 선택해 주세요</option>
        <option v-for="option in MOTION_OPTIONS" :key="option" :value="option">
          {{ option }}
        </option>
      </select>
      <ErrorMessage :message="fieldErrors.motion" />
    </div>

    <div class="prompt-form__field">
      <div class="prompt-form__label-row">
        <label for="prompt-text">이모티콘 텍스트</label>
        <span class="prompt-form__counter" aria-live="polite">
          {{ text.length }}/{{ EMOTICON_TEXT_MAX_LENGTH }}
        </span>
      </div>
      <input
        id="prompt-text"
        v-model="text"
        type="text"
        class="prompt-form__control"
        :maxlength="EMOTICON_TEXT_MAX_LENGTH"
        placeholder="이모티콘에 넣을 텍스트"
        :aria-invalid="Boolean(fieldErrors.text)"
        @blur="handleTextBlur"
        @input="handleTextInput"
      />
      <ErrorMessage :message="fieldErrors.text" />
    </div>
  </form>
</template>

<style scoped>
.prompt-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  text-align: left;
}

.prompt-form__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.prompt-form__field label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-h);
}

.prompt-form__label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
}

.prompt-form__counter {
  font-size: 13px;
  color: var(--text);
  flex-shrink: 0;
}

.prompt-form__control {
  width: 100%;
  max-width: 100%;
  min-height: 44px;
  box-sizing: border-box;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text-h);
  font: inherit;
  font-size: 16px;
  line-height: 1.4;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.prompt-form__control:focus-visible {
  outline: none;
  border-color: var(--accent-border);
  box-shadow: 0 0 0 3px var(--accent-bg);
}

.prompt-form__control[aria-invalid='true'] {
  border-color: rgba(220, 38, 38, 0.5);
}

select.prompt-form__control {
  cursor: pointer;
  appearance: auto;
}

@media (max-width: 480px) {
  .prompt-form {
    gap: 18px;
    max-width: 100%;
  }

  .prompt-form__control {
    padding: 10px 12px;
  }

  .prompt-form__label-row {
    flex-wrap: wrap;
  }
}
</style>
