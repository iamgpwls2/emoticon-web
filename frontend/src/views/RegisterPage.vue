<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth.js'
import { isValidEmail } from '../utils/isValidEmail.js'

const route = useRoute()
const router = useRouter()
const { signUp } = useAuth()

const email = ref('')
const password = ref('')
const passwordConfirm = ref('')
const submitting = ref(false)
const formError = ref('')
const showPassword = ref(false)
const showPasswordConfirm = ref(false)

const fieldErrors = reactive({
  email: '',
  password: '',
  passwordConfirm: '',
})

function clearErrors() {
  formError.value = ''
  fieldErrors.email = ''
  fieldErrors.password = ''
  fieldErrors.passwordConfirm = ''
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
  } else if (password.value.length < 6) {
    fieldErrors.password = '비밀번호는 6자 이상이어야 합니다.'
    valid = false
  }

  if (!passwordConfirm.value) {
    fieldErrors.passwordConfirm = '비밀번호 확인을 입력해 주세요.'
    valid = false
  } else if (password.value !== passwordConfirm.value) {
    fieldErrors.passwordConfirm = '비밀번호가 일치하지 않습니다.'
    valid = false
  }

  return valid
}

function toUserFriendlyError(error) {
  const message = (error?.message ?? '').toLowerCase()

  if (message.includes('already registered') || message.includes('already exists')) {
    return '이미 가입된 이메일입니다.'
  }
  if (message.includes('invalid email')) {
    return '올바른 이메일 형식을 입력해 주세요.'
  }
  if (message.includes('password')) {
    return '비밀번호 조건을 확인해 주세요.'
  }
  if (message.includes('rate limit') || message.includes('too many')) {
    return '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.'
  }
  if (message.includes('network') || message.includes('fetch')) {
    return '네트워크 오류가 발생했습니다. 연결을 확인하고 다시 시도해 주세요.'
  }

  return '회원가입에 실패했습니다. 입력 정보를 확인하고 다시 시도해 주세요.'
}

function resolveRedirectPath() {
  const redirect = route.query.redirect
  if (typeof redirect === 'string' && redirect.startsWith('/')) {
    return redirect
  }
  return '/generate'
}

async function handleSubmit() {
  if (submitting.value) return
  if (!validateForm()) return

  submitting.value = true
  formError.value = ''

  try {
    const data = await signUp(email.value.trim(), password.value)
    const redirectPath = resolveRedirectPath()

    if (data.session) {
      await router.push(redirectPath)
    } else {
      await router.push({ path: '/login', query: { registered: '1' } })
    }
  } catch (error) {
    formError.value = toUserFriendlyError(error)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="auth-page auth-page--register">
    <div class="auth-page__decor" aria-hidden="true">
      <span class="auth-page__sparkle auth-page__sparkle--1">✦</span>
      <span class="auth-page__sparkle auth-page__sparkle--2">✦</span>
      <span class="auth-page__sparkle auth-page__sparkle--3">✦</span>
      <span class="auth-page__circle auth-page__circle--1" />
      <span class="auth-page__circle auth-page__circle--2" />
      <span class="auth-page__dots auth-page__dots--1" />
      <span class="auth-page__dots auth-page__dots--2" />
    </div>

    <div class="auth-page__content">
      <header class="auth-page__intro">
        <h1 class="auth-page__title">회원가입</h1>
        <p class="auth-page__subtitle">
          이모티콘 생성을 시작하려면 계정을 만들어 주세요.
        </p>
      </header>

      <div class="auth-card auth-card--register">
        <form class="auth-form auth-form--register" novalidate @submit.prevent="handleSubmit">
          <div class="auth-field">
            <label for="register-email">이메일 주소</label>
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
                id="register-email"
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
            <label for="register-password">비밀번호</label>
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
                id="register-password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="6자 이상"
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

          <div class="auth-field">
            <label for="register-password-confirm">비밀번호 확인</label>
            <div
              class="auth-input-wrap"
              :class="{
                'auth-input-wrap--invalid': Boolean(fieldErrors.passwordConfirm),
              }"
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
                id="register-password-confirm"
                v-model="passwordConfirm"
                :type="showPasswordConfirm ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="비밀번호 재입력"
                :aria-invalid="Boolean(fieldErrors.passwordConfirm)"
                :disabled="submitting"
              />
              <button
                type="button"
                class="auth-input-toggle"
                :aria-label="showPasswordConfirm ? '비밀번호 숨기기' : '비밀번호 보기'"
                :disabled="submitting"
                @click="showPasswordConfirm = !showPasswordConfirm"
              >
                <svg
                  v-if="showPasswordConfirm"
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
            <p
              v-if="fieldErrors.passwordConfirm"
              class="auth-field-error"
              role="alert"
            >
              {{ fieldErrors.passwordConfirm }}
            </p>
          </div>

          <p v-if="formError" class="auth-form-error" role="alert">
            {{ formError }}
          </p>

          <button type="submit" class="auth-submit auth-submit--register" :disabled="submitting">
            {{ submitting ? '가입 중…' : '회원가입' }}
          </button>
        </form>

        <p class="auth-footer auth-footer--register">
          이미 계정이 있나요?
          <router-link to="/login">로그인</router-link>
        </p>
      </div>
    </div>
  </section>
</template>
