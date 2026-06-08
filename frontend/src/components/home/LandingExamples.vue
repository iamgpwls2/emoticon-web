<script setup>
import { LANDING_EXAMPLE_IMAGES } from '../../constants/landingImages.js'
import LandingStaticImage from './LandingStaticImage.vue'
</script>

<template>
  <section class="landing-examples" aria-labelledby="landing-examples-title">
    <div class="landing-examples__inner">
      <header class="landing-examples__header">
        <h2 id="landing-examples-title" class="landing-examples__title">
          생성 예시
        </h2>
        <p class="landing-examples__description">
          다양한 감정과 상황에 맞는 이모티콘을 AI가 생성합니다.
        </p>
      </header>

      <ul class="landing-examples__grid">
        <li
          v-for="(example, index) in LANDING_EXAMPLE_IMAGES"
          :key="example.id"
          class="landing-examples__item"
          :style="{ animationDelay: `${index * 0.06}s` }"
        >
          <div class="landing-examples__media">
            <LandingStaticImage
              :src="example.image"
              :emoji="example.emoji"
              :gradient="example.gradient"
              emoji-size="small"
              alt=""
            />
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>
