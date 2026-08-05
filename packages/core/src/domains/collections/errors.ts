import { createTypedError, TRPC_CODES } from '../../common/errors/index.ts';

export const CollectionNotFoundError = createTypedError(
  'collection-not-found-error',
  TRPC_CODES.NOT_FOUND,
);
export const EntryNotFoundError = createTypedError('entry-not-found-error', TRPC_CODES.NOT_FOUND);
export const InvalidEntryDataError = createTypedError(
  'invalid-entry-data-error',
  TRPC_CODES.BAD_REQUEST,
);
export const DuplicateSlugError = createTypedError('duplicate-slug-error', TRPC_CODES.BAD_REQUEST);
