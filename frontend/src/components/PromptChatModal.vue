<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import ErrorMessage from './ErrorMessage.vue'
import {
  DYNAMIC_TURN_LIMIT,
  FIXED_PROMPT_SUFFIX,
  getFixedQuestion,
} from '../constants/promptChat.js'
import { chatPrompt } from '../services/prompt.service.js'
import { toUserErrorMessage } from '../utils/apiError.js'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  context: {
    type: Object,
    default: () => ({
      emotion: '',
      motion: '',
      text: '',
    }),
  },
})

const emit = defineEmits(['close', 'complete'])

const messages = ref([])
const phase = ref('dynamic')
const dynamicTurnCount = ref(0)
const isLoading = ref(false)
const inputText = ref('')
const errorMessage = ref('')
const parseError = ref(false)
const pendingQuestion = ref(null)
const completedResult = ref(null)
const chatBodyRef = ref(null)
const isFinalRequestPending = ref(false)

const canSendInput = computed(
  () => Boolean(inputText.value.trim()) && !isLoading.value && !completedResult.value
)

const chatContext = computed(() => ({
  emotion: props.context?.emotion?.trim() || '',
  motion: props.context?.motion?.trim() || '',
  text: props.context?.text?.trim() || '',
}))

function resetState() {
  messages.value = []
  phase.value = 'dynamic'
  dynamicTurnCount.value = 0
  isLoading.value = false
  inputText.value = ''
  errorMessage.value = ''
  parseError.value = false
  pendingQuestion.value = null
  completedResult.value = null
  isFinalRequestPending.value = false
}

function appendAssistantMessage(content) {
  messages.value.push({
    role: 'assistant',
    content,
  })
}

function appendUserMessage(content) {
  messages.value.push({
    role: 'user',
    content,
  })
}

async function scrollToBottom() {
  await nextTick()
  const body = chatBodyRef.value
  if (body) {
    body.scrollTop = body.scrollHeight
  }
}

function showFixedQuestion(fixedPhase) {
  const { message, choices } = getFixedQuestion(fixedPhase, chatContext.value.emotion)

  pendingQuestion.value = {
    message,
    choices,
  }
  appendAssistantMessage(message)
  scrollToBottom()
}

function handleApiResult(result, { appendAssistant = true } = {}) {
  parseError.value = false
  errorMessage.value = ''

  if (result.type === 'question') {
    pendingQuestion.value = {
      message: result.message,
      choices: result.choices,
    }
    if (appendAssistant) {
      appendAssistantMessage(result.message)
    }
    return
  }

  pendingQuestion.value = null
  completedResult.value = {
    message: result.message,
    finalPrompt: result.finalPrompt,
  }
  if (appendAssistant) {
    appendAssistantMessage(result.message)
  }
}

async function requestChat() {
  isLoading.value = true
  errorMessage.value = ''
  parseError.value = false
  isFinalRequestPending.value = false

  try {
    const result = await chatPrompt({
      messages: messages.value,
      context: chatContext.value,
    })
    handleApiResult(result)
    await scrollToBottom()
  } catch (err) {
    const message = toUserErrorMessage(
      err,
      '프롬프트 대화에 실패했습니다. 다시 시도해 주세요.'
    )

    if (message.includes('parse') || message.includes('파싱')) {
      parseError.value = true
    }

    errorMessage.value = message
  } finally {
    isLoading.value = false
  }
}

async function requestFinalPrompt() {
  isLoading.value = true
  errorMessage.value = ''
  parseError.value = false
  isFinalRequestPending.value = true

  try {
    const result = await chatPrompt({
      messages: messages.value,
      context: chatContext.value,
      finalTurn: true,
    })

    if (result.type !== 'complete') {
      throw new Error('프롬프트 대화에 실패했습니다. 다시 시도해 주세요.')
    }

    handleApiResult(result, { appendAssistant: false })
    await scrollToBottom()
  } catch (err) {
    const message = toUserErrorMessage(
      err,
      '프롬프트 대화에 실패했습니다. 다시 시도해 주세요.'
    )

    if (message.includes('parse') || message.includes('파싱')) {
      parseError.value = true
    }

    errorMessage.value = message
  } finally {
    isLoading.value = false
  }
}

async function startConversation() {
  resetState()
  await requestChat()
}

async function submitAnswer(answer) {
  const trimmedAnswer = answer.trim()
  if (!trimmedAnswer || isLoading.value || completedResult.value) return

  appendUserMessage(trimmedAnswer)
  inputText.value = ''
  pendingQuestion.value = null
  await scrollToBottom()

  if (phase.value === 'fixed_1') {
    phase.value = 'fixed_2'
    showFixedQuestion('fixed_2')
    return
  }

  if (phase.value === 'fixed_2') {
    phase.value = 'complete'
    await requestFinalPrompt()
    return
  }

  dynamicTurnCount.value += 1

  if (dynamicTurnCount.value >= DYNAMIC_TURN_LIMIT) {
    phase.value = 'fixed_1'
    showFixedQuestion('fixed_1')
    return
  }

  await requestChat()
}

function handleChoiceClick(choice) {
  if (choice === '직접 입력') {
    return
  }

  submitAnswer(choice)
}

function handleSendInput() {
  if (!canSendInput.value) return
  submitAnswer(inputText.value)
}

function handleRetry() {
  errorMessage.value = ''
  parseError.value = false

  if (phase.value === 'complete' || isFinalRequestPending.value) {
    requestFinalPrompt()
    return
  }

  requestChat()
}

function buildCompletedPrompt(finalPrompt) {
  return `${finalPrompt.trim()} ${FIXED_PROMPT_SUFFIX}`.trim()
}

function handleComplete() {
  if (!completedResult.value?.finalPrompt) return
  emit('complete', buildCompletedPrompt(completedResult.value.finalPrompt))
}

function handleClose() {
  if (isLoading.value) return
  emit('close')
}

function handleBackdropClick(event) {
  if (event.target === event.currentTarget) {
    handleClose()
  }
}

const previewPrompt = computed(() => {
  if (!completedResult.value?.finalPrompt) return ''
  return buildCompletedPrompt(completedResult.value.finalPrompt)
})

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      startConversation()
    } else {
      resetState()
    }
  }
)
</script>

<template>
  <Teleport to="body">
    <Transition name="prompt-chat-modal">
      <div
        v-if="isOpen"
        class="prompt-chat-modal"
        role="presentation"
        @click="handleBackdropClick"
      >
        <div
          class="prompt-chat-modal__panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="prompt-chat-modal-title"
          @click.stop
        >
          <div class="prompt-chat-modal__header">
            <h2 id="prompt-chat-modal-title" class="prompt-chat-modal__title">
              프롬프트 구체화
            </h2>
            <button
              type="button"
              class="prompt-chat-modal__close"
              :disabled="isLoading"
              aria-label="닫기"
              @click="handleClose"
            >
              ×
            </button>
          </div>

          <div ref="chatBodyRef" class="prompt-chat-modal__body">
            <div
              v-for="(message, index) in messages"
              :key="`${message.role}-${index}`"
              class="prompt-chat-modal__message-row"
              :class="{
                'prompt-chat-modal__message-row--assistant':
                  message.role === 'assistant',
                'prompt-chat-modal__message-row--user': message.role === 'user',
              }"
            >
              <span class="prompt-chat-modal__avatar" aria-hidden="true">
                {{ message.role === 'assistant' ? '🤖' : '👤' }}
              </span>
              <p class="prompt-chat-modal__bubble">
                {{ message.content }}
              </p>
            </div>

            <div
              v-if="pendingQuestion && !isLoading"
              class="prompt-chat-modal__choices"
            >
              <button
                v-for="choice in pendingQuestion.choices"
                :key="choice"
                type="button"
                class="prompt-chat-modal__choice"
                :class="{
                  'prompt-chat-modal__choice--custom': choice === '직접 입력',
                }"
                @click="handleChoiceClick(choice)"
              >
                {{ choice }}
              </button>
            </div>

            <div v-if="isLoading" class="prompt-chat-modal__loading">
              <ErrorMessage
                message="답변을 생성하는 중입니다..."
                variant="loading"
              />
            </div>

            <div
              v-if="completedResult"
              class="prompt-chat-modal__complete"
            >
              <label class="prompt-chat-modal__preview-label">
                완성된 프롬프트
              </label>
              <p class="prompt-chat-modal__preview">
                {{ previewPrompt }}
              </p>
              <button
                type="button"
                class="prompt-chat-modal__btn prompt-chat-modal__btn--primary"
                @click="handleComplete"
              >
                이 프롬프트로 생성하기
              </button>
            </div>

            <ErrorMessage :message="errorMessage" variant="error" />

            <button
              v-if="parseError || errorMessage"
              type="button"
              class="prompt-chat-modal__retry"
              :disabled="isLoading"
              @click="handleRetry"
            >
              다시 시도
            </button>
          </div>

          <div
            v-if="!completedResult"
            class="prompt-chat-modal__footer"
          >
            <input
              v-model="inputText"
              type="text"
              class="prompt-chat-modal__input"
              placeholder="직접 입력"
              :disabled="isLoading"
              @keydown.enter.prevent="handleSendInput"
            />
            <button
              type="button"
              class="prompt-chat-modal__btn prompt-chat-modal__btn--primary"
              :disabled="!canSendInput"
              @click="handleSendInput"
            >
              전송
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.prompt-chat-modal {
  position: fixed;
  inset: 0;
  z-index: 140;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(17, 24, 39, 0.35);
  backdrop-filter: blur(4px);
}

.prompt-chat-modal__panel {
  display: flex;
  flex-direction: column;
  width: min(560px, 100%);
  max-height: min(720px, calc(100vh - 40px));
  border: 1px solid #e8e2f8;
  border-radius: 20px;
  background: #ffffff;
  box-shadow: 0 24px 60px rgba(80, 60, 160, 0.18);
  overflow: hidden;
}

.prompt-chat-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 24px 16px;
  border-bottom: 1px solid #f0ebff;
}

.prompt-chat-modal__title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #111827;
}

.prompt-chat-modal__close {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 10px;
  background: #fbf8ff;
  color: #7c86a3;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
}

.prompt-chat-modal__close:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.prompt-chat-modal__body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.prompt-chat-modal__message-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.prompt-chat-modal__message-row--user {
  flex-direction: row-reverse;
}

.prompt-chat-modal__avatar {
  flex-shrink: 0;
  width: 28px;
  text-align: center;
}

.prompt-chat-modal__bubble {
  margin: 0;
  max-width: min(100%, 420px);
  padding: 12px 14px;
  border-radius: 14px;
  font-size: 15px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}

.prompt-chat-modal__message-row--assistant .prompt-chat-modal__bubble {
  background: #faf7ff;
  border: 1px solid #e8e2f8;
  color: #111827;
}

.prompt-chat-modal__message-row--user .prompt-chat-modal__bubble {
  background: #6d3df2;
  color: #ffffff;
}

.prompt-chat-modal__choices {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-left: 38px;
}

.prompt-chat-modal__choice {
  min-height: 40px;
  padding: 8px 14px;
  border: 1px solid #ddd2ff;
  border-radius: 999px;
  background: #ffffff;
  color: #6d3df2;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.prompt-chat-modal__choice:hover {
  background: #faf7ff;
}

.prompt-chat-modal__choice--custom {
  color: #7c86a3;
  border-style: dashed;
}

.prompt-chat-modal__loading {
  padding-left: 38px;
}

.prompt-chat-modal__complete {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1px solid #ddd2ff;
  border-radius: 14px;
  background: #fbf8ff;
}

.prompt-chat-modal__preview-label {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.prompt-chat-modal__preview {
  margin: 0;
  font-size: 15px;
  line-height: 1.55;
  color: #111827;
  white-space: pre-wrap;
  word-break: break-word;
}

.prompt-chat-modal__retry {
  align-self: flex-start;
  min-height: 36px;
  padding: 8px 14px;
  border: 1px solid #ddd2ff;
  border-radius: 10px;
  background: #ffffff;
  color: #6d3df2;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.prompt-chat-modal__retry:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.prompt-chat-modal__footer {
  display: flex;
  gap: 10px;
  padding: 16px 24px 24px;
  border-top: 1px solid #f0ebff;
}

.prompt-chat-modal__input {
  flex: 1;
  min-height: 48px;
  padding: 12px 14px;
  border: 1px solid #e8e2f8;
  border-radius: 12px;
  background: #fbf8ff;
  color: #111827;
  font: inherit;
  font-size: 15px;
  box-sizing: border-box;
}

.prompt-chat-modal__input:focus {
  outline: none;
  border-color: #6d3df2;
  box-shadow: 0 0 0 3px rgba(109, 61, 242, 0.12);
}

.prompt-chat-modal__btn {
  min-height: 48px;
  padding: 10px 18px;
  border-radius: 12px;
  font-family: var(--sans);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.prompt-chat-modal__btn--primary {
  border: 1px solid transparent;
  background: #6d3df2;
  color: #ffffff;
}

.prompt-chat-modal__btn--primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.prompt-chat-modal-enter-active,
.prompt-chat-modal-leave-active {
  transition: opacity 0.2s ease;
}

.prompt-chat-modal-enter-active .prompt-chat-modal__panel,
.prompt-chat-modal-leave-active .prompt-chat-modal__panel {
  transition: transform 0.2s ease;
}

.prompt-chat-modal-enter-from,
.prompt-chat-modal-leave-to {
  opacity: 0;
}

.prompt-chat-modal-enter-from .prompt-chat-modal__panel,
.prompt-chat-modal-leave-to .prompt-chat-modal__panel {
  transform: translateY(8px) scale(0.98);
}
</style>
