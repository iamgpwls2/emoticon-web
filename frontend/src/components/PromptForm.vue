<script setup>
import { computed, ref, watch } from 'vue'
import DropdownSelect from './DropdownSelect.vue'
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
  '사랑',
  '짜증',
  '당황',
  '졸림',
  '멋짐',
  '감동',
  '설렘',
  '걱정',
  '응원',
  '감사',
  '미안',
  '자신감',
  '피곤',
  '흥분',
]

const MOTION_OPTIONS = [
  '손 흔들기',
  '점프',
  '울기',
  '박수',
  '하트 보내기',
  '고개 숙이기',
  '윙크',
  '엄지 척',
  '춤추기',
  '누워있기',
  '달리기',
  '안아주기',
  '셀카 포즈',
  '화이팅',
  '인사',
  '고개 돌리기',
  '손가락 하트',
  '축하',
  '빠직거리기',
  '빙글빙글',
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

function handleEmotionChange() {
  markTouched('emotion')
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
      <DropdownSelect
        id="prompt-emotion"
        v-model="emotion"
        :options="EMOTION_OPTIONS"
        placeholder="감정을 선택해 주세요"
        :invalid="Boolean(fieldErrors.emotion)"
        @change="handleEmotionChange"
        @close="markTouched('emotion')"
      />
      <ErrorMessage :message="fieldErrors.emotion" />
    </div>

    <div class="prompt-form__field">
      <label for="prompt-motion">모션</label>
      <DropdownSelect
        id="prompt-motion"
        v-model="motion"
        :options="MOTION_OPTIONS"
        placeholder="모션을 선택해 주세요"
        :invalid="Boolean(fieldErrors.motion)"
        @change="handleMotionChange"
        @close="markTouched('motion')"
      />
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
        placeholder="이모티콘에 넣을 텍스트 (선택)"
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
  gap: 22px;
  width: 100%;
  text-align: left;
}

.prompt-form__field {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.prompt-form__field label {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
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
  color: #7c86a3;
  flex-shrink: 0;
}

.prompt-form__control {
  width: 100%;
  max-width: 100%;
  min-height: 56px;
  box-sizing: border-box;
  padding: 0 16px;
  border: 1px solid #ddd2ff;
  border-radius: 12px;
  background: #ffffff;
  color: #111827;
  font: inherit;
  font-size: 16px;
  line-height: 1.4;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.prompt-form__control::placeholder {
  color: #7c86a3;
}

.prompt-form__control:focus-visible {
  outline: none;
  border-color: #6d3df2;
  box-shadow: 0 0 0 3px rgba(109, 61, 242, 0.12);
}

.prompt-form__control[aria-invalid='true'] {
  border-color: rgba(255, 77, 109, 0.55);
}

.prompt-form__control[aria-invalid='true']:focus-visible {
  box-shadow: 0 0 0 3px rgba(255, 77, 109, 0.12);
}

@media (max-width: 480px) {
  .prompt-form {
    gap: 18px;
  }

  .prompt-form__control {
    min-height: 52px;
    padding: 0 14px;
  }

  .prompt-form__label-row {
    flex-wrap: wrap;
  }
}
</style>
