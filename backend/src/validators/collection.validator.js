import { HttpError } from '../utils/httpError.js';
import { isNonEmptyString } from './shared.validation.js';

export const COLLECTION_NAME_MAX_LENGTH = 50;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateCollectionName(name) {
  const errors = [];

  if (!isNonEmptyString(name)) {
    errors.push({
      field: 'name',
      message: 'name은 필수값입니다.',
    });
  } else if (name.trim().length > COLLECTION_NAME_MAX_LENGTH) {
    errors.push({
      field: 'name',
      message: `name은 최대 ${COLLECTION_NAME_MAX_LENGTH}자까지 입력할 수 있습니다.`,
    });
  }

  return errors;
}

export function validateCreateCollection(req, res, next) {
  const { name } = req.body ?? {};
  const errors = validateCollectionName(name);

  if (errors.length > 0) {
    return next(
      HttpError.validation('입력값을 확인해 주세요.', { errors })
    );
  }

  req.body.name = name.trim();
  next();
}

export function validateRenameCollection(req, res, next) {
  const { name } = req.body ?? {};
  const errors = validateCollectionName(name);

  if (errors.length > 0) {
    return next(
      HttpError.validation('입력값을 확인해 주세요.', { errors })
    );
  }

  req.body.name = name.trim();
  next();
}

export function validateCollectionIdParam(req, res, next) {
  const { id } = req.params ?? {};

  if (typeof id !== 'string' || !id.trim()) {
    return next(
      HttpError.validation('입력값을 확인해 주세요.', {
        errors: [{ field: 'id', message: 'id는 필수값입니다.' }],
      })
    );
  }

  if (!UUID_PATTERN.test(id.trim())) {
    return next(HttpError.notFound('폴더를 찾을 수 없습니다.'));
  }

  next();
}
