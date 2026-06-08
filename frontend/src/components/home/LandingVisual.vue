<script setup>
import {
  LANDING_HERO_DEMO_ASSETS,
  LANDING_HERO_RESULTS,
} from '../../constants/landingImages.js'
import LandingStaticImage from './LandingStaticImage.vue'

const MAIN_GRADIENT =
  'linear-gradient(160deg, #f1ebff 0%, #d8c9ff 45%, #b9a0ff 100%)'
</script>

<template>
  <div class="landing-visual" aria-hidden="true">
    <div class="landing-visual__glow landing-visual__glow--left" />
    <div class="landing-visual__glow landing-visual__glow--right" />

    <span class="landing-visual__sparkle landing-visual__sparkle--1">✦</span>
    <span class="landing-visual__sparkle landing-visual__sparkle--2">✦</span>
    <span class="landing-visual__sparkle landing-visual__sparkle--3">✦</span>

    <div class="hero-preview-flow">
      <article class="source-character-card">
        <div class="source-image-box">
          <LandingStaticImage
            :src="LANDING_HERO_DEMO_ASSETS.character"
            emoji="🧑‍🎨"
            :gradient="MAIN_GRADIENT"
            emoji-size="large"
            alt=""
          />
        </div>
        <span class="source-character-card__label">원본 캐릭터</span>
      </article>

      <div class="flow-arrow" aria-hidden="true">
        <svg
          viewBox="0 0 140 300"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <marker
              id="hero-preview-arrowhead"
              markerWidth="8"
              markerHeight="8"
              refX="7"
              refY="4"
              orient="auto"
            >
              <path d="M0 0 L8 4 L0 8 Z" fill="#8b5cf6" />
            </marker>
          </defs>

          <path
            d="M0 150 H36"
            stroke="#b8a6f8"
            stroke-width="2.5"
            stroke-dasharray="6 6"
            stroke-linecap="round"
          />
          <path
            d="M36 46 V254"
            stroke="#b8a6f8"
            stroke-width="2.5"
            stroke-dasharray="6 6"
            stroke-linecap="round"
          />
          <path
            d="M36 46 H124"
            stroke="#b8a6f8"
            stroke-width="2.5"
            stroke-dasharray="6 6"
            stroke-linecap="round"
            marker-end="url(#hero-preview-arrowhead)"
          />
          <path
            d="M36 150 H124"
            stroke="#b8a6f8"
            stroke-width="2.5"
            stroke-dasharray="6 6"
            stroke-linecap="round"
            marker-end="url(#hero-preview-arrowhead)"
          />
          <path
            d="M36 254 H124"
            stroke="#b8a6f8"
            stroke-width="2.5"
            stroke-dasharray="6 6"
            stroke-linecap="round"
            marker-end="url(#hero-preview-arrowhead)"
          />
        </svg>
      </div>

      <div class="result-emoticon-list">
        <article
          v-for="(result, index) in LANDING_HERO_RESULTS"
          :key="result.id"
          class="result-emoticon-card"
          :style="{ animationDelay: `${index * 0.1}s` }"
        >
          <div class="result-emoticon-card__media">
            <LandingStaticImage
              :src="LANDING_HERO_DEMO_ASSETS[result.id]"
              :emoji="result.emoji"
              :gradient="result.gradient"
              emoji-size="default"
              alt=""
            />
          </div>
          <span class="result-emoticon-card__label">{{ result.label }}</span>
        </article>
      </div>
    </div>
  </div>
</template>
