<script setup>
defineProps({
  selectedCount: {
    type: Number,
    default: 0,
  },
  isAllVisibleSelected: {
    type: Boolean,
    default: false,
  },
  hasVisibleItems: {
    type: Boolean,
    default: false,
  },
  bulkDownloading: {
    type: Boolean,
    default: false,
  },
  bulkDeleting: {
    type: Boolean,
    default: false,
  },
})

defineEmits([
  'folder-move',
  'delete',
  'download',
  'toggle-select-all',
])
</script>

<template>
  <div class="gallery-action-bar" role="toolbar" aria-label="선택 항목 작업">
    <p class="gallery-action-count" role="status" aria-live="polite">
      {{ selectedCount }}개 선택됨
    </p>

    <div class="gallery-action-buttons">
      <button
        type="button"
        class="gallery-action-button"
        :disabled="selectedCount === 0"
        @click="$emit('folder-move')"
      >
        폴더 이동
      </button>

      <button
        type="button"
        class="gallery-action-button gallery-action-button--danger"
        :disabled="selectedCount === 0 || bulkDeleting"
        :aria-busy="bulkDeleting"
        @click="$emit('delete')"
      >
        {{ bulkDeleting ? '삭제 중...' : '삭제' }}
      </button>

      <button
        type="button"
        class="gallery-action-button"
        :disabled="selectedCount === 0 || bulkDownloading"
        :aria-busy="bulkDownloading"
        @click="$emit('download')"
      >
        {{ bulkDownloading ? '다운로드 중...' : 'PNG 다운로드' }}
      </button>

      <button
        type="button"
        class="gallery-action-button gallery-action-button--primary"
        :disabled="!hasVisibleItems"
        @click="$emit('toggle-select-all')"
      >
        <span class="gallery-action-button__icon" aria-hidden="true">
          {{ isAllVisibleSelected ? '☑' : '☐' }}
        </span>
        {{ isAllVisibleSelected ? '전체 해제' : '전체 선택' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.gallery-action-bar {
  margin: 18px 0 20px;
  padding: 14px 18px;
  border: 1px solid #d8c9ff;
  border-radius: 16px;
  background: #f7f2ff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  box-sizing: border-box;
}

.gallery-action-count {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: #111827;
  white-space: nowrap;
}

.gallery-action-buttons {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.gallery-action-button {
  height: 42px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid #e4d8ff;
  background: #ffffff;
  color: #6d3df2;
  font-family: var(--sans);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.gallery-action-button:hover:not(:disabled) {
  border-color: #8b5cf6;
  background: #faf7ff;
}

.gallery-action-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.gallery-action-button--danger {
  color: #ff4d6d;
  border-color: #ffc9d3;
  background: #fff7f8;
}

.gallery-action-button--danger:hover:not(:disabled) {
  border-color: #ff4d6d;
  background: #fff0f3;
}

.gallery-action-button--primary {
  color: #ffffff;
  border-color: #6d3df2;
  background: linear-gradient(135deg, #8b5cf6, #6d3df2);
}

.gallery-action-button--primary:hover:not(:disabled) {
  border-color: #6d3df2;
  background: linear-gradient(135deg, #7c4fe0, #5b2fd9);
}

.gallery-action-button__icon {
  font-size: 15px;
  line-height: 1;
}

@media (max-width: 640px) {
  .gallery-action-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .gallery-action-buttons {
    justify-content: flex-start;
  }

  .gallery-action-button {
    flex: 1 1 calc(50% - 5px);
    justify-content: center;
  }

  .gallery-action-button--primary {
    flex: 1 1 100%;
  }
}
</style>
