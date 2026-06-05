<script setup>
import { ref } from 'vue'
import ImageUploader from '../components/ImageUploader.vue'

const uploadedImage = ref(null)

function onUploaded(result) {
  uploadedImage.value = result
}
</script>

<template>
  <section class="auth-page">
    <div class="auth-card">
      <h1>이모티콘 생성</h1>
      <p class="auth-lead">이미지를 업로드한 뒤 이모티콘을 생성합니다.</p>

      <ImageUploader @uploaded="onUploaded" />

      <div v-if="uploadedImage" class="upload-result">
        <p><strong>bucket:</strong> {{ uploadedImage.bucket }}</p>
        <p><strong>path:</strong> {{ uploadedImage.path }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.upload-result {
  margin-top: 16px;
  padding: 12px 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--code-bg);
  font-size: 14px;
  word-break: break-all;
}

.upload-result p {
  margin: 0 0 8px;
}

.upload-result p:last-child {
  margin-bottom: 0;
}
</style>
