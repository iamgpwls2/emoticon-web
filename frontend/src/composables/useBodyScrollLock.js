import { onBeforeUnmount, toValue, watch } from 'vue'

const BODY_LOCK_CLASS = 'body-scroll-locked'

let lockCount = 0
let savedScrollY = 0

function clearBodyScrollLockStyles() {
  if (typeof document === 'undefined') return

  document.body.classList.remove(BODY_LOCK_CLASS)
  document.body.style.top = ''
  document.body.style.overflow = ''
  document.body.style.position = ''
  document.body.style.width = ''
  document.documentElement.style.overflow = ''
}

export function resetBodyScrollLock() {
  if (typeof document === 'undefined') return

  lockCount = 0
  clearBodyScrollLockStyles()
}

export function lockBodyScroll() {
  if (typeof document === 'undefined') return

  if (lockCount === 0) {
    savedScrollY = window.scrollY
    document.body.classList.add(BODY_LOCK_CLASS)
    document.body.style.top = `-${savedScrollY}px`
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
  }

  lockCount += 1
}

export function unlockBodyScroll() {
  if (typeof document === 'undefined') return
  if (lockCount <= 0) {
    lockCount = 0
    return
  }

  lockCount -= 1

  if (lockCount === 0) {
    clearBodyScrollLockStyles()
    window.scrollTo(0, savedScrollY)
  }
}

/**
 * @param {import('vue').MaybeRefOrGetter<boolean>} isOpen
 */
export function useBodyScrollLock(isOpen) {
  let lockedByThis = false

  watch(
    () => Boolean(toValue(isOpen)),
    (open) => {
      if (open) {
        if (!lockedByThis) {
          lockBodyScroll()
          lockedByThis = true
        }
        return
      }

      if (lockedByThis) {
        unlockBodyScroll()
        lockedByThis = false
      }
    },
    { immediate: true }
  )

  onBeforeUnmount(() => {
    if (lockedByThis) {
      unlockBodyScroll()
      lockedByThis = false
    }
  })
}
