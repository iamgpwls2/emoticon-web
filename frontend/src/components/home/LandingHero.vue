<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuth } from '../../composables/useAuth.js'
import LandingVisual from './LandingVisual.vue'

const { isAuthenticated, loading } = useAuth()

const startPath = computed(() =>
  isAuthenticated.value ? '/generate' : '/register',
)
</script>

<template>
  <section class="landing-hero">
    <div class="hero-shell">
      <div class="landing-hero__content">
      <p class="landing-hero__badge">AI 이모티콘 생성 서비스</p>

      <h1 class="landing-hero__title">
        <span class="landing-hero__title-line">캐릭터를 유지한</span>
        <span class="landing-hero__title-line">
          <span class="landing-hero__title-accent">AI 이모티콘</span>
          생성
        </span>
      </h1>

      <p class="landing-hero__description">
        이미지를 업로드하고 감정·모션·텍스트를 선택하면<br />
        AI가 캐릭터의 분위기를 유지한 이모티콘을 생성합니다.
      </p>

      <div v-if="!loading" class="landing-hero__cta">
        <RouterLink
          :to="startPath"
          class="landing-hero__btn landing-hero__btn--primary"
        >
          시작하기
          <span class="landing-hero__btn-arrow" aria-hidden="true">→</span>
        </RouterLink>
      </div>

      <ul class="landing-hero__benefits" aria-label="서비스 장점">
        <li class="landing-hero__benefit">
          <span class="landing-hero__benefit-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 3l7 3v6c0 4.2-2.9 7.4-7 9-4.1-1.6-7-4.8-7-9V6l7-3Z"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linejoin="round"
              />
              <path
                d="M9.5 12.2l1.8 1.8 3.7-3.8"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
          원본 캐릭터 유지
        </li>
        <li class="landing-hero__benefit">
          <span class="landing-hero__benefit-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.8" />
              <path
                d="M8.5 14.5c.8 1.2 2 2 3.5 2s2.7-.8 3.5-2"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
              />
              <circle cx="9" cy="10" r="1" fill="currentColor" />
              <circle cx="15" cy="10" r="1" fill="currentColor" />
            </svg>
          </span>
          다양한 감정 표현
        </li>
        <li class="landing-hero__benefit">
          <span class="landing-hero__benefit-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 4v10m0 0l3.5-3.5M12 14l-3.5-3.5M5 18h14"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
          고화질 PNG 다운로드
        </li>
      </ul>
      </div>

      <div class="landing-hero__visual">
        <LandingVisual />
      </div>
    </div>
  </section>
</template>
