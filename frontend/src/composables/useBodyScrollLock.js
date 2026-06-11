import { onBeforeUnmount, unref, watch } from 'vue'

const BODY_LOCK_CLASS = 'body-scroll-locked'

let lockCount = 0
let savedScrollY = 0

export function lockBodyScroll() {
  if (typeof document === 'undefined') return

  if (lockCount === 0) {
    savedScrollY = window.scrollY
    document.body.classList.add(BODY_LOCK_CLASS)
    document.body.style.top = `-${savedScrollY}px`
    document.documentElement.style.overflow = 'hidden'
  }

  lockCount += 1
}

export function unlockBodyScroll() {
  if (typeof document === 'undefined') return
  if (lockCount <= 0) return

  lockCount -= 1

  if (lockCount === 0) {
    document.body.classList.remove(BODY_LOCK_CLASS)
    document.body.style.top = ''
    document.documentElement.style.overflow = ''
    window.scrollTo(0, savedScrollY)
  }
}

/**
 * @param {import('vue').MaybeRefOrGetter<boolean>} isOpen
 */
export function useBodyScrollLock(isOpen) {
  watch(
    () => unref(isOpen),
    (open) => {
      if (open) {
        lockBodyScroll()
        return
      }
      unlockBodyScroll()
    },
    { immediate: true }
  )

  onBeforeUnmount(() => {
    if (unref(isOpen)) {
      unlockBodyScroll()
    }
  })
}
