/** @typedef {'POSITIVE' | 'NEGATIVE' | 'DEFAULT'} EmotionGroupKey */

/** @type {Record<EmotionGroupKey, string[]>} */
export const EMOTION_GROUP = {
  POSITIVE: ['기쁨', '신남', '설렘', '행복'],
  NEGATIVE: ['화남', '슬픔', '짜증', '무서움'],
};

/** @type {Record<EmotionGroupKey, string[]>} */
export const EXTRA_CHOICES = {
  POSITIVE: ['반짝임 효과 추가', '하트 장식 추가', '없음', '직접 입력'],
  NEGATIVE: ['눈물/땀 효과 추가', '강조선 추가', '없음', '직접 입력'],
  DEFAULT: ['말풍선 추가', '효과선 추가', '없음', '직접 입력'],
};

export const FIXED_QUESTION_2 = '추가적인 요청 사항이 있을까요?';

const DYNAMIC_TURN_LIMIT = 4;

/**
 * @param {string} emotion
 * @returns {EmotionGroupKey}
 */
export function getEmotionGroupKey(emotion) {
  const trimmed = typeof emotion === 'string' ? emotion.trim() : '';

  if (EMOTION_GROUP.POSITIVE.includes(trimmed)) {
    return 'POSITIVE';
  }

  if (EMOTION_GROUP.NEGATIVE.includes(trimmed)) {
    return 'NEGATIVE';
  }

  return 'DEFAULT';
}

/**
 * @param {'fixed_2'} fixedPhase
 * @param {string} emotion
 * @returns {{ message: string, choices: string[] }}
 */
export function getFixedQuestion(fixedPhase, emotion) {
  const groupKey = getEmotionGroupKey(emotion);

  return {
    message: FIXED_QUESTION_2,
    choices: EXTRA_CHOICES[groupKey],
  };
}

export { DYNAMIC_TURN_LIMIT };
