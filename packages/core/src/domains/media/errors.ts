import { createTypedError, TRPC_CODES } from '../../common/errors/index.ts';

export const MediaNotFoundError = createTypedError('media-not-found-error', TRPC_CODES.NOT_FOUND);
export const UnsupportedMimeError = createTypedError(
  'unsupported-mime-error',
  TRPC_CODES.BAD_REQUEST,
);
export const UploadIncompleteError = createTypedError(
  'upload-incomplete-error',
  TRPC_CODES.BAD_REQUEST,
);
