import { downloadReferenceImageByUrl } from './storage.service.js';

const DEFAULT_IMAGE_GENERATION_MODEL = 'gpt-image-1';
const DEFAULT_IMAGE_GENERATION_API_URL =
  'https://api.openai.com/v1/images/generations';
const DEFAULT_IMAGE_GENERATION_EDITS_API_URL =
  'https://api.openai.com/v1/images/edits';
const DEFAULT_GENERATED_MIME_TYPE = 'image/png';
const IMAGE_GENERATION_TIMEOUT_MS = 60_000;
const PLACEHOLDER_API_KEYS = new Set([
  'your-image-generation-api-key',
  'your-llm-api-key',
]);

function createServiceError(message) {
  const error = new Error(message);
  error.isImageGenerationServiceError = true;
  return error;
}

function isPlaceholderApiKey(apiKey) {
  return PLACEHOLDER_API_KEYS.has(apiKey) || apiKey.startsWith('your-');
}

function getImageGenerationApiKey() {
  const apiKey = process.env.IMAGE_GENERATION_API_KEY?.trim();
  if (!apiKey || isPlaceholderApiKey(apiKey)) {
    throw createServiceError('IMAGE_GENERATION_API_KEY is not configured.');
  }
  return apiKey;
}

function getImageGenerationModel() {
  return (
    process.env.IMAGE_GENERATION_MODEL?.trim() || DEFAULT_IMAGE_GENERATION_MODEL
  );
}

function getImageGenerationApiUrl() {
  return (
    process.env.IMAGE_GENERATION_API_URL?.trim() ||
    DEFAULT_IMAGE_GENERATION_API_URL
  );
}

function getImageGenerationEditsApiUrl() {
  const configured = process.env.IMAGE_GENERATION_EDITS_API_URL?.trim();
  if (configured) {
    return configured;
  }

  return (
    getImageGenerationApiUrl().replace(/\/generations\/?$/, '/edits') ||
    DEFAULT_IMAGE_GENERATION_EDITS_API_URL
  );
}

function assertFinalPrompt(finalPrompt) {
  if (typeof finalPrompt !== 'string' || !finalPrompt.trim()) {
    throw createServiceError('finalPrompt is required.');
  }
  return finalPrompt.trim();
}

function logOpenAiErrorResponse(status, errorBody) {
  const error = errorBody?.error;
  console.error('Image generation API request failed:', {
    status,
    type: error?.type ?? 'unknown',
    code: error?.code ?? '',
    message: error?.message ?? errorBody?.message ?? '(no message)',
    param: error?.param ?? '',
  });
}

function decodeBase64Image(base64) {
  try {
    return Buffer.from(base64, 'base64');
  } catch {
    throw createServiceError('Failed to decode generated image data.');
  }
}

async function fetchImageBufferFromUrl(imageUrl, signal) {
  const response = await fetch(imageUrl, { signal });

  if (!response.ok) {
    let safeUrl = imageUrl;
    try {
      const parsed = new URL(imageUrl);
      safeUrl = `${parsed.origin}${parsed.pathname}`;
    } catch {
      safeUrl = '(invalid url)';
    }
    console.error('Generated image download failed:', response.status, safeUrl);
    throw createServiceError('Failed to download generated image.');
  }

  const imageBuffer = Buffer.from(await response.arrayBuffer());

  if (!imageBuffer.length) {
    throw createServiceError('Image generation API returned an empty response.');
  }

  return {
    imageBuffer,
    mimeType: DEFAULT_GENERATED_MIME_TYPE,
  };
}

/**
 * OpenAI Images API 응답에서 imageBuffer를 추출합니다.
 * url 응답을 우선 사용하고, gpt-image-1 등 b64_json만 반환하는 경우 fallback합니다.
 */
async function parseOpenAiCompatibleImageResponse(data, signal) {
  const item = data?.data?.[0];
  const imageUrl = item?.url;

  if (typeof imageUrl === 'string' && imageUrl.trim()) {
    return fetchImageBufferFromUrl(imageUrl.trim(), signal);
  }

  const base64 = item?.b64_json;
  if (typeof base64 === 'string' && base64.trim()) {
    const imageBuffer = decodeBase64Image(base64.trim());
    if (!imageBuffer.length) {
      throw createServiceError('Image generation API returned an empty response.');
    }
    return {
      imageBuffer,
      mimeType: DEFAULT_GENERATED_MIME_TYPE,
    };
  }

  throw createServiceError('Image generation API returned an empty response.');
}

function buildReferenceImageFilename(mimeType) {
  if (mimeType === 'image/jpeg') return 'reference.jpg';
  if (mimeType === 'image/webp') return 'reference.webp';
  return 'reference.png';
}

async function requestOpenAiCompatibleImageGeneration({
  apiKey,
  model,
  apiUrl,
  finalPrompt,
  signal,
}) {
  const prompt = finalPrompt.trim();

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      size: '1024x1024',
    }),
    signal,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    logOpenAiErrorResponse(response.status, errorBody);
    throw createServiceError('Image generation request failed.');
  }

  const data = await response.json();
  return parseOpenAiCompatibleImageResponse(data, signal);
}

async function requestOpenAiCompatibleImageEdit({
  apiKey,
  model,
  apiUrl,
  finalPrompt,
  referenceImageBuffer,
  referenceMimeType,
  signal,
}) {
  const prompt = finalPrompt.trim();
  const formData = new FormData();
  formData.append('model', model);
  formData.append('prompt', prompt);
  formData.append('size', '1024x1024');
  formData.append('input_fidelity', 'high');
  formData.append(
    'image',
    new Blob([referenceImageBuffer], { type: referenceMimeType }),
    buildReferenceImageFilename(referenceMimeType)
  );

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
    signal,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    logOpenAiErrorResponse(response.status, errorBody);
    throw createServiceError('Image generation request failed.');
  }

  const data = await response.json();
  return parseOpenAiCompatibleImageResponse(data, signal);
}

/**
 * 외부 이미지 생성 provider 호출.
 * originalImageUrl이 있으면 edits(reference image) API를, 없으면 generations(text-only) API를 사용합니다.
 */
async function callImageGenerationProvider(params) {
  if (params.referenceImageBuffer) {
    return requestOpenAiCompatibleImageEdit(params);
  }

  return requestOpenAiCompatibleImageGeneration(params);
}

/**
 * finalPrompt와 (선택) originalImageUrl로 외부 이미지 생성 API를 호출하고 Buffer를 반환합니다.
 * backend controller에서만 호출하세요.
 *
 * @param {{ finalPrompt: string, originalImageUrl?: string }} params
 * @returns {Promise<{ imageBuffer: Buffer, mimeType: string }>}
 */
export async function generateImageFromPrompt({ finalPrompt, originalImageUrl }) {
  const prompt = assertFinalPrompt(finalPrompt);
  const trimmedOriginalImageUrl = originalImageUrl?.trim() || undefined;
  const apiKey = getImageGenerationApiKey();
  const model = getImageGenerationModel();
  const apiUrl = getImageGenerationApiUrl();
  const editsApiUrl = getImageGenerationEditsApiUrl();

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    IMAGE_GENERATION_TIMEOUT_MS
  );

  try {
    let referenceImageBuffer;
    let referenceMimeType;

    if (trimmedOriginalImageUrl) {
      const referenceImage = await downloadReferenceImageByUrl(
        trimmedOriginalImageUrl,
        controller.signal
      );
      referenceImageBuffer = referenceImage.imageBuffer;
      referenceMimeType = referenceImage.mimeType;
    }

    return await callImageGenerationProvider({
      apiKey,
      model,
      apiUrl: trimmedOriginalImageUrl ? editsApiUrl : apiUrl,
      finalPrompt: prompt,
      referenceImageBuffer,
      referenceMimeType,
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw createServiceError('Image generation request timed out.');
    }
    if (
      error.isImageGenerationServiceError ||
      error.isStorageServiceError
    ) {
      throw error;
    }
    console.error('Image generation service error:', error.message);
    throw createServiceError('Image generation request failed.');
  } finally {
    clearTimeout(timeoutId);
  }
}
