<script setup>
import { onBeforeUnmount, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from './components/layout/AppHeader.vue'
import GalleryToast from './components/GalleryToast.vue'
import { useAppToast } from './composables/useAppToast.js'
import { useGenerationJob } from './composables/useGenerationJob.js'

const router = useRouter()
const { toastMessage, toastVisible, showAppToast } = useAppToast()
const { onComplete, offComplete } = useGenerationJob()

function handleGlobalGenerationComplete() {
  const routeName = router.currentRoute.value.name
  if (routeName !== 'Generate') {
    showAppToast('이모티콘 생성이 완료되었습니다!')
  }
}

onMounted(() => {
  onComplete(handleGlobalGenerationComplete)
})

onBeforeUnmount(() => {
  offComplete(handleGlobalGenerationComplete)
})
</script>

<template>
  <div class="app-shell">
    <AppHeader />

    <main class="app-main">
      <router-view />
    </main>

    <GalleryToast :message="toastMessage" :visible="toastVisible" />
  </div>
</template>
