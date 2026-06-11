<script setup>
import { computed, onBeforeUnmount, onMounted, onUnmounted, ref } from 'vue'
import ErrorMessage from './ErrorMessage.vue'
import { useAsyncState } from '../composables/useAsyncState.js'
import { uploadImage } from '../services/uploadService.js'

const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp'])
const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])
const MAX_FILE_SIZE = 5 * 1024 * 1024

const props = defineProps({
  previewUrl: {
    type: String,
    default: null,
  },
  previewFileName: {
    type: String,
    default: null,
  },
})

const emit = defineEmits(['uploaded', 'file-selected', 'file-removed'])

const fileInputRef = ref(null)
const localPreviewUrl = ref('')
const isObjectPreview = ref(false)
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

const displayedPreviewUrl = computed(() => {
  if (localPreviewUrl.value) {
    return localPreviewUrl.value
  }
  return props.previewUrl?.trim() || ''
})

const displayFileName = computed(() => {
  if (selectedFile.value) {
    return selectedFile.value.name
  }
  return props.previewFileName?.trim() || ''
})

const showPreview = computed(() => Boolean(displayedPreviewUrl.value))

const showMeta = computed(() => Boolean(displayFileName.value))

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

function revokeLocalPreview() {
  if (isObjectPreview.value && localPreviewUrl.value) {
    URL.revokeObjectURL(localPreviewUrl.value)
  }
  localPreviewUrl.value = ''
  isObjectPreview.value = false
}

function resetInput() {
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

async function handleFileChange(event) {
  clearError()
  clearSuccess()

  const file = event.target.files?.[0]
  if (!file) return

  const validationError = validateFile(file)
  if (validationError) {
    errorMessage.value = validationError
    selectedFile.value = null
    revokeLocalPreview()
    resetInput()
    return
  }

  revokeLocalPreview()
  selectedFile.value = file
  localPreviewUrl.value = URL.createObjectURL(file)
  isObjectPreview.value = true
  emit('file-selected')
  await handleUpload()
}

function openFilePicker() {
  if (uploading.value) return
  fileInputRef.value?.click()
}

async function handleUpload() {
  if (!selectedFile.value || uploading.value) return

  const result = await runUpload(() => uploadImage(selectedFile.value), {
    successMessage: '이미지 업로드가 완료되었습니다.',
    onSuccess: (uploadResult) =>
      emit('uploaded', { ...uploadResult, file: selectedFile.value }),
  })

  if (result === undefined) {
    resetInput()
  }
}

function handleRemovePreview() {
  if (uploading.value) return

  revokeLocalPreview()
  selectedFile.value = null
  resetInput()
  clearError()
  clearSuccess()
  emit('file-removed')
}

function createNamedClipboardFile(file) {
  const extension =
    file.type === 'image/jpeg'
      ? '.jpg'
      : file.type === 'image/webp'
        ? '.webp'
        : '.png'

  return new File([file], `clipboard-${Date.now()}${extension}`, {
    type: file.type,
  })
}

async function handlePaste(event) {
  if (uploading.value) return

  const items = event.clipboardData?.items
  if (!items) return

  for (const item of items) {
    if (!item.type.startsWith('image/')) continue

    const file = item.getAsFile()
    if (!file) continue

    clearError()
    clearSuccess()

    const namedFile = createNamedClipboardFile(file)
    const validationError = validateFile(namedFile)
    if (validationError) {
      errorMessage.value = validationError
      selectedFile.value = null
      revokeLocalPreview()
      resetInput()
      return
    }

    revokeLocalPreview()
    selectedFile.value = namedFile
    localPreviewUrl.value = URL.createObjectURL(namedFile)
    isObjectPreview.value = true
    emit('file-selected')
    await handleUpload()
    return
  }
}

onMounted(() => {
  window.addEventListener('paste', handlePaste)
})

onBeforeUnmount(() => {
  window.removeEventListener('paste', handlePaste)
})

onUnmounted(() => {
  revokeLocalPreview()
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
        {{ uploading ? '업로드 중...' : '이미지 업로드' }}
      </button>
    </div>

    <p v-if="showMeta" class="image-uploader__meta">
      {{ displayFileName
      }}<template v-if="selectedFile">
        · {{ (selectedFile.size / 1024).toFixed(1) }} KB
      </template>
    </p>

    <div v-if="showPreview" class="image-uploader__preview-wrap">
      <button
        type="button"
        class="image-uploader__remove-btn"
        aria-label="이미지 제거"
        :disabled="uploading"
        @click="handleRemovePreview"
      >
        <span aria-hidden="true">×</span>
      </button>
      <img
        :src="displayedPreviewUrl"
        alt="선택한 이미지 미리보기"
        class="image-uploader__preview"
      />
    </div>

    <div
      v-else
      class="image-uploader__placeholder"
      aria-hidden="true"
    >
      <span class="image-uploader__placeholder-icon">🖼</span>
      <span class="image-uploader__placeholder-text">
        이미지를 선택하거나 Ctrl+V 또는 ⌘+V로 붙여넣기 하세요
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
  position: relative;
  width: 100%;
  max-width: 260px;
  max-height: 260px;
  margin: 20px auto;
  border: 1px solid #ddd2ff;
  border-radius: 12px;
  overflow: hidden;
  background: #faf7ff;
}

.image-uploader__remove-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid #e4d8ff;
  border-radius: 999px;
  background: #ffffff;
  color: #6d3df2;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
}

.image-uploader__remove-btn:hover:not(:disabled) {
  background: #f1ebff;
  border-color: #6d3df2;
  color: #5b21b6;
}

.image-uploader__remove-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(109, 61, 242, 0.18);
}

.image-uploader__remove-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
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
