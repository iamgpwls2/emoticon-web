<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../../composables/useAuth.js'

const router = useRouter()
const { signOut } = useAuth()

const submitting = ref(false)
const error = ref('')

async function handleLogout() {
  if (submitting.value) return

  submitting.value = true
  error.value = ''

  try {
    await signOut()
    await router.push('/login')
  } catch {
    error.value = '로그아웃에 실패했습니다. 다시 시도해 주세요.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="logout-button">
    <button
      type="button"
      class="app-nav-btn app-nav-btn--logout"
      :disabled="submitting"
      @click="handleLogout"
    >
      {{ submitting ? '로그아웃 중…' : '로그아웃' }}
    </button>
    <p v-if="error" class="logout-button__error" role="alert">
      {{ error }}
    </p>
  </div>
</template>
