<script setup>
import { onBeforeUnmount, watch } from 'vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  imageUrl: {
    type: String,
    default: '',
  },
  altText: {
    type: String,
    default: '생성된 이모티콘',
  },
})

const emit = defineEmits(['close'])

function handleClose() {
  emit('close')
}

function handleBackdropClick(event) {
  if (event.target === event.currentTarget) {
    handleClose()
  }
}

function handleKeydown(event) {
  if (event.key === 'Escape') {
    handleClose()
  }
}

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
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
    <Transition name="image-viewer-modal">
      <div
        v-if="isOpen && imageUrl"
        class="image-viewer-modal"
        role="presentation"
        @click="handleBackdropClick"
      >
        <button
          type="button"
          class="image-viewer-modal__close"
          aria-label="닫기"
          @click="handleClose"
        >
          <span aria-hidden="true">×</span>
        </button>

        <img
          :src="imageUrl"
          :alt="altText"
          class="image-viewer-modal__image"
          @click.stop
        />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.image-viewer-modal {
  position: fixed;
  inset: 0;
  z-index: 140;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(17, 24, 39, 0.72);
  backdrop-filter: blur(4px);
}

.image-viewer-modal__close {
  position: absolute;
  top: 20px;
  right: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.95);
  color: #6d3df2;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease;
}

.image-viewer-modal__close:hover {
  background: #f1ebff;
  border-color: #6d3df2;
  transform: scale(1.04);
}

.image-viewer-modal__close:focus-visible {
  outline: none;
  box-shadow: 0 0 0 4px rgba(109, 61, 242, 0.28);
}

.image-viewer-modal__image {
  display: block;
  max-width: 80vw;
  max-height: 80vh;
  object-fit: contain;
  border-radius: 16px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
  background: #ffffff;
}

.image-viewer-modal-enter-active,
.image-viewer-modal-leave-active {
  transition: opacity 0.2s ease;
}

.image-viewer-modal-enter-active .image-viewer-modal__image,
.image-viewer-modal-leave-active .image-viewer-modal__image {
  transition: transform 0.2s ease;
}

.image-viewer-modal-enter-from,
.image-viewer-modal-leave-to {
  opacity: 0;
}

.image-viewer-modal-enter-from .image-viewer-modal__image,
.image-viewer-modal-leave-to .image-viewer-modal__image {
  transform: scale(0.96);
}
</style>
