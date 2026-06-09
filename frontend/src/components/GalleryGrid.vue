<script setup>
import EmoticonCard from './EmoticonCard.vue'

defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  skeletonCount: {
    type: Number,
    default: 6,
  },
  deletingId: {
    type: String,
    default: '',
  },
  movingIds: {
    type: Array,
    default: () => [],
  },
  selectionMode: {
    type: Boolean,
    default: false,
  },
  selectedIds: {
    type: Array,
    default: () => [],
  },
})

defineEmits(['delete', 'toggle-select', 'drag-start'])
</script>

<template>
  <div
    class="gallery-grid"
    :class="{ 'gallery-grid--loading': loading }"
    :aria-busy="loading"
  >
    <template v-if="loading">
      <div
        v-for="index in skeletonCount"
        :key="`skeleton-${index}`"
        class="gallery-grid__skeleton"
        aria-hidden="true"
      >
        <div class="gallery-grid__skeleton-image" />
        <div class="gallery-grid__skeleton-line gallery-grid__skeleton-line--short" />
        <div class="gallery-grid__skeleton-line" />
      </div>
    </template>

    <EmoticonCard
      v-for="item in items"
      v-else
      :key="item.id"
      :id="item.id"
      :generated-image-url="item.generatedImageUrl"
      :emotion="item.emotion"
      :motion="item.motion"
      :input-text="item.inputText"
      :created-at="item.createdAt"
      :status="item.status"
      :selection-mode="selectionMode"
      :selected="selectedIds.includes(item.id)"
      :deleting="deletingId === item.id"
      :moving="movingIds.includes(item.id)"
      @delete="$emit('delete', $event)"
      @toggle-select="$emit('toggle-select', $event)"
      @drag-start="$emit('drag-start', $event)"
    />
  </div>
</template>

<style scoped>
.gallery-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  width: 100%;
}

@media (min-width: 641px) {
  .gallery-grid {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 20px;
  }
}

.gallery-grid__skeleton {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--code-bg);
  box-sizing: border-box;
}

.gallery-grid__skeleton-image {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 8px;
  background: linear-gradient(
    90deg,
    var(--social-bg) 25%,
    var(--border) 50%,
    var(--social-bg) 75%
  );
  background-size: 200% 100%;
  animation: gallery-grid-shimmer 1.2s ease-in-out infinite;
}

.gallery-grid__skeleton-line {
  height: 14px;
  border-radius: 4px;
  background: var(--social-bg);
}

.gallery-grid__skeleton-line--short {
  width: 55%;
}

@keyframes gallery-grid-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
