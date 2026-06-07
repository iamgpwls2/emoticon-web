function assertNonEmptyString(value, fieldName) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${fieldName} is required.`);
  }
  return value.trim();
}

function assertUsableDownloadUrl(imageUrl) {
  const trimmedUrl = assertNonEmptyString(imageUrl, 'imageUrl');

  let parsedUrl;
  try {
    parsedUrl = new URL(trimmedUrl);
  } catch {
    throw new Error('imageUrl is not a valid URL.');
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error('imageUrl must use http or https.');
  }

  return trimmedUrl;
}

function triggerAnchorDownload(href, filename) {
  if (typeof href !== 'string' || !href.trim()) {
    throw new Error('Download href is required.');
  }

  const link = document.createElement('a');
  link.href = href.trim();
  link.download = filename;
  link.rel = 'noopener noreferrer';
  link.target = '_blank';

  try {
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch {
    if (link.parentNode) {
      link.parentNode.removeChild(link);
    }
    throw new Error('Anchor download failed.');
  }
}

async function downloadViaFetch(imageUrl, filename) {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error(`Image fetch failed with status ${response.status}.`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  try {
    triggerAnchorDownload(objectUrl, filename);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function downloadViaAnchor(imageUrl, filename) {
  triggerAnchorDownload(imageUrl, filename);
}

/**
 * generatedImageUrl 이미지를 PNG 파일명으로 다운로드합니다.
 * fetch + blob을 우선 시도하고, CORS 등으로 실패하면 a[download] fallback을 사용합니다.
 *
 * @param {string} imageUrl
 * @param {string} filename
 * @returns {Promise<void>}
 */
export async function downloadImage(imageUrl, filename) {
  const trimmedUrl = assertUsableDownloadUrl(imageUrl);
  const trimmedFilename =
    typeof filename === 'string' && filename.trim()
      ? filename.trim()
      : 'emoticon-result.png';

  try {
    await downloadViaFetch(trimmedUrl, trimmedFilename);
  } catch {
    downloadViaAnchor(trimmedUrl, trimmedFilename);
  }
}
