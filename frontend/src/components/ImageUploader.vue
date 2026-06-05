<script setup>
import { onUnmounted, ref } from 'vue'
import { uploadImage } from '../services/uploadService.js'

const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp'])
const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])
const MAX_FILE_SIZE = 5 * 1024 * 1024

const emit = defineEmits(['uploaded'])

const fileInputRef = ref(null)
const previewUrl = ref('')
const selectedFile = ref(null)
const uploading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

function getExtension(filename) {
  const dotIndex = filename.lastIndexOf('.')
  if (dotIndex === -1) return ''
  return filename.slice(dotIndex).toLowerCase()
}

function validateFile(file) {
  const ext = getExtension(file.name)
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return 'PNG, JPG, JPEG, WEBP 형식만 업로드할 수 있습니다.'
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return 'PNG, JPG, JPEG, WEBP 형식만 업로드할 수 있습니다.'
  }
  if (file.size > MAX_FILE_SIZE) {
    return '파일 크기는 5MB 이하여야 합니다.'
  }
  return ''
}

function revokePreview() {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = ''
  }
}

function resetInput() {
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

function handleFileChange(event) {
  errorMessage.value = ''
  successMessage.value = ''

  const file = event.target.files?.[0]
  if (!file) return

  const validationError = validateFile(file)
  if (validationError) {
    errorMessage.value = validationError
    selectedFile.value = null
    revokePreview()
    resetInput()
    return
  }

  revokePreview()
  selectedFile.value = file
  previewUrl.value = URL.createObjectURL(file)
}

function openFilePicker() {
  if (uploading.value) return
  fileInputRef.value?.click()
}

async function handleUpload() {
  if (!selectedFile.value || uploading.value) return

  uploading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const result = await uploadImage(selectedFile.value)
    successMessage.value = '이미지 업로드가 완료되었습니다.'
    emit('uploaded', result)
  } catch (err) {
    errorMessage.value =
      err instanceof Error ? err.message : '업로드에 실패했습니다.'
  } finally {
    uploading.value = false
  }
}

onUnmounted(() => {
  revokePreview()
})
</script>

<template>
  <div class="image-uploader">
    <input
      ref="fileInputRef"
      type="file"
      class="image-uploader__input"
      accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
      :disabled="uploading"
      @change="handleFileChange"
    />

    <div class="image-uploader__actions">
      <button
        type="button"
        class="image-uploader__btn image-uploader__btn--secondary"
        :disabled="uploading"
        @click="openFilePicker"
      >
        이미지 선택
      </button>

      <button
        type="button"
        class="image-uploader__btn image-uploader__btn--primary"
        :disabled="!selectedFile || uploading"
        @click="handleUpload"
      >
        {{ uploading ? '업로드 중…' : '업로드' }}
      </button>
    </div>

    <p v-if="selectedFile" class="image-uploader__meta">
      {{ selectedFile.name }} · {{ (selectedFile.size / 1024).toFixed(1) }} KB
    </p>

    <div v-if="previewUrl" class="image-uploader__preview-wrap">
      <img
        :src="previewUrl"
        alt="선택한 이미지 미리보기"
        class="image-uploader__preview"
      />
    </div>

    <p
      v-if="errorMessage"
      class="image-uploader__message image-uploader__message--error"
      role="alert"
    >
      {{ errorMessage }}
    </p>

    <p
      v-if="successMessage"
      class="image-uploader__message image-uploader__message--success"
      role="status"
    >
      {{ successMessage }}
    </p>
  </div>
</template>

<style scoped>
.image-uploader {
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  text-align: left;
}

.image-uploader__input {
  display: none;
}

.image-uploader__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.image-uploader__btn {
  flex: 1 1 120px;
  min-width: 0;
  font-family: var(--sans);
  font-size: 16px;
  font-weight: 500;
  padding: 12px 16px;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.3s, box-shadow 0.3s;
}

.image-uploader__btn--primary {
  color: var(--accent);
  background: var(--accent-bg);
}

.image-uploader__btn--secondary {
  color: var(--text-h);
  background: var(--social-bg);
  border-color: var(--border);
}

.image-uploader__btn:hover:not(:disabled) {
  border-color: var(--accent-border);
  box-shadow: var(--shadow);
}

.image-uploader__btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.image-uploader__btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.image-uploader__meta {
  margin: 0;
  font-size: 14px;
  color: var(--text);
  word-break: break-all;
}

.image-uploader__preview-wrap {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  background: var(--code-bg);
}

.image-uploader__preview {
  display: block;
  width: 100%;
  max-height: min(60vh, 360px);
  object-fit: contain;
}

.image-uploader__message {
  margin: 0;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 14px;
}

.image-uploader__message--error {
  color: #dc2626;
  background: rgba(220, 38, 38, 0.08);
  border: 1px solid rgba(220, 38, 38, 0.2);
}

.image-uploader__message--success {
  color: #15803d;
  background: rgba(21, 128, 61, 0.08);
  border: 1px solid rgba(21, 128, 61, 0.2);
}

@media (max-width: 480px) {
  .image-uploader__actions {
    flex-direction: column;
  }

  .image-uploader__btn {
    flex: 1 1 auto;
    width: 100%;
  }
}
</style>
