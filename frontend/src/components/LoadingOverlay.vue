<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  message: {
    type: String,
    default: '이모티콘을 생성하는 중입니다. 잠시만 기다려 주세요.',
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
  background: rgba(8, 6, 13, 0.35);
}

.loading-overlay__panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: min(100%, 360px);
  padding: 24px 20px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg);
  box-shadow: var(--shadow);
  text-align: center;
}

.loading-overlay__spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: loading-overlay-spin 0.8s linear infinite;
}

.loading-overlay__message {
  margin: 0;
  font-size: 15px;
  line-height: 1.5;
  color: var(--text-h);
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
    background: rgba(8, 6, 13, 0.2);
  }

  .loading-overlay__panel {
    width: 100%;
    flex-direction: row;
    justify-content: flex-start;
    gap: 14px;
    padding: 16px;
    border-radius: 12px;
    text-align: left;
  }

  .loading-overlay__spinner {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
  }

  .loading-overlay__message {
    font-size: 14px;
  }
}

@media (prefers-color-scheme: dark) {
  .loading-overlay {
    background: rgba(0, 0, 0, 0.45);
  }

  @media (max-width: 480px) {
    .loading-overlay {
      background: rgba(0, 0, 0, 0.3);
    }
  }
}
</style>
