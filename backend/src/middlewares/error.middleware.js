import { HttpError, normalizeError, sanitizeLogMessage } from '../utils/httpError.js';

function buildClientBody(error) {
  const body = {
    message: error.message,
    code: error.code,
  };

  if (error.details !== undefined && error.details !== null) {
    body.details = error.details;
  }

  return body;
}

/**
 * 등록되지 않은 경로 — 모든 route 등록 이후에 사용합니다.
 */
export function notFoundHandler(req, res) {
  const error = HttpError.notFound('요청한 API를 찾을 수 없습니다.');
  res.status(error.statusCode).json(buildClientBody(error));
}

/**
 * 공통 error middleware — notFoundHandler 바로 다음(가장 마지막)에 등록합니다.
 */
export function errorHandler(err, req, res, _next) {
  const error = normalizeError(err);
  const isDev = process.env.NODE_ENV !== 'production';

  const logContext = `${req.method} ${req.originalUrl}`;

  if (isDev) {
    console.error(
      `[${error.code}] ${logContext}:`,
      sanitizeLogMessage(err?.message ?? error.message)
    );
    if (err?.stack) {
      console.error(err.stack);
    }
  } else {
    console.error(
      `[${error.code}] ${logContext}:`,
      sanitizeLogMessage(err?.message ?? error.message)
    );
  }

  if (res.headersSent) {
    return;
  }

  res.status(error.statusCode).json(buildClientBody(error));
}
