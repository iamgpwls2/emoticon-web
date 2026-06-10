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
    default: 8,
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
  draggingId: {
    type: String,
    default: '',
  },
  favoriteIds: {
    type: Array,
    default: () => [],
  },
  viewMode: {
    type: String,
    default: 'grid',
  },
  collectionNameById: {
    type: Object,
    default: () => ({}),
  },
})

defineEmits([
  'delete',
  'toggle-select',
  'drag-start',
  'drag-end',
  'toggle-favorite',
])
</script>

<template>
  <div
    class="gallery-grid"
    :class="{
      'gallery-grid--loading': loading,
      'gallery-grid--list': viewMode === 'list',
    }"
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
      :dragging="draggingId === item.id"
      :favorite="favoriteIds.includes(item.id)"
      :view-mode="viewMode"
      :folder-name="
        item.collectionId
          ? collectionNameById[item.collectionId] ?? ''
          : ''
      "
      :deleting="deletingId === item.id"
      :moving="movingIds.includes(item.id)"
      @delete="$emit('delete', $event)"
      @toggle-select="$emit('toggle-select', $event)"
      @drag-start="$emit('drag-start', $event)"
      @drag-end="$emit('drag-end')"
      @toggle-favorite="$emit('toggle-favorite', $event)"
    />
  </div>
</template>

<style scoped>
.gallery-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px;
  width: 100%;
}

@media (min-width: 640px) {
  .gallery-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 900px) {
  .gallery-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 1200px) {
  .gallery-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.gallery-grid--list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.gallery-grid__skeleton {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border: 1px solid #ece8f7;
  border-radius: 20px;
  background: #ffffff;
  box-sizing: border-box;
}

.gallery-grid__skeleton-image {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 14px;
  background: linear-gradient(
    90deg,
    #faf7ff 25%,
    #ece8f7 50%,
    #faf7ff 75%
  );
  background-size: 200% 100%;
  animation: gallery-grid-shimmer 1.2s ease-in-out infinite;
}

.gallery-grid__skeleton-line {
  height: 14px;
  border-radius: 6px;
  background: #f1ebff;
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
