<script setup>
import { useAuth } from './composables/useAuth.js'
import LogoutButton from './components/auth/LogoutButton.vue'

const { isAuthenticated, loading } = useAuth()
</script>

<template>
  <div class="app-layout">
    <header class="app-header">
      <nav class="app-nav" aria-label="주요 메뉴">
        <router-link to="/" class="app-nav-brand">Emoticon Web</router-link>

        <div v-if="!loading" class="app-nav-actions">
          <template v-if="isAuthenticated">
            <router-link to="/generate" class="app-nav-link">생성</router-link>
            <router-link to="/gallery" class="app-nav-link">갤러리</router-link>
            <LogoutButton />
          </template>
          <template v-else>
            <router-link to="/login" class="app-nav-link">로그인</router-link>
            <router-link to="/register" class="app-nav-link">회원가입</router-link>
          </template>
        </div>
      </nav>
    </header>

    <main class="app-main">
      <router-view />
    </main>
  </div>
</template>
