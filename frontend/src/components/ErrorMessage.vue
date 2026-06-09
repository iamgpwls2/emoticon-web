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
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 14px;
  line-height: 1.45;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.status-message--error {
  color: #ff4d6d;
  background: rgba(255, 77, 109, 0.08);
  border: 1px solid rgba(255, 77, 109, 0.22);
}

.status-message--success {
  color: #15803d;
  background: rgba(21, 128, 61, 0.08);
  border: 1px solid rgba(21, 128, 61, 0.2);
}

.status-message--hint {
  color: #7c86a3;
  background: #faf7ff;
  border: 1px solid #e4defa;
}

.status-message--loading {
  margin-top: 0;
  color: #6d3df2;
  background: transparent;
  border: none;
  padding: 0;
}

@media (max-width: 480px) {
  .status-message {
    font-size: 13px;
    padding: 9px 12px;
    margin-top: 6px;
  }

  .status-message--loading {
    padding: 0;
    margin-top: 0;
  }
}
</style>
