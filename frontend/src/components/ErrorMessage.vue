<script setup>
defineProps({
  message: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <p v-if="message" class="error-message" role="alert">
    {{ message }}
  </p>
</template>

<style scoped>
.error-message {
  margin: 4px 0 0;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.45;
  color: #dc2626;
  background: rgba(220, 38, 38, 0.08);
  border: 1px solid rgba(220, 38, 38, 0.2);
  word-break: break-word;
}

@media (max-width: 480px) {
  .error-message {
    font-size: 13px;
    padding: 9px 10px;
    margin-top: 6px;
  }
}
</style>
