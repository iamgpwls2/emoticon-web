import { ref } from 'vue'

const TOAST_DURATION_MS = 3000

/**
 * 갤러리 페이지 토스트 메시지 표시 상태를 제공합니다.
 */
export function useGalleryToast() {
  const toastMessage = ref('')
  const toastVisible = ref(false)
  let toastTimerId = null

  function showToast(message) {
    toastMessage.value = message
    toastVisible.value = true

    if (toastTimerId) {
      clearTimeout(toastTimerId)
    }

    toastTimerId = setTimeout(() => {
      toastVisible.value = false
    }, TOAST_DURATION_MS)
  }

  return {
    toastMessage,
    toastVisible,
    showToast,
  }
}
