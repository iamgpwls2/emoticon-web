<script setup>
import { onBeforeUnmount, toRef, watch } from 'vue'
import { useBodyScrollLock } from '../composables/useBodyScrollLock.js'

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  confirmLabel: {
    type: String,
    default: '삭제',
  },
  loading: {
    type: Boolean,
    default: false,
  },
  errorMessage: {
    type: String,
    default: '',
  },
  showCascadeOption: {
    type: Boolean,
    default: false,
  },
  cascadeLabel: {
    type: String,
    default: '폴더 안 이미지도 함께 삭제',
  },
})

const cascadeChecked = defineModel('cascadeChecked', {
  type: Boolean,
  default: false,
})

const emit = defineEmits(['cancel', 'confirm'])

useBodyScrollLock(toRef(props, 'open'))

function handleClose() {
  if (props.loading) return
  emit('cancel')
}

function handleBackdropClick(event) {
  if (event.target === event.currentTarget) {
    handleClose()
  }
}

function handleConfirm() {
  if (props.loading) return
  emit('confirm')
}

function handleKeydown(event) {
  if (event.key === 'Escape') {
    handleClose()
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeydown)
      return
    }
    document.removeEventListener('keydown', handleKeydown)
  }
)

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="delete-confirm-modal">
      <div
        v-if="open"
        class="delete-confirm-modal"
        role="presentation"
        @click="handleBackdropClick"
      >
        <div
          class="delete-confirm-modal__panel"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-confirm-modal-title"
          aria-describedby="delete-confirm-modal-desc"
          @click.stop
        >
          <h2 id="delete-confirm-modal-title" class="delete-confirm-modal__title">
            {{ title }}
          </h2>
          <p
            v-if="description"
            id="delete-confirm-modal-desc"
            class="delete-confirm-modal__description"
          >
            {{ description }}
          </p>

          <label
            v-if="showCascadeOption"
            class="delete-confirm-modal__option"
          >
            <input v-model="cascadeChecked" type="checkbox" :disabled="loading" />
            <span>{{ cascadeLabel }}</span>
          </label>

          <p v-if="errorMessage" class="delete-confirm-modal__error" role="alert">
            {{ errorMessage }}
          </p>

          <div class="delete-confirm-modal__actions">
            <button
              type="button"
              class="delete-confirm-modal__btn delete-confirm-modal__btn--ghost"
              :disabled="loading"
              @click="handleClose"
            >
              취소
            </button>
            <button
              type="button"
              class="delete-confirm-modal__btn delete-confirm-modal__btn--danger"
              :disabled="loading"
              :aria-busy="loading"
              @click="handleConfirm"
            >
              {{ loading ? '삭제 중...' : confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.delete-confirm-modal {
  position: fixed;
  inset: 0;
  z-index: 150;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(17, 24, 39, 0.35);
  backdrop-filter: blur(4px);
}

.delete-confirm-modal__panel {
  width: min(440px, 100%);
  padding: 24px;
  border: 1px solid #e8e2f8;
  border-radius: 20px;
  background: #ffffff;
  box-shadow: 0 24px 60px rgba(80, 60, 160, 0.18);
  box-sizing: border-box;
}

.delete-confirm-modal__title {
  margin: 0 0 10px;
  font-size: 20px;
  font-weight: 700;
  color: #111827;
}

.delete-confirm-modal__description {
  margin: 0;
  font-size: 15px;
  line-height: 1.6;
  color: #667085;
  white-space: pre-line;
}

.delete-confirm-modal__option {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 16px;
  font-size: 14px;
  line-height: 1.5;
  color: #111827;
  cursor: pointer;
}

.delete-confirm-modal__option input {
  margin-top: 3px;
  accent-color: #6d3df2;
}

.delete-confirm-modal__error {
  margin: 14px 0 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: #fff1f2;
  border: 1px solid #fecdd3;
  color: #e11d48;
  font-size: 14px;
  line-height: 1.5;
}

.delete-confirm-modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 22px;
}

.delete-confirm-modal__btn {
  min-height: 44px;
  padding: 10px 18px;
  border-radius: 12px;
  font-family: var(--sans);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.delete-confirm-modal__btn--ghost {
  border: 1px solid #e4d8ff;
  background: #ffffff;
  color: #6d3df2;
}

.delete-confirm-modal__btn--danger {
  border: 1px solid #ff4d6d;
  background: #ff4d6d;
  color: #ffffff;
}

.delete-confirm-modal__btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.delete-confirm-modal-enter-active,
.delete-confirm-modal-leave-active {
  transition: opacity 0.2s ease;
}

.delete-confirm-modal-enter-active .delete-confirm-modal__panel,
.delete-confirm-modal-leave-active .delete-confirm-modal__panel {
  transition: transform 0.2s ease;
}

.delete-confirm-modal-enter-from,
.delete-confirm-modal-leave-to {
  opacity: 0;
}

.delete-confirm-modal-enter-from .delete-confirm-modal__panel,
.delete-confirm-modal-leave-to .delete-confirm-modal__panel {
  transform: translateY(8px) scale(0.98);
}
</style>
