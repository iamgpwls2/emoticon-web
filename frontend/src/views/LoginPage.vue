<script setup>
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth.js'
import { isValidEmail } from '../utils/isValidEmail.js'

const route = useRoute()
const router = useRouter()
const { signIn } = useAuth()

const registered = computed(() => route.query.registered === '1')

const email = ref('')
const password = ref('')
const submitting = ref(false)
const formError = ref('')

const fieldErrors = reactive({
  email: '',
  password: '',
})

function clearErrors() {
  formError.value = ''
  fieldErrors.email = ''
  fieldErrors.password = ''
}

function validateForm() {
  clearErrors()
  let valid = true

  const trimmedEmail = email.value.trim()

  if (!trimmedEmail) {
    fieldErrors.email = '이메일을 입력해 주세요.'
    valid = false
  } else if (!isValidEmail(trimmedEmail)) {
    fieldErrors.email = '올바른 이메일 형식을 입력해 주세요.'
    valid = false
  }

  if (!password.value) {
    fieldErrors.password = '비밀번호를 입력해 주세요.'
    valid = false
  }

  return valid
}

function resolveRedirectPath() {
  const redirect = route.query.redirect
  if (typeof redirect === 'string' && redirect.startsWith('/')) {
    return redirect
  }
  return '/gallery'
}

async function handleSubmit() {
  if (submitting.value) return
  if (!validateForm()) return

  submitting.value = true
  formError.value = ''

  try {
    await signIn(email.value.trim(), password.value)
    await router.push(resolveRedirectPath())
  } catch {
    formError.value = '이메일 또는 비밀번호를 확인해주세요.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="auth-page">
    <div class="auth-card">
      <h1>로그인</h1>

      <p v-if="registered" class="auth-notice" role="status">
        회원가입이 완료되었습니다. 이메일 인증 후 로그인해 주세요.
      </p>
      <p v-else class="auth-lead">계정으로 로그인해 주세요.</p>

      <form class="auth-form" novalidate @submit.prevent="handleSubmit">
        <div class="auth-field">
          <label for="login-email">이메일</label>
          <input
            id="login-email"
            v-model="email"
            type="email"
            autocomplete="email"
            placeholder="you@example.com"
            :aria-invalid="Boolean(fieldErrors.email)"
            :disabled="submitting"
          />
          <p v-if="fieldErrors.email" class="auth-field-error" role="alert">
            {{ fieldErrors.email }}
          </p>
        </div>

        <div class="auth-field">
          <label for="login-password">비밀번호</label>
          <input
            id="login-password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            placeholder="비밀번호"
            :aria-invalid="Boolean(fieldErrors.password)"
            :disabled="submitting"
          />
          <p v-if="fieldErrors.password" class="auth-field-error" role="alert">
            {{ fieldErrors.password }}
          </p>
        </div>

        <p v-if="formError" class="auth-form-error" role="alert">
          {{ formError }}
        </p>

        <button type="submit" class="auth-submit" :disabled="submitting">
          {{ submitting ? '로그인 중…' : '로그인' }}
        </button>
      </form>

      <p class="auth-footer">
        계정이 없나요?
        <router-link to="/register">회원가입</router-link>
      </p>
    </div>
  </section>
</template>
