<script setup>
const steps = [
  {
    id: 'upload',
    step: '01',
    title: '캐릭터 이미지 업로드',
    description: '원하는 캐릭터 이미지를 업로드해 주세요.',
    icon: 'upload',
  },
  {
    id: 'select',
    step: '02',
    title: '감정·모션·텍스트 설정',
    description: '감정과 모션을 선택하고 텍스트를 입력합니다.',
    icon: 'settings',
  },
  {
    id: 'generate',
    step: '03',
    title: 'AI 이모티콘 생성',
    description: 'AI가 캐릭터를 유지한 이모티콘을 생성합니다.',
    icon: 'sparkle',
  },
]
</script>

<template>
  <section class="landing-how" aria-labelledby="landing-how-title">
    <div class="how-shell">
      <div class="landing-how__inner">
      <header class="landing-how__header">
        <h2 id="landing-how-title" class="landing-how__title">
          어떻게 이모티콘을 만들까요?
        </h2>
      </header>

      <div class="landing-how__flow">
        <template v-for="(item, index) in steps" :key="item.id">
          <article
            class="landing-how__card"
            :style="{ animationDelay: `${index * 0.1}s` }"
          >
            <span class="landing-how__step-num">{{ item.step }}</span>

            <div class="landing-how__icon" aria-hidden="true">
              <svg
                v-if="item.icon === 'upload'"
                class="landing-how__icon-svg"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 16V4m0 0L8 8m4-4 4 4"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
              <svg
                v-else-if="item.icon === 'settings'"
                class="landing-how__icon-svg"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4 7h16M4 12h10M4 17h14"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
                <circle cx="17" cy="12" r="2" fill="currentColor" />
                <circle cx="9" cy="7" r="2" fill="currentColor" />
                <circle cx="13" cy="17" r="2" fill="currentColor" />
              </svg>
              <svg
                v-else
                class="landing-how__icon-svg"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 2l1.2 3.7h3.8l-3.1 2.2 1.2 3.7L12 9.4 8.9 11.6l1.2-3.7-3.1-2.2h3.8L12 2Z"
                  fill="currentColor"
                />
                <path
                  d="M5 14l.7 2.1h2.2l-1.8 1.3.7 2.1L5 18.5 3.2 19.5l.7-2.1-1.8-1.3h2.2L5 14Z"
                  fill="currentColor"
                  opacity="0.75"
                />
              </svg>
            </div>

            <h3 class="landing-how__card-title">{{ item.title }}</h3>
            <p class="landing-how__card-text">{{ item.description }}</p>
          </article>

          <span
            v-if="index < steps.length - 1"
            class="landing-how__chevron"
            aria-hidden="true"
          >
            ›
          </span>
        </template>
      </div>
      </div>
    </div>
  </section>
</template>
