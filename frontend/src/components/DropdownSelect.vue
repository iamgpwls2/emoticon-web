<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

/**
 * 커스텀 드롭다운 셀렉트.
 *
 * 브라우저 기본 <select>는 화면 위치에 따라 목록이 위로 펼쳐지거나
 * 스크롤 시 자동으로 닫히는데, 이 동작은 OS/브라우저가 제어해서 막을 수 없다.
 * 그래서 항상 아래로 펼쳐지고 스크롤에도 닫히지 않도록 직접 구현한 컴포넌트.
 */
const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  options: {
    type: Array,
    required: true,
  },
  placeholder: {
    type: String,
    default: '선택해 주세요',
  },
  invalid: {
    type: Boolean,
    default: false,
  },
  id: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['update:modelValue', 'change', 'close'])

const rootEl = ref(null)
const listEl = ref(null)
const isOpen = ref(false)
const highlightedIndex = ref(-1)

const selectedLabel = computed(() => props.modelValue || '')
const listboxId = computed(() => `${props.id}-listbox`)

function open() {
  if (isOpen.value) return
  isOpen.value = true
  highlightedIndex.value = Math.max(props.options.indexOf(props.modelValue), 0)
  nextTick(scrollHighlightedIntoView)
}

function close() {
  if (!isOpen.value) return
  isOpen.value = false
  highlightedIndex.value = -1
  emit('close')
}

function toggle() {
  if (isOpen.value) {
    close()
  } else {
    open()
  }
}

function selectOption(option) {
  emit('update:modelValue', option)
  emit('change', option)
  close()
}

function moveHighlight(delta) {
  if (!isOpen.value) {
    open()
    return
  }
  const count = props.options.length
  if (count === 0) return
  const next = (highlightedIndex.value + delta + count) % count
  highlightedIndex.value = next
  nextTick(scrollHighlightedIntoView)
}

function scrollHighlightedIntoView() {
  const list = listEl.value
  if (!list || highlightedIndex.value < 0) return
  const item = list.children[highlightedIndex.value]
  if (item) item.scrollIntoView({ block: 'nearest' })
}

function handleKeydown(event) {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      moveHighlight(1)
      break
    case 'ArrowUp':
      event.preventDefault()
      moveHighlight(-1)
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      if (isOpen.value && highlightedIndex.value >= 0) {
        selectOption(props.options[highlightedIndex.value])
      } else {
        toggle()
      }
      break
    case 'Escape':
      if (isOpen.value) {
        event.preventDefault()
        close()
      }
      break
    case 'Tab':
      close()
      break
  }
}

// 바깥 영역을 클릭(터치)했을 때만 닫는다. 스크롤로는 닫히지 않는다.
function handlePointerDownOutside(event) {
  if (!isOpen.value) return
  if (rootEl.value && !rootEl.value.contains(event.target)) {
    close()
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', handlePointerDownOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handlePointerDownOutside)
})

watch(
  () => props.modelValue,
  () => {
    if (isOpen.value) {
      highlightedIndex.value = props.options.indexOf(props.modelValue)
    }
  },
)
</script>

<template>
  <div ref="rootEl" class="dropdown-select">
    <button
      :id="id"
      type="button"
      class="dropdown-select__trigger"
      :class="{ 'dropdown-select__trigger--placeholder': !selectedLabel }"
      role="combobox"
      :aria-expanded="isOpen"
      :aria-controls="listboxId"
      aria-haspopup="listbox"
      :aria-invalid="invalid"
      @click="toggle"
      @keydown="handleKeydown"
    >
      <span class="dropdown-select__value">
        {{ selectedLabel || placeholder }}
      </span>
      <svg
        class="dropdown-select__chevron"
        :class="{ 'dropdown-select__chevron--open': isOpen }"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M4 6l4 4 4-4"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <ul
      v-show="isOpen"
      :id="listboxId"
      ref="listEl"
      class="dropdown-select__list"
      role="listbox"
      :aria-labelledby="id"
    >
      <li
        v-for="(option, index) in options"
        :key="option"
        class="dropdown-select__option"
        :class="{
          'dropdown-select__option--selected': option === modelValue,
          'dropdown-select__option--highlighted': index === highlightedIndex,
        }"
        role="option"
        :aria-selected="option === modelValue"
        @pointerenter="highlightedIndex = index"
        @click="selectOption(option)"
      >
        {{ option }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.dropdown-select {
  position: relative;
  width: 100%;
}

.dropdown-select__trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  min-height: 56px;
  box-sizing: border-box;
  padding: 0 16px;
  border: 1px solid #ddd2ff;
  border-radius: 12px;
  background: #ffffff;
  color: #111827;
  font: inherit;
  font-size: 16px;
  line-height: 1.4;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.dropdown-select__trigger--placeholder {
  color: #7c86a3;
}

.dropdown-select__trigger:focus-visible {
  outline: none;
  border-color: #6d3df2;
  box-shadow: 0 0 0 3px rgba(109, 61, 242, 0.12);
}

.dropdown-select__trigger[aria-invalid='true'] {
  border-color: rgba(255, 77, 109, 0.55);
}

.dropdown-select__trigger[aria-invalid='true']:focus-visible {
  box-shadow: 0 0 0 3px rgba(255, 77, 109, 0.12);
}

.dropdown-select__value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-select__chevron {
  flex-shrink: 0;
  color: #7c86a3;
  transition: transform 0.2s ease;
}

.dropdown-select__chevron--open {
  transform: rotate(180deg);
}

/* 트리거 바로 아래(top: 100%)에 고정해 항상 아래 방향으로만 펼쳐진다 */
.dropdown-select__list {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 30;
  max-height: 280px;
  margin: 0;
  padding: 6px;
  overflow-y: auto;
  overscroll-behavior: contain;
  list-style: none;
  border: 1px solid #ddd2ff;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 12px 32px rgba(17, 24, 39, 0.12);
}

.dropdown-select__option {
  padding: 11px 12px;
  border-radius: 8px;
  font-size: 15px;
  color: #111827;
  cursor: pointer;
}

.dropdown-select__option--highlighted {
  background: #f3efff;
}

.dropdown-select__option--selected {
  color: #6d3df2;
  font-weight: 600;
}

@media (max-width: 480px) {
  .dropdown-select__trigger {
    min-height: 52px;
    padding: 0 14px;
  }

  .dropdown-select__list {
    max-height: 240px;
  }
}
</style>
