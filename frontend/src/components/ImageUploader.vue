<script setup>
import { onUnmounted, ref } from 'vue'
import ErrorMessage from './ErrorMessage.vue'
import { useAsyncState } from '../composables/useAsyncState.js'
import { uploadImage } from '../services/uploadService.js'

const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp'])
const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])
const MAX_FILE_SIZE = 5 * 1024 * 1024

const emit = defineEmits(['uploaded', 'file-selected'])

const fileInputRef = ref(null)
const previewUrl = ref('')
const selectedFile = ref(null)

const {
  loading: uploading,
  error: errorMessage,
  successMessage,
  clearError,
  clearSuccess,
  run: runUpload,
} = useAsyncState({
  fallbackError: '이미지 업로드에 실패했습니다. 다시 시도해 주세요.',
})

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
  clearError()
  clearSuccess()

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
  emit('file-selected')
}

function openFilePicker() {
  if (uploading.value) return
  fileInputRef.value?.click()
}

async function handleUpload() {
  if (!selectedFile.value || uploading.value) return

  await runUpload(() => uploadImage(selectedFile.value), {
    successMessage: '이미지 업로드가 완료되었습니다.',
    onSuccess: (result) => emit('uploaded', result),
  })
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
        class="image-uploader__btn image-uploader__btn--primary"
        :disabled="uploading"
        @click="openFilePicker"
      >
        이미지 선택
      </button>

      <button
        type="button"
        class="image-uploader__btn image-uploader__btn--secondary"
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

    <div
      v-else-if="!selectedFile"
      class="image-uploader__placeholder"
      aria-hidden="true"
    >
      <span class="image-uploader__placeholder-icon">🖼</span>
      <span class="image-uploader__placeholder-text">
        이미지를 선택하면 미리보기가 표시됩니다
      </span>
    </div>

    <ErrorMessage :message="errorMessage" variant="error" />
    <ErrorMessage :message="successMessage" variant="success" />
  </div>
</template>

<style scoped>
.image-uploader {
  width: 100%;
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
  gap: 12px;
}

.image-uploader__btn {
  flex: 1 1 160px;
  min-width: 0;
  min-height: 56px;
  font-family: var(--sans);
  font-size: 16px;
  font-weight: 600;
  padding: 0 20px;
  border-radius: 11px;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    opacity 0.2s ease,
    transform 0.2s ease;
}

.image-uploader__btn--primary {
  border: 1px solid transparent;
  color: #ffffff;
  background: linear-gradient(135deg, #8b5cf6 0%, #6d3df2 55%, #5b21b6 100%);
  box-shadow: 0 10px 24px rgba(109, 61, 242, 0.22);
}

.image-uploader__btn--primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #7c3aed 0%, #6d3df2 55%, #4c1d95 100%);
  transform: translateY(-1px);
  box-shadow: 0 14px 28px rgba(109, 61, 242, 0.28);
}

.image-uploader__btn--secondary {
  border: 1px solid #ddd2ff;
  color: #6d3df2;
  background: #f1eaff;
}

.image-uploader__btn--secondary:hover:not(:disabled) {
  border-color: #c4b5fd;
  background: #eee8ff;
}

.image-uploader__btn:focus-visible {
  outline: 2px solid #6d3df2;
  outline-offset: 2px;
}

.image-uploader__btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.image-uploader__btn--secondary:disabled {
  color: #7c86a3;
  background: #eee8ff;
  border-color: #e4defa;
}

.image-uploader__meta {
  margin: 0;
  font-size: 14px;
  color: #7c86a3;
  word-break: break-all;
}

.image-uploader__preview-wrap {
  width: 100%;
  max-width: 260px;
  max-height: 260px;
  margin: 20px auto;
  border: 1px solid #ddd2ff;
  border-radius: 12px;
  overflow: hidden;
  background: #faf7ff;
}

.image-uploader__preview {
  display: block;
  width: 100%;
  height: 100%;
  max-height: 260px;
  object-fit: contain;
}

.image-uploader__placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  min-height: 140px;
  padding: 24px 16px;
  border: 1px dashed #ddd2ff;
  border-radius: 12px;
  background: #faf7ff;
  box-sizing: border-box;
}

.image-uploader__placeholder-icon {
  font-size: 28px;
  line-height: 1;
  opacity: 0.7;
}

.image-uploader__placeholder-text {
  font-size: 14px;
  color: #7c86a3;
  text-align: center;
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
