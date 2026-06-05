/** 이모티콘 입력 텍스트 최대 길이 */
export const EMOTICON_TEXT_MAX_LENGTH = 30

function trimValue(value) {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * 이모티콘 프롬프트 입력값을 검증합니다.
 * @param {{ emotion?: string, motion?: string, text?: string, hasImage?: boolean }} input
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
export function validatePromptInput({ emotion, motion, text, hasImage }) {
  const errors = {}

  if (!hasImage) {
    errors.image = '이미지를 먼저 업로드해 주세요.'
  }

  const emotionValue = trimValue(emotion)
  if (!emotionValue) {
    errors.emotion = '감정을 입력해 주세요.'
  }

  const motionValue = trimValue(motion)
  if (!motionValue) {
    errors.motion = '모션을 입력해 주세요.'
  }

  const textValue = trimValue(text)
  if (!textValue) {
    errors.text = '텍스트를 입력해 주세요.'
  } else if (textValue.length > EMOTICON_TEXT_MAX_LENGTH) {
    errors.text = `텍스트는 최대 ${EMOTICON_TEXT_MAX_LENGTH}자까지 입력할 수 있습니다.`
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

/**
 * 프롬프트 폼이 제출 가능한지 판단합니다.
 * 생성·정제 버튼의 disabled 조건: `!isPromptFormComplete(...)` 로 사용합니다.
 * @param {{ emotion?: string, motion?: string, text?: string, hasImage?: boolean }} input
 * @returns {boolean}
 */
export function isPromptFormComplete({ emotion, motion, text, hasImage }) {
  return validatePromptInput({ emotion, motion, text, hasImage }).valid
}
