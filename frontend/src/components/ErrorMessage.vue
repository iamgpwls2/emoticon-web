<script setup>
import { computed } from 'vue'

const props = defineProps({
  message: {
    type: String,
    default: '',
  },
  variant: {
    type: String,
    default: 'error',
    validator: (value) =>
      ['error', 'success', 'hint', 'loading'].includes(value),
  },
})

const role = computed(() => {
  if (props.variant === 'loading') return 'status'
  if (props.variant === 'success') return 'status'
  if (props.variant === 'hint') return 'note'
  return 'alert'
})

const ariaLive = computed(() =>
  props.variant === 'loading' ? 'polite' : undefined
)
</script>

<template>
  <p
    v-if="message"
    class="status-message"
    :class="`status-message--${variant}`"
    :role="role"
    :aria-live="ariaLive"
  >
    {{ message }}
  </p>
</template>

<style scoped>
.status-message {
  margin: 4px 0 0;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.45;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.status-message--error {
  color: #dc2626;
  background: rgba(220, 38, 38, 0.08);
  border: 1px solid rgba(220, 38, 38, 0.2);
}

.status-message--success {
  color: #15803d;
  background: rgba(21, 128, 61, 0.08);
  border: 1px solid rgba(21, 128, 61, 0.2);
}

.status-message--hint {
  color: var(--text);
  background: var(--social-bg);
  border: 1px solid var(--border);
}

.status-message--loading {
  margin-top: 0;
  color: var(--text);
  background: transparent;
  border: none;
  padding: 0;
}

@media (max-width: 480px) {
  .status-message {
    font-size: 13px;
    padding: 9px 10px;
    margin-top: 6px;
  }

  .status-message--loading {
    padding: 0;
    margin-top: 0;
  }
}
</style>
