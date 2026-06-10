<script setup>
import { computed } from 'vue'
import ErrorMessage from './ErrorMessage.vue'

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
  uploadRequired: {
    type: Boolean,
    default: false,
  },
  storyPrompt: {
    type: String,
    default: '',
  },
  finalPrompt: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['open-chat', 'update:finalPrompt'])

const canRefine = computed(() =>
  Boolean(props.emotion?.trim() && props.motion?.trim())
)

const hasReferenceImage = computed(() => Boolean(props.originalImageUrl?.trim()))

const isButtonDisabled = computed(
  () => !canRefine.value || props.uploadRequired
)

const hasFinalPrompt = computed(() => Boolean(props.finalPrompt?.trim()))

function handleFinalPromptInput(event) {
  emit('update:finalPrompt', event.target.value)
}

function handleOpenChat() {
  if (isButtonDisabled.value) return
  emit('open-chat')
}
</script>

<template>
  <div class="prompt-refiner">
    <button
      type="button"
      class="prompt-refiner__btn"
      :disabled="isButtonDisabled"
      @click="handleOpenChat"
    >
      프롬프트 구체화하기
    </button>

    <p v-if="uploadRequired" class="prompt-refiner__hint prompt-refiner__hint--warning">
      이미지를 변경했습니다. 새 이미지를 먼저 업로드해야 프롬프트 구체화와 이미지
      생성이 가능합니다.
    </p>

    <p v-else-if="canRefine && !hasReferenceImage" class="prompt-refiner__hint">
      원본 캐릭터 보존 품질을 위해 이미지 업로드 후 구체화하는 것을 권장합니다.
    </p>

    <div v-if="storyPrompt" class="prompt-refiner__field">
      <label class="prompt-refiner__label">스토리 프롬프트</label>
      <p class="prompt-refiner__story">{{ storyPrompt }}</p>
    </div>

    <div v-if="hasFinalPrompt" class="prompt-refiner__field">
      <label class="prompt-refiner__label" for="prompt-refiner-final">
        최종 프롬프트
      </label>
      <textarea
        id="prompt-refiner-final"
        :value="finalPrompt"
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
  margin-top: 8px;
  text-align: left;
}

.prompt-refiner__btn {
  width: 100%;
  min-height: 56px;
  font-family: var(--sans);
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
  padding: 0 20px;
  border: 1.5px solid #ddd2ff;
  border-radius: 11px;
  color: #6d3df2;
  background: #ffffff;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease,
    opacity 0.2s ease;
}

.prompt-refiner__btn:hover:not(:disabled) {
  border-color: #c4b5fd;
  background: #faf7ff;
  box-shadow: 0 4px 16px rgba(109, 61, 242, 0.08);
}

.prompt-refiner__btn:focus-visible {
  outline: 2px solid #6d3df2;
  outline-offset: 2px;
}

.prompt-refiner__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  color: #7c86a3;
  background: #f7f4ff;
  border-color: #e4defa;
  box-shadow: none;
}

.prompt-refiner__hint {
  margin: 0;
  padding: 12px 14px;
  font-size: 13px;
  line-height: 1.5;
  color: #7c86a3;
  background: #faf7ff;
  border: 1px solid #e4defa;
  border-radius: 10px;
}

.prompt-refiner__hint--warning {
  color: #92400e;
  background: #fffbeb;
  border-color: #fde68a;
}

.prompt-refiner__field {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.prompt-refiner__label {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}

.prompt-refiner__story {
  margin: 0;
  padding: 14px 16px;
  border: 1px solid #ddd2ff;
  border-radius: 12px;
  background: #faf7ff;
  color: #111827;
  font-size: 15px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}

.prompt-refiner__control {
  width: 100%;
  max-width: 100%;
  min-height: 120px;
  max-height: 180px;
  overflow-y: auto;
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

.prompt-refiner__control:focus-visible {
  outline: none;
  border-color: #6d3df2;
  box-shadow: 0 0 0 3px rgba(109, 61, 242, 0.12);
}

@media (max-width: 480px) {
  .prompt-refiner {
    gap: 14px;
  }

  .prompt-refiner__control {
    padding: 12px 14px;
    font-size: 15px;
  }
}
</style>
