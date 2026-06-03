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
  <section class="auth-page">
    <div class="auth-card">
      <h1>회원가입</h1>
      <p class="auth-lead">이모티콘 생성을 시작하려면 계정을 만들어 주세요.</p>

      <form class="auth-form" novalidate @submit.prevent="handleSubmit">
        <div class="auth-field">
          <label for="register-email">이메일</label>
          <input
            id="register-email"
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
          <label for="register-password">비밀번호</label>
          <input
            id="register-password"
            v-model="password"
            type="password"
            autocomplete="new-password"
            placeholder="6자 이상"
            :aria-invalid="Boolean(fieldErrors.password)"
            :disabled="submitting"
          />
          <p v-if="fieldErrors.password" class="auth-field-error" role="alert">
            {{ fieldErrors.password }}
          </p>
        </div>

        <div class="auth-field">
          <label for="register-password-confirm">비밀번호 확인</label>
          <input
            id="register-password-confirm"
            v-model="passwordConfirm"
            type="password"
            autocomplete="new-password"
            placeholder="비밀번호 재입력"
            :aria-invalid="Boolean(fieldErrors.passwordConfirm)"
            :disabled="submitting"
          />
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

        <button type="submit" class="auth-submit" :disabled="submitting">
          {{ submitting ? '가입 중…' : '회원가입' }}
        </button>
      </form>

      <p class="auth-footer">
        이미 계정이 있나요?
        <router-link to="/login">로그인</router-link>
      </p>
    </div>
  </section>
</template>
