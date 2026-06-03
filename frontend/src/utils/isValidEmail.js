/**
 * 일반적인 이메일 형식인지 검사합니다.
 * - 영문/숫자/일반 기호만 local part 허용 (* 등 특수문자 불가)
 * - 도메인·TLD는 영문/숫자/하이픈만 허용
 * - TLD는 2자 이상
 */
export function isValidEmail(email) {
  const trimmed = email.trim()
  if (!trimmed) return false

  const pattern =
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/

  if (!pattern.test(trimmed)) return false

  const [local] = trimmed.split('@')
  if (local.includes('..') || local.startsWith('.') || local.endsWith('.')) {
    return false
  }

  return true
}
