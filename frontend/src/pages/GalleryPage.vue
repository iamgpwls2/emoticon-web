<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import ErrorMessage from '../components/ErrorMessage.vue'
import GalleryGrid from '../components/GalleryGrid.vue'
import {
  deleteGeneration,
  fetchMyGenerations,
} from '../services/generation.service.js'

const PAGE_LIMIT = 12

const items = ref([])
const page = ref(1)
const hasMore = ref(false)
const total = ref(0)
const isLoading = ref(false)
const isLoadingMore = ref(false)
const errorMessage = ref('')
const deleteErrorMessage = ref('')
const deletingId = ref('')

const isInitialLoading = () => isLoading.value && items.value.length === 0
const isEmpty = () =>
  !isLoading.value && !errorMessage.value && items.value.length === 0
const isSuccess = () =>
  !isLoading.value && !errorMessage.value && items.value.length > 0

async function loadGenerations({ nextPage = 1, append = false } = {}) {
  if (append) {
    if (isLoadingMore.value || isLoading.value || !hasMore.value) return
    isLoadingMore.value = true
  } else {
    if (isLoading.value) return
    isLoading.value = true
    errorMessage.value = ''
  }

  try {
    const result = await fetchMyGenerations({
      page: nextPage,
      limit: PAGE_LIMIT,
    })

    items.value = append ? [...items.value, ...result.items] : result.items
    page.value = result.page
    hasMore.value = Boolean(result.hasMore)
    total.value = result.total ?? items.value.length
  } catch (err) {
    if (!append) {
      items.value = []
      hasMore.value = false
      total.value = 0
    }

    errorMessage.value =
      err instanceof Error
        ? err.message
        : '이모티콘 목록을 불러오지 못했습니다. 다시 시도해 주세요.'
  } finally {
    isLoading.value = false
    isLoadingMore.value = false
  }
}

function handleRetry() {
  page.value = 1
  loadGenerations({ nextPage: 1, append: false })
}

function handleLoadMore() {
  loadGenerations({ nextPage: page.value + 1, append: true })
}

async function handleDelete(generationId) {
  if (deletingId.value) return

  deletingId.value = generationId
  deleteErrorMessage.value = ''

  try {
    await deleteGeneration(generationId)
    items.value = items.value.filter((item) => item.id !== generationId)
    total.value = Math.max(0, total.value - 1)
    deleteErrorMessage.value = ''
  } catch (err) {
    deleteErrorMessage.value =
      err instanceof Error
        ? err.message
        : '이모티콘 삭제에 실패했습니다. 다시 시도해 주세요.'
  } finally {
    deletingId.value = ''
  }
}

onMounted(() => {
  loadGenerations({ nextPage: 1, append: false })
})
</script>

<template>
  <section class="gallery-page">
    <div class="gallery-page__card">
      <header class="gallery-page__header">
        <h1>내 이모티콘 갤러리</h1>
        <p class="gallery-page__lead">
          생성한 이모티콘을 모아볼 수 있습니다.
          <span v-if="isSuccess()" class="gallery-page__count">
            총 {{ total }}개
          </span>
        </p>
      </header>

      <p
        v-if="isInitialLoading()"
        class="gallery-page__loading-text"
        role="status"
        aria-live="polite"
      >
        이모티콘 목록을 불러오는 중입니다...
      </p>

      <GalleryGrid v-if="isInitialLoading()" :loading="true" />

      <div v-else-if="errorMessage" class="gallery-page__error">
        <ErrorMessage :message="errorMessage" />
        <button
          type="button"
          class="gallery-page__retry-btn"
          @click="handleRetry"
        >
          다시 시도
        </button>
      </div>

      <div v-else-if="isEmpty()" class="gallery-page__empty">
        <p class="gallery-page__empty-text">
          아직 생성한 이모티콘이 없습니다.
        </p>
        <RouterLink to="/generate" class="gallery-page__create-link">
          이모티콘 만들러 가기
        </RouterLink>
      </div>

      <template v-else-if="isSuccess()">
        <ErrorMessage
          v-if="deleteErrorMessage"
          :message="deleteErrorMessage"
        />

        <GalleryGrid
          :items="items"
          :deleting-id="deletingId"
          @delete="handleDelete"
        />

        <div v-if="hasMore" class="gallery-page__load-more">
          <button
            type="button"
            class="gallery-page__load-more-btn"
            :disabled="isLoadingMore"
            @click="handleLoadMore"
          >
            {{ isLoadingMore ? '불러오는 중...' : '더 보기' }}
          </button>
        </div>
      </template>
    </div>
  </section>
</template>

<style scoped>
.gallery-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-grow: 1;
  width: 100%;
  box-sizing: border-box;
  padding: 32px 20px;
  text-align: left;
}

.gallery-page__card {
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

@media (min-width: 641px) {
  .gallery-page__card {
    max-width: 960px;
  }
}

.gallery-page__header h1 {
  margin: 0 0 12px;
  font-size: 36px;
  text-align: center;
  color: var(--text-h);
}

.gallery-page__lead {
  margin: 0;
  text-align: center;
  line-height: 1.5;
  color: var(--text);
}

.gallery-page__count {
  display: block;
  margin-top: 6px;
  font-size: 14px;
}

.gallery-page__loading-text {
  margin: 0;
  text-align: center;
  font-size: 14px;
  color: var(--text);
}

.gallery-page__error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.gallery-page__retry-btn,
.gallery-page__load-more-btn {
  width: 100%;
  max-width: 320px;
  min-height: 44px;
  font-family: var(--sans);
  font-size: 16px;
  font-weight: 500;
  line-height: 1.4;
  padding: 10px 16px;
  border: 2px solid transparent;
  border-radius: 8px;
  color: var(--accent);
  background: var(--accent-bg);
  cursor: pointer;
  transition: border-color 0.3s, box-shadow 0.3s, opacity 0.2s,
    background-color 0.2s;
}

.gallery-page__retry-btn:hover:not(:disabled),
.gallery-page__load-more-btn:hover:not(:disabled) {
  border-color: var(--accent-border);
  box-shadow: var(--shadow);
}

.gallery-page__retry-btn:focus-visible,
.gallery-page__load-more-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.gallery-page__retry-btn:disabled,
.gallery-page__load-more-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.gallery-page__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
  padding: 32px 16px;
  border: 1px dashed var(--border);
  border-radius: 12px;
  background: var(--code-bg);
  box-sizing: border-box;
  text-align: center;
}

.gallery-page__empty-text {
  margin: 0;
  font-size: 15px;
  line-height: 1.5;
  color: var(--text-h);
}

.gallery-page__create-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 10px 18px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  text-decoration: none;
  color: var(--accent);
  background: var(--accent-bg);
  border: 2px solid transparent;
}

.gallery-page__create-link:hover {
  border-color: var(--accent-border);
  box-shadow: var(--shadow);
}

.gallery-page__load-more {
  display: flex;
  justify-content: center;
  width: 100%;
  padding-top: 4px;
}

@media (max-width: 480px) {
  .gallery-page {
    padding: 24px 16px;
  }

  .gallery-page__card {
    max-width: 100%;
    gap: 16px;
  }

  .gallery-page__header h1 {
    font-size: 28px;
  }

  .gallery-page__retry-btn,
  .gallery-page__load-more-btn {
    max-width: 100%;
  }
}
</style>
