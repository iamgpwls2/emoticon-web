<script setup>
import { computed, nextTick, ref, toRef, watch } from 'vue'
import { useBodyScrollLock } from '../composables/useBodyScrollLock.js'

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  currentName: {
    type: String,
    default: '',
  },
  existingNames: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  errorMessage: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['close', 'rename'])

useBodyScrollLock(toRef(props, 'open'))

const folderName = ref('')
const inputRef = ref(null)

const trimmedName = computed(() => folderName.value.trim())
const currentNameNormalized = computed(() => props.currentName.trim().toLowerCase())

const duplicateError = computed(() => {
  if (!trimmedName.value) return ''

  const normalized = trimmedName.value.toLowerCase()
  if (normalized === currentNameNormalized.value) return ''

  const exists = props.existingNames.some(
    (name) => typeof name === 'string' && name.trim().toLowerCase() === normalized
  )

  return exists ? '이미 같은 이름의 폴더가 있습니다.' : ''
})

const isUnchanged = computed(
  () => Boolean(trimmedName.value) && trimmedName.value.toLowerCase() === currentNameNormalized.value
)

const canSubmit = computed(
  () =>
    Boolean(trimmedName.value) &&
    !duplicateError.value &&
    !isUnchanged.value &&
    !props.loading
)

watch(
  () => props.open,
  async (isOpen) => {
    if (!isOpen) {
      folderName.value = ''
      return
    }

    folderName.value = props.currentName
    await nextTick()
    inputRef.value?.focus()
    inputRef.value?.select()
  }
)

function handleClose() {
  if (props.loading) return
  emit('close')
}

function handleSubmit() {
  if (!canSubmit.value) return
  emit('rename', trimmedName.value)
}

function handleBackdropClick(event) {
  if (event.target === event.currentTarget) {
    handleClose()
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="folder-modal">
      <div
        v-if="open"
        class="folder-modal"
        role="presentation"
        @click="handleBackdropClick"
      >
        <div
          class="folder-modal__panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="folder-rename-modal-title"
          @click.stop
        >
          <h2 id="folder-rename-modal-title" class="folder-modal__title">
            폴더 이름 수정
          </h2>

          <p v-if="currentName" class="folder-modal__subtitle">
            현재 폴더: 「{{ currentName }}」
          </p>

          <label class="folder-modal__label" for="folder-rename-modal-name">
            새 폴더 이름
          </label>
          <input
            id="folder-rename-modal-name"
            ref="inputRef"
            v-model="folderName"
            type="text"
            class="folder-modal__input"
            maxlength="50"
            placeholder="폴더 이름을 입력하세요"
            :disabled="loading"
            @keydown.enter.prevent="handleSubmit"
          />

          <p v-if="duplicateError" class="folder-modal__error" role="alert">
            {{ duplicateError }}
          </p>
          <p v-else-if="errorMessage" class="folder-modal__error" role="alert">
            {{ errorMessage }}
          </p>

          <div class="folder-modal__actions">
            <button
              type="button"
              class="folder-modal__btn folder-modal__btn--ghost"
              :disabled="loading"
              @click="handleClose"
            >
              취소
            </button>
            <button
              type="button"
              class="folder-modal__btn folder-modal__btn--primary"
              :disabled="!canSubmit"
              @click="handleSubmit"
            >
              {{ loading ? '저장 중...' : '저장' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.folder-modal {
  position: fixed;
  inset: 0;
  z-index: 130;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(17, 24, 39, 0.35);
  backdrop-filter: blur(4px);
}

.folder-modal__panel {
  width: min(420px, 100%);
  padding: 24px;
  border: 1px solid #e8e2f8;
  border-radius: 20px;
  background: #ffffff;
  box-shadow: 0 24px 60px rgba(80, 60, 160, 0.18);
}

.folder-modal__title {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 700;
  color: #111827;
}

.folder-modal__subtitle {
  margin: 0 0 18px;
  font-size: 14px;
  color: #7c86a3;
}

.folder-modal__label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.folder-modal__input {
  width: 100%;
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

.folder-modal__input:focus {
  outline: none;
  border-color: #6d3df2;
  box-shadow: 0 0 0 3px rgba(109, 61, 242, 0.12);
}

.folder-modal__error {
  margin: 10px 0 0;
  font-size: 13px;
  color: #ff4d6d;
}

.folder-modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.folder-modal__btn {
  min-height: 44px;
  padding: 10px 18px;
  border-radius: 12px;
  font-family: var(--sans);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.folder-modal__btn--ghost {
  border: 1px solid #e8e2f8;
  background: #ffffff;
  color: #111827;
}

.folder-modal__btn--primary {
  border: 1px solid transparent;
  background: #6d3df2;
  color: #ffffff;
}

.folder-modal__btn--primary:disabled,
.folder-modal__btn--ghost:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.folder-modal-enter-active,
.folder-modal-leave-active {
  transition: opacity 0.2s ease;
}

.folder-modal-enter-active .folder-modal__panel,
.folder-modal-leave-active .folder-modal__panel {
  transition: transform 0.2s ease;
}

.folder-modal-enter-from,
.folder-modal-leave-to {
  opacity: 0;
}

.folder-modal-enter-from .folder-modal__panel,
.folder-modal-leave-to .folder-modal__panel {
  transform: translateY(8px) scale(0.98);
}
</style>
