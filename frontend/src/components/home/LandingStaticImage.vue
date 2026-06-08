<script setup>
import { ref } from 'vue'

defineProps({
  src: { type: String, required: true },
  alt: { type: String, default: '' },
  emoji: { type: String, default: '🖼️' },
  gradient: {
    type: String,
    default: 'linear-gradient(160deg, #f1ebff 0%, #d8c9ff 45%, #b9a0ff 100%)',
  },
  emojiSize: {
    type: String,
    default: 'default',
    validator: (value) => ['large', 'default', 'small'].includes(value),
  },
})

const hasError = ref(false)

function onError() {
  hasError.value = true
}
</script>

<template>
  <div class="landing-static-image">
    <img
      v-show="!hasError"
      class="landing-static-image__img"
      :src="src"
      :alt="alt"
      @error="onError"
    />
    <div
      v-show="hasError"
      class="landing-static-image__placeholder"
      :style="{ background: gradient }"
    >
      <span
        class="landing-static-image__emoji"
        :class="`landing-static-image__emoji--${emojiSize}`"
        aria-hidden="true"
      >
        {{ emoji }}
      </span>
    </div>
  </div>
</template>
