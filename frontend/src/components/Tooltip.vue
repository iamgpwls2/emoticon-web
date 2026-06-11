<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'

const SHOW_DELAY_MS = 700
const HIDE_DELAY_MS = 200

const props = defineProps({
  label: {
    type: String,
    required: true,
  },
  placement: {
    type: String,
    default: 'top',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const rootRef = ref(null)
const visible = ref(false)
const coords = ref({ top: 0, left: 0 })

let showTimerId = null
let hideTimerId = null

const isTouchDevice = computed(
  () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: none), (pointer: coarse)').matches
)

function clearTimers() {
  if (showTimerId) {
    clearTimeout(showTimerId)
    showTimerId = null
  }
  if (hideTimerId) {
    clearTimeout(hideTimerId)
    hideTimerId = null
  }
}

function updatePosition() {
  const root = rootRef.value
  if (!root) return

  const rect = root.getBoundingClientRect()
  const margin = 8
  let top = rect.top - margin
  let left = rect.left + rect.width / 2

  if (props.placement === 'bottom') {
    top = rect.bottom + margin
  }

  const tooltipWidth = 160
  const minLeft = tooltipWidth / 2 + 8
  const maxLeft = window.innerWidth - tooltipWidth / 2 - 8
  left = Math.min(Math.max(left, minLeft), maxLeft)

  coords.value = { top, left }
}

function showTooltip() {
  if (props.disabled || isTouchDevice.value) return

  clearTimers()
  showTimerId = setTimeout(() => {
    updatePosition()
    visible.value = true
  }, SHOW_DELAY_MS)
}

function hideTooltip() {
  clearTimers()
  hideTimerId = setTimeout(() => {
    visible.value = false
  }, HIDE_DELAY_MS)
}

onBeforeUnmount(() => {
  clearTimers()
})
</script>

<template>
  <span
    ref="rootRef"
    class="app-tooltip-host"
    @mouseenter="showTooltip"
    @mouseleave="hideTooltip"
    @focusin="showTooltip"
    @focusout="hideTooltip"
  >
    <slot />
    <Teleport to="body">
      <Transition name="app-tooltip">
        <span
          v-if="visible"
          class="app-tooltip"
          :class="`app-tooltip--${placement}`"
          :style="{
            top: `${coords.top}px`,
            left: `${coords.left}px`,
          }"
          role="tooltip"
        >
          {{ label }}
        </span>
      </Transition>
    </Teleport>
  </span>
</template>

<style scoped>
.app-tooltip-host {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.app-tooltip {
  position: fixed;
  z-index: 160;
  max-width: 180px;
  padding: 6px 12px;
  border-radius: 999px;
  background: #1f1635;
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  text-align: center;
  pointer-events: none;
  box-shadow: 0 8px 20px rgba(31, 22, 53, 0.24);
  transform: translate(-50%, -100%);
  white-space: nowrap;
}

.app-tooltip--bottom {
  transform: translate(-50%, 0);
}

.app-tooltip-enter-active,
.app-tooltip-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.app-tooltip-enter-from,
.app-tooltip-leave-to {
  opacity: 0;
  transform: translate(-50%, calc(-100% - 4px)) scale(0.96);
}

.app-tooltip--bottom.app-tooltip-enter-from,
.app-tooltip--bottom.app-tooltip-leave-to {
  transform: translate(-50%, 4px) scale(0.96);
}
</style>
