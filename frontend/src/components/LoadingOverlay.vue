<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  message: {
    type: String,
    default: '이모티콘을 생성하는 중입니다.',
  },
})
</script>

<template>
  <Transition name="loading-overlay">
    <div
      v-if="visible"
      class="loading-overlay"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div class="loading-overlay__panel">
        <span class="loading-overlay__spinner" aria-hidden="true" />
        <p class="loading-overlay__message">{{ message }}</p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.loading-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
  pointer-events: all;
  background: rgba(251, 248, 255, 0.72);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.loading-overlay__panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  width: min(100%, 380px);
  padding: 32px 28px;
  border: 1px solid #e4defa;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 20px 48px rgba(94, 70, 140, 0.14);
  text-align: center;
}

.loading-overlay__spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e4defa;
  border-top-color: #6d3df2;
  border-radius: 50%;
  animation: loading-overlay-spin 0.8s linear infinite;
}

.loading-overlay__message {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  line-height: 1.55;
  color: #111827;
  word-break: keep-all;
}

.loading-overlay-enter-active,
.loading-overlay-leave-active {
  transition: opacity 0.2s ease;
}

.loading-overlay-enter-from,
.loading-overlay-leave-to {
  opacity: 0;
}

@keyframes loading-overlay-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 480px) {
  .loading-overlay {
    align-items: flex-end;
    padding: 16px;
  }

  .loading-overlay__panel {
    width: 100%;
    flex-direction: row;
    justify-content: flex-start;
    gap: 16px;
    padding: 20px 18px;
    border-radius: 16px;
    text-align: left;
  }

  .loading-overlay__spinner {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
  }

  .loading-overlay__message {
    font-size: 15px;
  }
}
</style>
