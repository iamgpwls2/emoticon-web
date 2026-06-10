<script setup>
defineProps({
  message: {
    type: String,
    default: '',
  },
  visible: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <Transition name="gallery-toast">
    <div
      v-if="visible && message"
      class="gallery-toast"
      role="status"
      aria-live="polite"
    >
      <span class="gallery-toast__icon" aria-hidden="true">✦</span>
      <p class="gallery-toast__message">{{ message }}</p>
    </div>
  </Transition>
</template>

<style scoped>
.gallery-toast {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 120;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  max-width: min(360px, calc(100vw - 32px));
  padding: 16px 18px;
  border: 1px solid #ddd2ff;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 18px 40px rgba(80, 60, 160, 0.16);
}

.gallery-toast__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: #f1ebff;
  color: #6d3df2;
  font-size: 14px;
  flex-shrink: 0;
}

.gallery-toast__message {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: #111827;
}

.gallery-toast-enter-active,
.gallery-toast-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.gallery-toast-enter-from,
.gallery-toast-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

@media (max-width: 640px) {
  .gallery-toast {
    right: 16px;
    left: 16px;
    bottom: 16px;
    max-width: none;
  }
}
</style>
