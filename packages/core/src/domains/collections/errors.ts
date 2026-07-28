// Catalogue d'erreurs typées du domaine collections (revue PR #1, 28/07).
import { createTypedError } from '../../common/errors/index.ts';

export const CollectionNotFoundError = createTypedError(
  'collection-not-found-error',
  'collection introuvable',
  'NOT_FOUND',
);
export const EntryNotFoundError = createTypedError(
  'entry-not-found-error',
  'entrée introuvable',
  'NOT_FOUND',
);
export const InvalidEntryDataError = createTypedError(
  'invalid-entry-data-error',
  'données invalides pour la collection',
  'BAD_REQUEST',
);
export const DuplicateSlugError = createTypedError(
  'duplicate-slug-error',
  'slug déjà utilisé dans cette collection',
  'BAD_REQUEST',
);
