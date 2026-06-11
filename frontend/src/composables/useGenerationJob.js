import { ref } from 'vue'
import { createGeneration } from '../services/generation.service.js'
import { toUserErrorMessage } from '../utils/apiError.js'

const MAX_RESULTS = 5

const isGenerating = ref(false)
const generationError = ref(null)
const generationResults = ref([])
const savedInput = ref(null)

const onCompleteCallbacks = []

/**
 * @param {(result: object) => void} cb
 */
export function onComplete(cb) {
  onCompleteCallbacks.push(cb)
}

/**
 * @param {(result: object) => void} cb
 */
export function offComplete(cb) {
  const idx = onCompleteCallbacks.indexOf(cb)
  if (idx > -1) {
    onCompleteCallbacks.splice(idx, 1)
  }
}

function notifyComplete(result) {
  onCompleteCallbacks.forEach((cb) => cb(result))
}

function sanitizeUploadedImageForSnapshot(uploadedImage) {
  if (!uploadedImage || typeof uploadedImage !== 'object') {
    return uploadedImage ?? null
  }

  const { file, previewUrl, ...rest } = uploadedImage

  if (rest.bucket && rest.path) {
    const { url, ...withoutUrl } = rest
    return withoutUrl
  }

  return rest
}

function normalizeInputSnapshot(inputSnapshot) {
  if (!inputSnapshot || typeof inputSnapshot !== 'object') {
    return inputSnapshot
  }

  const uploadedImage = sanitizeUploadedImageForSnapshot(
    inputSnapshot.uploadedImage ?? null
  )

  return {
    uploadedImageUrl:
      inputSnapshot.uploadedImageUrl?.trim() ||
      uploadedImage?.url?.trim() ||
      '',
    uploadedImageName:
      inputSnapshot.uploadedImageName?.trim() ||
      uploadedImage?.name?.trim() ||
      '',
    uploadedImage,
    emotion: inputSnapshot.emotion ?? '',
    motion: inputSnapshot.motion ?? '',
    inputText: inputSnapshot.inputText ?? '',
    finalPrompt: inputSnapshot.finalPrompt ?? '',
    storyPrompt: inputSnapshot.storyPrompt ?? '',
  }
}

/**
 * 페이지 이탈 후에도 업로드·입력 상태를 유지하기 위해 savedInput을 병합 갱신합니다.
 * @param {object} partial
 */
export function syncSavedInput(partial) {
  if (!partial || typeof partial !== 'object') {
    return
  }

  const current = savedInput.value ?? {}
  const mergedUploadedImage =
    partial.uploadedImage !== undefined
      ? sanitizeUploadedImageForSnapshot(partial.uploadedImage)
      : current.uploadedImage

  savedInput.value = normalizeInputSnapshot({
    ...current,
    ...partial,
    uploadedImage: mergedUploadedImage,
  })
}

function buildResultEntry(apiResult, payload) {
  const { maskBlob: _maskBlob, ...storedPayload } = payload ?? {}

  return {
    id: apiResult.id,
    generatedImageUrl: apiResult.generatedImageUrl,
    finalPrompt: payload.finalPrompt ?? '',
    emotion: payload.emotion ?? '',
    motion: payload.motion ?? '',
    inputText: payload.inputText ?? '',
    savedToGallery: false,
    isExpanded: true,
    createdAt: new Date(),
    payload: storedPayload,
  }
}

/**
 * @param {object} payload createGeneration API payload
 * @param {object} inputSnapshot 페이지 복원용 입력값 스냅샷
 */
export async function startGeneration(payload, inputSnapshot) {
  isGenerating.value = true
  generationError.value = null
  savedInput.value = normalizeInputSnapshot(inputSnapshot)

  try {
    const result = await createGeneration(payload)
    generationResults.value.forEach((item) => {
      item.isExpanded = false
    })

    const entry = buildResultEntry(result, payload)
    generationResults.value.push(entry)

    if (generationResults.value.length > MAX_RESULTS) {
      generationResults.value.shift()
    }

    isGenerating.value = false
    notifyComplete(entry)
  } catch (err) {
    generationError.value = toUserErrorMessage(
      err,
      '이모티콘 생성에 실패했습니다. 다시 시도해 주세요.'
    )
    isGenerating.value = false
  }
}

/**
 * @param {number} index
 */
export function toggleResult(index) {
  const item = generationResults.value[index]
  if (!item) return
  item.isExpanded = !item.isExpanded
}

/**
 * @param {number} index
 */
export function markAsSaved(index) {
  const item = generationResults.value[index]
  if (!item) return
  item.savedToGallery = true
}

/**
 * @param {number} index
 */
export function removeResult(index) {
  if (index < 0 || index >= generationResults.value.length) return
  generationResults.value.splice(index, 1)
}

export function resetGeneration() {
  isGenerating.value = false
  generationResults.value = []
  generationError.value = null
  savedInput.value = null
}

export function useGenerationJob() {
  return {
    isGenerating,
    generationError,
    generationResults,
    savedInput,
    syncSavedInput,
    startGeneration,
    resetGeneration,
    toggleResult,
    markAsSaved,
    removeResult,
    onComplete,
    offComplete,
  }
}
