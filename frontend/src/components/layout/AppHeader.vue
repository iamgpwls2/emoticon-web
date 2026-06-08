<script setup>
import { computed } from 'vue'
import { useAuth } from '../../composables/useAuth.js'
import LogoutButton from '../auth/LogoutButton.vue'
import LogoIcon from './LogoIcon.vue'

const { isAuthenticated, loading } = useAuth()

const startPath = computed(() =>
  isAuthenticated.value ? '/generate' : '/register',
)
</script>

<template>
  <header class="app-header">
    <div class="app-header__inner">
      <router-link to="/" class="app-header__brand">
        <span class="app-header__logo-icon" aria-hidden="true">
          <LogoIcon />
        </span>
        <span class="app-header__logo-text">Emoticon Web</span>
      </router-link>

      <nav
        v-if="!loading"
        class="app-header__actions"
        aria-label="주요 메뉴"
      >
        <template v-if="isAuthenticated">
          <router-link to="/generate" class="app-header__btn app-header__btn--secondary">
            생성
          </router-link>
          <router-link to="/gallery" class="app-header__btn app-header__btn--secondary">
            갤러리
          </router-link>
          <LogoutButton />
        </template>
        <template v-else>
          <router-link to="/login" class="app-header__btn app-header__btn--secondary">
            로그인
          </router-link>
          <router-link :to="startPath" class="app-header__btn app-header__btn--primary">
            회원가입
          </router-link>
        </template>
      </nav>
    </div>
  </header>
</template>
