<script setup>
import { LANDING_EXAMPLE_IMAGES } from '../../constants/landingImages.js'
import LandingStaticImage from './LandingStaticImage.vue'
</script>

<template>
  <section class="landing-strip" aria-labelledby="landing-strip-title">
    <div class="example-shell">
      <header class="landing-strip__header">
        <h2 id="landing-strip-title" class="landing-strip__title">
          다양한 이모티콘 예시
        </h2>
        <span class="landing-strip__more" aria-hidden="true">더 보기 &gt;</span>
      </header>

      <div class="landing-strip__scroll-wrap">
        <ul class="landing-strip__track">
          <li
            v-for="(example, index) in LANDING_EXAMPLE_IMAGES"
            :key="example.id"
            class="landing-strip__item"
            :style="{ animationDelay: `${index * 0.05}s` }"
          >
            <div class="landing-strip__card">
              <div class="landing-strip__media">
                <LandingStaticImage
                  :src="example.image"
                  :emoji="example.emoji"
                  :gradient="example.gradient"
                  emoji-size="small"
                  alt=""
                />
              </div>
            </div>
          </li>
        </ul>

        <span class="landing-strip__scroll-hint" aria-hidden="true">›</span>
      </div>
    </div>
  </section>
</template>
