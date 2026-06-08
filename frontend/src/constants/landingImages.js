const landingPath = (filename) => `/landing/${filename}`

/** Hero 영역 — 원본 캐릭터 및 생성 결과 미리보기 */
export const LANDING_HERO_IMAGES = {
  original: landingPath('hero-original.png'),
  smile: landingPath('hero-smile.png'),
  clap: landingPath('hero-clap.png'),
  love: landingPath('hero-love.png'),
}

/**
 * Hero preview 데모 이미지 — 에셋 준비 후 아래 import로 교체하세요.
 * import demoCharacter from '../assets/demo-character.png'
 * import demoSmile from '../assets/demo-smile.png'
 * import demoClap from '../assets/demo-clap.png'
 * import demoLove from '../assets/demo-love.png'
 */
export const LANDING_HERO_DEMO_ASSETS = {
  character: LANDING_HERO_IMAGES.original,
  smile: LANDING_HERO_IMAGES.smile,
  clap: LANDING_HERO_IMAGES.clap,
  love: LANDING_HERO_IMAGES.love,
}

export const LANDING_HERO_RESULTS = [
  {
    id: 'smile',
    label: '웃음',
    emoji: '😊',
    image: LANDING_HERO_IMAGES.smile,
    gradient: 'linear-gradient(145deg, #fde68a 0%, #fbbf24 100%)',
  },
  {
    id: 'clap',
    label: '박수',
    emoji: '👏',
    image: LANDING_HERO_IMAGES.clap,
    gradient: 'linear-gradient(145deg, #c4b5fd 0%, #8b5cf6 100%)',
  },
  {
    id: 'love',
    label: '사랑해',
    emoji: '💕',
    image: LANDING_HERO_IMAGES.love,
    gradient: 'linear-gradient(145deg, #fbcfe8 0%, #f472b6 100%)',
  },
]

const EXAMPLE_FALLBACKS = [
  { emoji: '🎉', gradient: 'linear-gradient(145deg, #fef3c7 0%, #fde68a 100%)' },
  { emoji: '😢', gradient: 'linear-gradient(145deg, #dbeafe 0%, #93c5fd 100%)' },
  { emoji: '😲', gradient: 'linear-gradient(145deg, #ede9fe 0%, #c4b5fd 100%)' },
  { emoji: '😠', gradient: 'linear-gradient(145deg, #fee2e2 0%, #fca5a5 100%)' },
  { emoji: '😍', gradient: 'linear-gradient(145deg, #fce7f3 0%, #f9a8d4 100%)' },
  { emoji: '🙌', gradient: 'linear-gradient(145deg, #d1fae5 0%, #6ee7b7 100%)' },
  { emoji: '🤔', gradient: 'linear-gradient(145deg, #e0e7ff 0%, #a5b4fc 100%)' },
]

/** 메인 페이지 하단 — 정적 생성 예시 갤러리 (API 미연동) */
export const LANDING_EXAMPLE_IMAGES = EXAMPLE_FALLBACKS.map((fallback, index) => {
  const num = String(index + 1).padStart(2, '0')
  return {
    id: `example-${num}`,
    image: landingPath(`example-${num}.png`),
    ...fallback,
  }
})
