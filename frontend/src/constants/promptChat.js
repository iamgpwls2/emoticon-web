/** @typedef {'POSITIVE' | 'NEGATIVE' | 'DEFAULT'} EmotionGroupKey */

/** @type {Record<EmotionGroupKey, string[]>} */
export const EMOTION_GROUP = {
  POSITIVE: ['기쁨', '신남', '설렘', '행복'],
  NEGATIVE: ['화남', '슬픔', '짜증', '무서움'],
};

/** @type {Record<EmotionGroupKey, string[]>} */
export const BACKGROUND_CHOICES = {
  POSITIVE: ['화사한 파스텔 배경', '반짝이는 별 배경', '흰 배경', '직접 입력'],
  NEGATIVE: ['어두운 톤 배경', '번개/비 배경', '흰 배경', '직접 입력'],
  DEFAULT: ['흰 배경', '파스텔톤 배경', '그라데이션 배경', '직접 입력'],
};

/** @type {Record<EmotionGroupKey, string[]>} */
export const EXTRA_CHOICES = {
  POSITIVE: ['반짝임 효과 추가', '하트 장식 추가', '없음', '직접 입력'],
  NEGATIVE: ['눈물/땀 효과 추가', '강조선 추가', '없음', '직접 입력'],
  DEFAULT: ['말풍선 추가', '효과선 추가', '없음', '직접 입력'],
};

export const FIXED_PROMPT_SUFFIX =
  '[원본 스타일 유지 - 절대 변경 금지] ' +
  '캐릭터의 전체적인 실루엣, 체형 비율, 머리와 몸의 크기 비율을 유지할 것. ' +
  '원본의 선화 스타일(선 굵기, 윤곽선 방식)을 그대로 유지할 것. ' +
  '원본의 채색 방식(플랫, 수채화, 셀 쉐이딩 등)을 그대로 유지할 것. ' +
  '원본 캐릭터의 얼굴 특징(눈 모양, 코, 입, 볼터치 등)을 유지할 것. ' +
  '원본과 동일한 색상 팔레트를 사용하고 캐릭터 고유 색상은 변경하지 말 것. ' +
  '텍스트가 있다면 원본과 동일한 폰트 스타일, 굵기, 크기를 유지할 것. ' +
  '사용자가 추가 요청한 사항 외의 모든 요소는 원본에서 변경하지 말 것.';

export const FIXED_QUESTION_1 = '배경은 어떻게 할까요?';
export const FIXED_QUESTION_2 = '추가적인 요청 사항이 있을까요?';

const DYNAMIC_TURN_LIMIT = 3;

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
 * @param {'fixed_1' | 'fixed_2'} fixedPhase
 * @param {string} emotion
 * @returns {{ message: string, choices: string[] }}
 */
export function getFixedQuestion(fixedPhase, emotion) {
  const groupKey = getEmotionGroupKey(emotion);

  if (fixedPhase === 'fixed_1') {
    return {
      message: FIXED_QUESTION_1,
      choices: BACKGROUND_CHOICES[groupKey],
    };
  }

  return {
    message: FIXED_QUESTION_2,
    choices: EXTRA_CHOICES[groupKey],
  };
}

export { DYNAMIC_TURN_LIMIT };
