// Catalogue d'erreurs typées du domaine media (revue PR #1, 28/07).
import { createTypedError } from '../../common/errors/index.ts';

export const MediaNotFoundError = createTypedError(
  'media-not-found-error',
  'média introuvable',
  'NOT_FOUND',
);
export const UnsupportedMimeError = createTypedError(
  'unsupported-mime-error',
  'type de fichier non autorisé',
  'BAD_REQUEST',
);
export const UploadIncompleteError = createTypedError(
  'upload-incomplete-error',
  "l'objet n'a pas été téléversé sur le stockage",
  'BAD_REQUEST',
);
