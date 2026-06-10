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
const showPassword = ref(false)

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
  return '/'
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
  <section class="auth-page auth-page--login">
    <div class="auth-page__decor" aria-hidden="true">
      <span class="auth-page__sparkle auth-page__sparkle--1">✦</span>
      <span class="auth-page__sparkle auth-page__sparkle--2">✦</span>
      <span class="auth-page__sparkle auth-page__sparkle--3">✦</span>
      <span class="auth-page__circle auth-page__circle--1" />
      <span class="auth-page__circle auth-page__circle--2" />
      <span class="auth-page__dots auth-page__dots--1" />
      <span class="auth-page__dots auth-page__dots--2" />
    </div>

    <div class="auth-page__inner">
      <header class="auth-page__header">
        <h1 class="auth-page__title">로그인</h1>
        <p class="auth-page__subtitle">계정으로 로그인해 주세요.</p>
      </header>

      <div class="auth-card">
        <p v-if="registered" class="auth-notice auth-notice--login" role="status">
          회원가입이 완료되었습니다. 이메일 인증 후 로그인해 주세요.
        </p>

        <form class="auth-form" novalidate @submit.prevent="handleSubmit">
          <div class="auth-field">
            <label for="login-email">이메일</label>
            <div
              class="auth-input-wrap"
              :class="{ 'auth-input-wrap--invalid': Boolean(fieldErrors.email) }"
            >
              <span class="auth-input-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M4 7h16v10H4V7Z"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M4 7l8 6 8-6"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </span>
              <input
                id="login-email"
                v-model="email"
                type="email"
                autocomplete="email"
                placeholder="you@example.com"
                :aria-invalid="Boolean(fieldErrors.email)"
                :disabled="submitting"
              />
            </div>
            <p v-if="fieldErrors.email" class="auth-field-error" role="alert">
              {{ fieldErrors.email }}
            </p>
          </div>

          <div class="auth-field">
            <label for="login-password">비밀번호</label>
            <div
              class="auth-input-wrap"
              :class="{ 'auth-input-wrap--invalid': Boolean(fieldErrors.password) }"
            >
              <span class="auth-input-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect
                    x="5"
                    y="11"
                    width="14"
                    height="10"
                    rx="2"
                    stroke="currentColor"
                    stroke-width="1.8"
                  />
                  <path
                    d="M8 11V8a4 4 0 1 1 8 0v3"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                  />
                </svg>
              </span>
              <input
                id="login-password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="비밀번호"
                :aria-invalid="Boolean(fieldErrors.password)"
                :disabled="submitting"
              />
              <button
                type="button"
                class="auth-input-toggle"
                :aria-label="showPassword ? '비밀번호 숨기기' : '비밀번호 보기'"
                :disabled="submitting"
                @click="showPassword = !showPassword"
              >
                <svg
                  v-if="showPassword"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z"
                    stroke="currentColor"
                    stroke-width="1.8"
                  />
                  <circle cx="12" cy="12" r="2.5" stroke="currentColor" stroke-width="1.8" />
                </svg>
                <svg
                  v-else
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z"
                    stroke="currentColor"
                    stroke-width="1.8"
                  />
                  <path d="M4 4l16 16" stroke="currentColor" stroke-width="1.8" />
                </svg>
              </button>
            </div>
            <p v-if="fieldErrors.password" class="auth-field-error" role="alert">
              {{ fieldErrors.password }}
            </p>
          </div>

          <p v-if="formError" class="auth-form-error" role="alert">
            {{ formError }}
          </p>

          <button
            type="submit"
            class="auth-submit auth-submit--login"
            :disabled="submitting"
          >
            {{ submitting ? '로그인 중…' : '로그인' }}
          </button>
        </form>

        <div class="auth-divider" aria-hidden="true">
          <span class="auth-divider__text">또는</span>
        </div>

        <p class="auth-footer auth-footer--login">
          계정이 없으신가요?
          <router-link to="/register">회원가입!</router-link>
        </p>
      </div>
    </div>
  </section>
</template>
