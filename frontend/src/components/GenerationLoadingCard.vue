<template>
  <article class="generation-loading-card" role="status" aria-live="polite">
    <div class="generation-loading-card__header">
      <div class="generation-loading-card__title-shimmer" />
      <div class="generation-loading-card__badge-shimmer" />
    </div>

    <div class="generation-loading-card__image">
      <div class="generation-loading-card__shimmer" />
      <div class="generation-loading-card__spinner" aria-hidden="true" />
    </div>

    <p class="generation-loading-card__text">이미지를 생성하는 중입니다...</p>
  </article>
</template>

<style scoped>
.generation-loading-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1px solid #e4d8ff;
  border-radius: 16px;
  background: #ffffff;
  box-sizing: border-box;
}

.generation-loading-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.generation-loading-card__title-shimmer,
.generation-loading-card__badge-shimmer,
.generation-loading-card__shimmer {
  position: relative;
  overflow: hidden;
  background: #f3efff;
}

.generation-loading-card__title-shimmer {
  width: 140px;
  height: 18px;
  border-radius: 8px;
}

.generation-loading-card__badge-shimmer {
  width: 56px;
  height: 24px;
  border-radius: 999px;
}

.generation-loading-card__image {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 240px;
  border: 1px solid #ddd2ff;
  border-radius: 16px;
  background: #faf7ff;
  overflow: hidden;
}

.generation-loading-card__shimmer {
  position: absolute;
  inset: 0;
}

.generation-loading-card__title-shimmer::after,
.generation-loading-card__badge-shimmer::after,
.generation-loading-card__shimmer::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.65) 50%,
    transparent 100%
  );
  animation: generation-loading-shimmer 1.4s ease-in-out infinite;
}

.generation-loading-card__spinner {
  position: relative;
  z-index: 1;
  width: 42px;
  height: 42px;
  border: 3px solid #e4d8ff;
  border-top-color: #6d3df2;
  border-radius: 50%;
  animation: generation-loading-spin 0.8s linear infinite;
}

.generation-loading-card__text {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #6d3df2;
  text-align: center;
}

@keyframes generation-loading-shimmer {
  100% {
    transform: translateX(100%);
  }
}

@keyframes generation-loading-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
