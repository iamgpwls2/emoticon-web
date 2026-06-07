<script setup>
import { computed, ref } from 'vue'
import ErrorMessage from './ErrorMessage.vue'
import { useAsyncState } from '../composables/useAsyncState.js'
import { refinePrompt } from '../services/prompt.service.js'

const props = defineProps({
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
  originalImageUrl: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:storyPrompt', 'update:finalPrompt'])

const storyPrompt = ref('')
const finalPrompt = ref('')
const refined = ref(false)

const {
  loading,
  error: errorMessage,
  successMessage,
  run,
} = useAsyncState({
  fallbackError: '프롬프트 구체화에 실패했습니다. 다시 시도해 주세요.',
})

const canRefine = computed(() =>
  Boolean(
    props.emotion?.trim() &&
      props.motion?.trim() &&
      props.inputText?.trim()
  )
)

const hasReferenceImage = computed(() => Boolean(props.originalImageUrl?.trim()))

const isButtonDisabled = computed(() => !canRefine.value || loading.value)

const refineButtonLabel = computed(() =>
  loading.value ? '구체화 중...' : '프롬프트 구체화하기'
)

function handleFinalPromptInput() {
  emit('update:finalPrompt', finalPrompt.value)
}

async function handleRefine() {
  if (isButtonDisabled.value) return

  const result = await run(
    () =>
      refinePrompt({
        emotion: props.emotion,
        motion: props.motion,
        inputText: props.inputText,
        originalImageUrl: props.originalImageUrl?.trim() || undefined,
      }),
    {
      successMessage: '프롬프트 구체화가 완료되었습니다.',
    }
  )

  if (!result) return

  storyPrompt.value = result.storyPrompt
  finalPrompt.value = result.finalPrompt
  refined.value = true

  emit('update:storyPrompt', result.storyPrompt)
  emit('update:finalPrompt', result.finalPrompt)
}
</script>

<template>
  <div class="prompt-refiner">
    <button
      type="button"
      class="prompt-refiner__btn"
      :disabled="isButtonDisabled"
      :aria-busy="loading"
      @click="handleRefine"
    >
      {{ refineButtonLabel }}
    </button>

    <ErrorMessage
      v-if="loading"
      message="프롬프트를 구체화하는 중입니다..."
      variant="loading"
    />

    <ErrorMessage :message="errorMessage" variant="error" />
    <ErrorMessage :message="successMessage" variant="success" />

    <p v-if="canRefine && !hasReferenceImage" class="prompt-refiner__hint">
      원본 캐릭터 보존 품질을 위해 이미지 업로드 후 구체화하는 것을 권장합니다.
    </p>

    <div v-if="storyPrompt" class="prompt-refiner__field">
      <label class="prompt-refiner__label">스토리 프롬프트</label>
      <p class="prompt-refiner__story">{{ storyPrompt }}</p>
    </div>

    <div v-if="refined" class="prompt-refiner__field">
      <label class="prompt-refiner__label" for="prompt-refiner-final">
        최종 프롬프트
      </label>
      <textarea
        id="prompt-refiner-final"
        v-model="finalPrompt"
        class="prompt-refiner__control"
        rows="6"
        @input="handleFinalPromptInput"
      />
    </div>
  </div>
</template>

<style scoped>
.prompt-refiner {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  text-align: left;
}

.prompt-refiner__btn {
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

.prompt-refiner__btn:hover:not(:disabled) {
  border-color: var(--accent-border);
  box-shadow: var(--shadow);
}

.prompt-refiner__btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.prompt-refiner__btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  color: var(--text);
  background: var(--social-bg);
  border-color: var(--border);
  box-shadow: none;
}

.prompt-refiner__hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--text);
}

.prompt-refiner__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.prompt-refiner__label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-h);
}

.prompt-refiner__story {
  margin: 0;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--code-bg);
  color: var(--text-h);
  font-size: 15px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.prompt-refiner__control {
  width: 100%;
  max-width: 100%;
  min-height: 120px;
  box-sizing: border-box;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text-h);
  font: inherit;
  font-size: 16px;
  line-height: 1.5;
  resize: vertical;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.prompt-refiner__control:focus-visible {
  outline: none;
  border-color: var(--accent-border);
  box-shadow: 0 0 0 3px var(--accent-bg);
}

@media (max-width: 480px) {
  .prompt-refiner {
    max-width: 100%;
    gap: 14px;
  }

  .prompt-refiner__control {
    padding: 10px 12px;
    font-size: 15px;
  }
}
</style>
