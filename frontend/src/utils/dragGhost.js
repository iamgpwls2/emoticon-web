let ghostElement = null

function ensureGhostElement() {
  if (ghostElement) return ghostElement

  ghostElement = document.createElement('div')
  ghostElement.className = 'emoticon-drag-ghost'
  ghostElement.setAttribute('aria-hidden', 'true')
  document.body.appendChild(ghostElement)
  return ghostElement
}

/**
 * 카드 드래그 시 문서 아이콘 형태의 custom drag image를 적용합니다.
 * @param {DataTransfer | null | undefined} dataTransfer
 * @param {number} count
 */
export function setCardDragGhost(dataTransfer, count = 1) {
  if (!dataTransfer) return

  const ghost = ensureGhostElement()
  const safeCount = Number.isFinite(count) && count > 1 ? Math.floor(count) : 0

  ghost.innerHTML = `
    <span class="emoticon-drag-ghost__icon">📄</span>
    ${safeCount > 1 ? `<span class="emoticon-drag-ghost__badge">${safeCount}</span>` : ''}
  `

  dataTransfer.setDragImage(ghost, 28, 32)
}

export function cleanupDragGhost() {
  if (!ghostElement) return
  ghostElement.innerHTML = ''
}
