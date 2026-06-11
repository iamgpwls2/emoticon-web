import { ref } from 'vue'

const TOAST_DURATION_MS = 3000

const toastMessage = ref('')
const toastVisible = ref(false)
let toastTimerId = null

export function showAppToast(message) {
  toastMessage.value = message
  toastVisible.value = true

  if (toastTimerId) {
    clearTimeout(toastTimerId)
  }

  toastTimerId = setTimeout(() => {
    toastVisible.value = false
  }, TOAST_DURATION_MS)
}

export function useAppToast() {
  return {
    toastMessage,
    toastVisible,
    showAppToast,
  }
}
